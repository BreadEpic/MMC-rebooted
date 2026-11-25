/* MMC:Rebooted desktop app.
   Browsers cannot install a page opened from a file (file://) as a real web app, so this makes a small
   launcher instead: it opens MMC (or one game) in Chrome or Edge "app mode", a window with no tabs or
   address bar that looks and feels like an app. Everything still runs offline from the same files.

   MMCApp.open()        offer the whole dashboard as an app
   MMCApp.open(gameId)  offer one game as its own app
   Any element with data-app="<gameId>" opens the offer for that game. */
(function () {
  "use strict";
  var KEY = "mmc-app-offer";
  var $ = function (id) { return document.getElementById(id); };
  var G = window.MMC_GAMES;

  var params = new URLSearchParams(location.search);
  var inApp = params.get("app") === "1" ||
    (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: minimal-ui)").matches));
  if (inApp) document.documentElement.classList.add("in-app");

  var ua = navigator.userAgent;
  var OS = /CrOS/.test(ua) ? "chromeos" : /Windows/.test(ua) ? "windows" : /Macintosh|Mac OS X/.test(ua) ? "mac" : /Linux|X11/.test(ua) ? "linux" : "windows";

  function pageUrl() { return location.href.split("#")[0].split("?")[0]; }
  function targetUrl(game) {
    var base = pageUrl();
    if (game) return new URL("mmc/play.html?id=" + encodeURIComponent(game.id) + "&track=1&app=1", base).href;
    return base + "?app=1";
  }
  function safeName(s) { return String(s).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, " ").trim() || "MMC Rebooted"; }

  // Windows launcher. In a .bat file a % starts a variable, so every % in the address is doubled.
  function batFor(url, title) {
    var u = url.replace(/%/g, "%%");
    return [
      "@echo off",
      "rem " + title + " - desktop launcher made by MMC:Rebooted.",
      "rem It only opens the page below in Chrome (or Edge) as an app window. Nothing is installed.",
      'set "MMC_URL=' + u + '"',
      'reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" >nul 2>&1 && (start "" chrome --app="%MMC_URL%" & exit /b)',
      'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" >nul 2>&1 && (start "" chrome --app="%MMC_URL%" & exit /b)',
      'start "" msedge --app="%MMC_URL%"',
      ""
    ].join("\r\n");
  }
  function shQuote(s) { return "'" + s.replace(/'/g, "'\\''") + "'"; }
  function macCmd(url) { return 'open -na "Google Chrome" --args --app=' + shQuote(url) + '  ||  open -na "Microsoft Edge" --args --app=' + shQuote(url); }
  function linuxCmd(url) { return "google-chrome --app=" + shQuote(url) + " || chromium --app=" + shQuote(url) + " || microsoft-edge --app=" + shQuote(url); }

  async function saveFile(name, text) {
    var blob = new Blob([text], { type: "application/octet-stream" });
    if (window.showSaveFilePicker) {
      try {
        var h = await window.showSaveFilePicker({ suggestedName: name, startIn: "desktop", types: [{ description: "Launcher", accept: { "application/octet-stream": [name.slice(name.lastIndexOf("."))] } }] });
        var w = await h.createWritable(); await w.write(blob); await w.close();
        return "saved";
      } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
    }
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    return "downloaded";
  }
  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = "Copied!"; setTimeout(function () { btn.textContent = t; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    function fallback() { var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) {} ta.remove(); }
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var modal = null;
  function close(remember) {
    if (!modal) return;
    if (remember) { try { localStorage.setItem(KEY, remember); } catch (e) {} }
    modal.classList.remove("show");
    var m = modal; modal = null;
    setTimeout(function () { m.remove(); }, 220);
  }

  function open(gameId, firstRun) {
    if (modal) close();
    var game = gameId && G && G.byId[gameId] ? G.byId[gameId] : null;
    var title = game ? game.name : "MMC:Rebooted";
    var url = targetUrl(game);
    var file = safeName(game ? game.name : "MMC Rebooted");
    var m = document.createElement("div");
    m.className = "app-modal";
    m.setAttribute("role", "dialog");
    m.setAttribute("aria-modal", "true");
    m.setAttribute("aria-label", "Save as an app");
    var art = game ? '<img class="app-art" src="' + esc(game.img) + '" alt="">' : '<div class="app-art app-logo">MMC</div>';
    m.innerHTML =
      '<div class="app-box">' +
        '<button class="icon-btn app-x" data-x title="Close">' + (MMC.icon ? MMC.icon("close") : "x") + "</button>" +
        '<div class="app-head">' + art + '<div><h2>' + (game ? "Save " + esc(title) + " as an app" : "Add MMC:Rebooted to your desktop") + "</h2>" +
          "<p>" + (game ? "Get a desktop icon that opens this game straight away" : "Open it from your desktop") + " in its own window, like an app: no tabs, no address bar. It still runs offline from these files.</p></div></div>" +
        '<div class="app-tabs" role="tablist">' +
          ["windows", "chromeos", "mac", "linux"].map(function (o) {
            return '<button class="chip" role="tab" data-os="' + o + '" aria-pressed="' + (o === OS) + '">' + { windows: "Windows", chromeos: "Chromebook", mac: "Mac", linux: "Linux" }[o] + "</button>";
          }).join("") +
        "</div>" +
        '<div class="app-pane" data-pane="windows">' +
          '<ol><li>Press <b>Download launcher</b> and save it to your <b>Desktop</b>.</li>' +
          "<li>Double-click <b>" + esc(file) + ".bat</b>. " + esc(title) + " opens in its own app window (Chrome, or Edge if Chrome is not installed).</li>" +
          "<li>Keep the MMC folder where it is: the launcher points at it.</li></ol>" +
          '<div class="app-actions"><button class="btn" data-dl>Download launcher</button><button class="btn ghost" data-peek>What is inside?</button></div>' +
          '<pre class="app-code" data-code hidden></pre>' +
          '<p class="hint">Your browser or Windows may warn about .bat files. Choose <b>Keep</b>, and if Windows says it protected your PC, press <b>More info</b> then <b>Run anyway</b>. The file only opens this page.</p>' +
        "</div>" +
        '<div class="app-pane" data-pane="chromeos" hidden>' +
          "<p>Chromebooks cannot run launcher files, and Chrome usually cannot install a local file as an app. The closest options:</p>" +
          '<ol><li>Press <b>Ctrl + D</b> to bookmark this page so it is one click away.</li>' +
          "<li>Open Chrome’s <b>⋮ menu</b> and look for <b>Cast, save and share</b> then <b>Create shortcut</b> (tick <b>Open as window</b>). If it is greyed out, files are not allowed on your Chromebook.</li>" +
          "<li>Use fullscreen (<b>F4</b> or the fullscreen key) for an app-like view.</li></ol>" +
          '<div class="app-actions"><button class="btn" data-copyurl>Copy the address</button></div>' +
        "</div>" +
        '<div class="app-pane" data-pane="mac" hidden>' +
          "<p>Open <b>Terminal</b>, paste this and press Return. It opens " + esc(title) + " in an app window. Keep it in a note to reuse, or save it as an Automator app.</p>" +
          '<pre class="app-code">' + esc(macCmd(url)) + "</pre>" +
          '<div class="app-actions"><button class="btn" data-copy="mac">Copy command</button></div>' +
        "</div>" +
        '<div class="app-pane" data-pane="linux" hidden>' +
          "<p>Run this in a terminal, or put it in a desktop shortcut, to open " + esc(title) + " in an app window:</p>" +
          '<pre class="app-code">' + esc(linuxCmd(url)) + "</pre>" +
          '<div class="app-actions"><button class="btn" data-copy="linux">Copy command</button></div>' +
        "</div>" +
        '<div class="app-foot">' +
          (firstRun ? '<button class="btn ghost" data-later>Maybe later</button><button class="btn ghost" data-never>Don’t ask again</button>' : '<button class="btn ghost" data-x>Done</button>') +
        "</div>" +
      "</div>";
    document.body.appendChild(m);
    modal = m;
    requestAnimationFrame(function () { m.classList.add("show"); });

    function showOs(o) {
      m.querySelectorAll("[data-os]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-os") === o ? "true" : "false"); });
      m.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.getAttribute("data-pane") !== o; });
    }
    showOs(OS);
    var bat = batFor(url, title);
    m.addEventListener("click", function (e) {
      var t = e.target.closest("button");
      if (e.target === m) { close(firstRun ? "later" : ""); return; }
      if (!t) return;
      if (t.hasAttribute("data-os")) showOs(t.getAttribute("data-os"));
      else if (t.hasAttribute("data-x") || t.hasAttribute("data-later")) close(firstRun ? "later" : "");
      else if (t.hasAttribute("data-never")) close("never");
      else if (t.hasAttribute("data-peek")) { var c = m.querySelector("[data-code]"); c.textContent = bat; c.hidden = !c.hidden; }
      else if (t.hasAttribute("data-copyurl")) copy(url, t);
      else if (t.getAttribute("data-copy") === "mac") copy(macCmd(url), t);
      else if (t.getAttribute("data-copy") === "linux") copy(linuxCmd(url), t);
      else if (t.hasAttribute("data-dl")) {
        saveFile(file + ".bat", bat).then(function (r) {
          if (r === "cancel") return;
          t.textContent = r === "saved" ? "Saved! Double-click it" : "Downloaded! Move it to your Desktop";
          try { localStorage.setItem(KEY, "done"); } catch (err) {}
        });
      }
    });
    m.addEventListener("keydown", function (e) { if (e.key === "Escape") close(firstRun ? "later" : ""); });
    var first = m.querySelector("[data-dl]") || m.querySelector("button");
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-app]");
    if (b) { e.preventDefault(); e.stopPropagation(); open(b.getAttribute("data-app") || null); }
  }, true);

  // Settings panel
  function wire() {
    var s = $("appSetBtn");
    if (s) s.addEventListener("click", function () { open(null); });
    var st = $("appState");
    if (st) st.textContent = inApp ? "Running as an app" : "Running in a browser tab";
  }

  // First time MMC opens (outside app mode), offer it once
  function firstRun() {
    var seen = null;
    try { seen = localStorage.getItem(KEY); } catch (e) {}
    if (inApp || seen === "never" || seen === "done") return;
    if (seen === "later") {
      try { var n = +(localStorage.getItem(KEY + "-n") || 0) + 1; localStorage.setItem(KEY + "-n", n); if (n % 5) return; } catch (e) { return; }
    }
    setTimeout(function () { if (!document.querySelector(".player:not([hidden])")) open(null, true); }, 1400);
  }

  window.MMCApp = { open: open, inApp: inApp };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { wire(); firstRun(); });
  else { wire(); firstRun(); }
})();
