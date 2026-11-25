/* MMC pack runtime (same idea as Gams: data URLs -> blob URLs, so games run from file://).
   Big game files are stored as base64 inside plain .js "part" files, which <script> tags can
   load offline. MMCPACK collects the parts, turns them back into Blobs, and answers the game's
   fetch() calls with them, because fetch() of a local file is blocked by the browser. */
(function () {
  "use strict";

  var parts = {};    // name -> [base64, base64, ...]
  var texts = {};    // name -> source text (audio worklets)
  var blobs = {};    // name -> Promise<Blob>

  function decode(b64) {
    // native decoder first, plain JS as a fallback
    return fetch("data:application/octet-stream;base64," + b64)
      .then(function (r) { return r.arrayBuffer(); })
      .catch(function () {
        var bin = atob(b64), out = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out.buffer;
      });
  }

  var MMCPACK = {
    // called by each part file: MMCPACK.p("game.pck", 0, "base64...")
    p: function (name, index, b64) {
      (parts[name] = parts[name] || [])[index] = b64;
    },
    // called by text files: MMCPACK.t("game.audio.worklet.js", "source")
    t: function (name, source) {
      texts[name] = source;
    },
    has: function (name) {
      return !!(parts[name] || blobs[name]);
    },
    blob: function (name, type) {
      if (!blobs[name]) {
        var list = parts[name] || [];
        delete parts[name];
        blobs[name] = list.reduce(function (chain, b64, i) {
          return chain.then(function (bufs) {
            list[i] = null; // let the string go once decoded
            return decode(b64).then(function (buf) { bufs.push(buf); return bufs; });
          });
        }, Promise.resolve([])).then(function (bufs) {
          return new Blob(bufs, { type: type || "application/octet-stream" });
        });
      }
      return blobs[name];
    },
    // fetch() hook: requests whose file name is in the pack are answered from memory
    hookFetch: function (types) {
      var real = window.fetch.bind(window);
      window.fetch = function (input, init) {
        var url = typeof input === "string" ? input : (input && input.url) || String(input);
        var file = decodeURIComponent(url.split("?")[0].split("#")[0].split("/").pop());
        if (MMCPACK.has(file)) {
          return MMCPACK.blob(file, (types && types[file]) || "application/octet-stream").then(function (b) {
            return new Response(b, { status: 200, headers: { "Content-Type": b.type, "Content-Length": String(b.size) } });
          });
        }
        return real(input, init);
      };
    },
    // audio worklets load with addModule(), which cannot read local files either
    hookWorklets: function () {
      if (!window.AudioWorklet || !AudioWorklet.prototype.addModule) return;
      var real = AudioWorklet.prototype.addModule;
      AudioWorklet.prototype.addModule = function (url, opts) {
        var file = String(url).split("?")[0].split("/").pop();
        for (var name in texts) {
          if (file === name) {
            // a data URL, not a blob URL: worklets cannot load blob URLs made by a file:// page
            url = "data:text/javascript;charset=utf-8," + encodeURIComponent(texts[name]);
            break;
          }
        }
        return real.call(this, url, opts);
      };
    }
  };

  // Godot 4 checks for a service worker; pages opened from a file cannot have one
  if (location.protocol === "file:" && navigator.serviceWorker) {
    try {
      navigator.serviceWorker.getRegistration = function () { return Promise.resolve(undefined); };
      navigator.serviceWorker.getRegistrations = function () { return Promise.resolve([]); };
    } catch (e) {}
  }

  window.MMCPACK = MMCPACK;
})();
