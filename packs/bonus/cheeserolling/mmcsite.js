/* MMC site loader: runs a whole web game folder from file:// with no server.
   The Gams idea (data URLs -> blob URLs) for games with many files:
   - every game file is stored as base64 inside "part" scripts (<script> tags work on file://)
   - part scripts load only when the game asks for a file inside them, so big games stay light
   - fetch(), XHR, <img>, <audio>/<video> and Worker requests for packed files get blob URLs
   Load order: mmcsite.js, then site/index.js (calls MMCSITE.index), then the game. */
(function () {
  "use strict";

  var INDEX = {};        // path -> { m: mime, p: [part numbers] }
  var PREFIX = "";       // folder of the part scripts, relative to the page
  var parts = {};        // part number -> { path: base64 }
  var partWait = {};     // part number -> Promise
  var blobUrls = {};     // path -> Promise<blob URL>
  var base = location.href.replace(/[#?].*$/, "").replace(/[^\/]*$/, "");

  // path of a URL inside the game folder (packed or not), or null for outside URLs
  function local(u) {
    if (u == null) return null;
    u = String(u);
    if (/^(data|blob|about|javascript):/i.test(u)) return null;
    var abs;
    try { abs = new URL(u, document.baseURI || base).href; } catch (e) { return null; }
    abs = abs.split("#")[0].split("?")[0];
    if (abs.indexOf(base) !== 0) return null;
    var rel = abs.slice(base.length);
    try { rel = decodeURIComponent(rel); } catch (e) {}
    return rel.replace(/\/{2,}/g, "/").replace(/^\//, "");
  }

  function norm(u) {
    if (u == null) return null;
    u = String(u);
    if (/^(data|blob|about|javascript):/i.test(u)) return null;
    var abs;
    try { abs = new URL(u, document.baseURI || base).href; } catch (e) { return null; }
    abs = abs.split("#")[0];
    if (abs.indexOf(base) !== 0) return null;
    var plain = local(u);
    return plain !== null && INDEX[plain] ? plain : null;
  }

  function loadPart(n) {
    if (parts[n]) return Promise.resolve(parts[n]);
    if (!partWait[n]) {
      partWait[n] = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = PREFIX + "p" + n + ".js";
        s.onload = function () { s.remove(); parts[n] ? resolve(parts[n]) : reject(new Error("part " + n + " is empty")); };
        s.onerror = function () { s.remove(); reject(new Error("missing part " + n)); };
        (document.head || document.documentElement).appendChild(s);
      });
    }
    return partWait[n];
  }

  function decode(b64) {
    return fetch("data:application/octet-stream;base64," + b64).then(function (r) { return r.arrayBuffer(); });
  }

  function blobFor(path) {
    var e = INDEX[path];
    return Promise.all(e.p.map(loadPart)).then(function (loaded) {
      return Promise.all(loaded.map(function (pt) { return decode(pt[path]); }));
    }).then(function (bufs) {
      return new Blob(bufs, { type: e.m });
    });
  }

  function urlFor(path) {
    if (!blobUrls[path]) blobUrls[path] = blobFor(path).then(function (b) { return URL.createObjectURL(b); });
    return blobUrls[path];
  }

  var MMCSITE = {
    index: function (map, prefix) { INDEX = map || {}; if (prefix != null) PREFIX = prefix; },
    part: function (n, files) { parts[n] = files; },
    has: function (u) { return !!norm(u); },
    url: function (u) { var p = norm(u); return p ? urlFor(p) : Promise.resolve(u); },
    blob: function (u) { var p = norm(u); return p ? blobFor(p) : Promise.reject(new Error("not packed: " + u)); }
  };
  window.MMCSITE = MMCSITE;

  /* ---------- fetch ---------- */
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    var p = norm(url);
    if (!p) {
      // a local file that is not in the pack does not exist: answer like a server would
      if (local(url) !== null) return Promise.resolve(new Response(null, { status: 404, statusText: "Not Found" }));
      return realFetch(input, init);
    }
    return blobFor(p).then(function (b) {
      return new Response(b, { status: 200, statusText: "OK", headers: { "Content-Type": b.type, "Content-Length": String(b.size) } });
    });
  };

  /* ---------- XMLHttpRequest: wait for the blob URL, then really open + send ---------- */
  var XHR = window.XMLHttpRequest;
  var open = XHR.prototype.open, send = XHR.prototype.send, setHeader = XHR.prototype.setRequestHeader;
  XHR.prototype.open = function (method, url) {
    var p = norm(url);
    if (p && arguments[2] !== false) {
      this.__mmc = { args: Array.prototype.slice.call(arguments), path: p, headers: [] };
      return;
    }
    this.__mmc = null;
    return open.apply(this, arguments);
  };
  XHR.prototype.setRequestHeader = function (k, v) {
    if (this.__mmc) { this.__mmc.headers.push([k, v]); return; }
    return setHeader.apply(this, arguments);
  };
  XHR.prototype.send = function (body) {
    var x = this, job = this.__mmc;
    if (!job) return send.apply(this, arguments);
    urlFor(job.path).then(function (u) {
      var a = job.args.slice(); a[1] = u;
      open.apply(x, a);
      job.headers.forEach(function (h) { try { setHeader.call(x, h[0], h[1]); } catch (e) {} });
      send.call(x, body);
    }, function (err) {
      console.error("[MMC] " + err.message);
      open.call(x, "GET", "data:,");
      send.call(x);
    });
  };

  /* ---------- <img>, <audio>, <video>, <source> ---------- */
  function hookSrc(proto) {
    var d = proto && Object.getOwnPropertyDescriptor(proto, "src");
    if (!d || !d.set) return;
    Object.defineProperty(proto, "src", {
      configurable: true, enumerable: d.enumerable,
      get: function () { return d.get.call(this); },
      set: function (v) {
        var el = this, p = norm(v);
        if (!p) return d.set.call(el, v);
        el.__mmcSrc = v;
        urlFor(p).then(function (u) { if (el.__mmcSrc === v) d.set.call(el, u); });
      }
    });
  }
  hookSrc(window.HTMLImageElement && HTMLImageElement.prototype);
  hookSrc(window.HTMLMediaElement && HTMLMediaElement.prototype);
  hookSrc(window.HTMLSourceElement && HTMLSourceElement.prototype);

  var realSetAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (String(name).toLowerCase() === "src" && /^(IMG|AUDIO|VIDEO|SOURCE)$/.test(this.tagName) && norm(value)) {
      this.src = value;
      return;
    }
    return realSetAttr.apply(this, arguments);
  };

  if (window.Audio) {
    var RealAudio = window.Audio;
    window.Audio = function (src) {
      var a = new RealAudio();
      if (src != null) a.src = src;
      return a;
    };
    window.Audio.prototype = RealAudio.prototype;
  }

  /* ---------- Workers (file:// pages cannot start workers from files) ---------- */
  if (window.Worker) {
    var RealWorker = window.Worker;
    window.Worker = function (url, opts) {
      var p = norm(url);
      if (!p) return new RealWorker(url, opts);
      // start from a tiny blob that imports the packed script once its blob URL exists
      var holder = { q: [], w: null };
      var proxy = {
        postMessage: function (m, t) { holder.w ? holder.w.postMessage(m, t) : holder.q.push([m, t]); },
        terminate: function () { holder.dead = true; if (holder.w) holder.w.terminate(); },
        addEventListener: function (t, f, o) { (holder.l = holder.l || []).push([t, f, o]); if (holder.w) holder.w.addEventListener(t, f, o); },
        removeEventListener: function (t, f, o) { if (holder.w) holder.w.removeEventListener(t, f, o); },
        onmessage: null, onerror: null
      };
      urlFor(p).then(function (u) {
        if (holder.dead) return;
        var w = new RealWorker(u, opts);
        holder.w = w;
        w.onmessage = function (e) { if (proxy.onmessage) proxy.onmessage(e); };
        w.onerror = function (e) { if (proxy.onerror) proxy.onerror(e); };
        (holder.l || []).forEach(function (l) { w.addEventListener(l[0], l[1], l[2]); });
        holder.q.forEach(function (m) { w.postMessage(m[0], m[1]); });
      });
      return proxy;
    };
  }

  /* ---------- service workers cannot run from file:// ---------- */
  if (location.protocol === "file:" && navigator.serviceWorker) {
    try {
      navigator.serviceWorker.register = function () { return Promise.reject(new Error("no service workers offline")); };
      navigator.serviceWorker.getRegistration = function () { return Promise.resolve(undefined); };
      navigator.serviceWorker.getRegistrations = function () { return Promise.resolve([]); };
    } catch (e) {}
  }
})();
