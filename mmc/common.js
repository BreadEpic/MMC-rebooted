/* MMC:Rebooted shared helpers: storage, settings, playtime stats, pixel icons, tab disguise.
   Used by MMC-Rebooted.html and mmc/play.html. Everything lives in localStorage,
   which every page opened from file:// shares, so it all works with no wifi. */
(function () {
  "use strict";

  var KEY_SETTINGS = "mmc-settings";
  var KEY_STATS = "mmc-stats";
  var KEY_PINS = "mmc-pins";

  var DEFAULT_SETTINGS = {
    theme: "neon",
    fx: true,
    mode: "embed",   // embed | tab | blank | replace | raw
    bar: "top",      // popout bar side in the new tab player: top | bottom | left | right
    title: "",
    icon: ""
  };

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      if (!v) return fallback;
      var parsed = JSON.parse(v);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- settings ---------- */
  // id, name, animated background
  var THEMES = [
    { id: "neon", name: "Neon", fx: null },
    { id: "hacker", name: "Hacker", fx: "matrix" },
    { id: "white", name: "White", fx: null },
    { id: "vapor", name: "Vaporwave", fx: null },
    { id: "amber", name: "Amber CRT", fx: null },
    { id: "ocean", name: "Deep Sea", fx: "bubbles" },
    { id: "inferno", name: "Inferno", fx: "embers" },
    { id: "sakura", name: "Sakura", fx: "petals" },
    { id: "handheld", name: "Handheld", fx: null },
    { id: "galaxy", name: "Galaxy", fx: "stars" },
    { id: "candy", name: "Bubblegum", fx: "bubbles" },
    { id: "frost", name: "Frost", fx: "snow" },
    { id: "cyber", name: "Cyber", fx: null }
  ];

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return THEMES[0];
  }

  function getSettings() {
    var s = read(KEY_SETTINGS, {}) || {};
    var out = {};
    for (var k in DEFAULT_SETTINGS) out[k] = s.hasOwnProperty(k) ? s[k] : DEFAULT_SETTINGS[k];
    // older versions had a dark mode switch instead of themes
    if (!s.hasOwnProperty("theme") && s.dark === false) out.theme = "white";
    out.theme = themeById(out.theme).id;
    return out;
  }

  function setSetting(key, value) {
    var s = getSettings();
    s[key] = value;
    write(KEY_SETTINGS, s);
    return s;
  }

  /* ---------- pins ---------- */
  function getPins() {
    var p = read(KEY_PINS, []);
    return Array.isArray(p) ? p : [];
  }

  function isPinned(id) {
    return getPins().indexOf(id) !== -1;
  }

  function togglePin(id) {
    var p = getPins();
    var i = p.indexOf(id);
    if (i === -1) p.unshift(id); else p.splice(i, 1);
    write(KEY_PINS, p);
    return i === -1;
  }

  function clearPins() {
    write(KEY_PINS, []);
  }

  /* ---------- playtime stats ---------- */
  function emptyStats() {
    return { total: 0, sessions: 0, games: {}, days: {}, longest: { id: "", ms: 0 } };
  }

  function getStats() {
    var s = read(KEY_STATS, null);
    if (!s || typeof s !== "object") return emptyStats();
    var e = emptyStats();
    for (var k in e) if (!s.hasOwnProperty(k)) s[k] = e[k];
    return s;
  }

  function dayKey(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function gameEntry(s, id) {
    if (!s.games[id]) s.games[id] = { time: 0, sessions: 0, last: 0, first: Date.now() };
    return s.games[id];
  }

  // Called once when a game is opened.
  function startPlay(id) {
    var s = getStats();
    var g = gameEntry(s, id);
    g.sessions += 1;
    g.last = Date.now();
    s.sessions += 1;
    write(KEY_STATS, s);
  }

  // Adds played time (ms) to a game, today's total and the all-time total.
  function addTime(id, ms) {
    if (!(ms > 0)) return;
    var s = getStats();
    var g = gameEntry(s, id);
    g.time += ms;
    g.last = Date.now();
    s.total += ms;
    var dk = dayKey();
    s.days[dk] = (s.days[dk] || 0) + ms;
    write(KEY_STATS, s);
  }

  // Called when a session ends, to keep the "longest session" record.
  function endPlay(id, sessionMs) {
    var s = getStats();
    if (sessionMs > (s.longest.ms || 0)) {
      s.longest = { id: id, ms: sessionMs };
      write(KEY_STATS, s);
    }
  }

  function resetStats() {
    write(KEY_STATS, emptyStats());
  }

  /* A tracker counts time in 1s ticks and saves every 5s, so a crash loses at most a few seconds.
     isActive() decides if the current second counts (tab visible, window still open, and so on). */
  function Tracker(id, isActive) {
    this.id = id;
    this.isActive = isActive || function () { return true; };
    this.pending = 0;
    this.session = 0;
    this.last = Date.now();
    this.alive = true;
    var self = this;
    startPlay(id);
    this.timer = setInterval(function () { self.tick(); }, 1000);
  }
  Tracker.prototype.tick = function () {
    var now = Date.now();
    var delta = Math.min(now - this.last, 5000); // ignore sleeps and long pauses
    this.last = now;
    if (!this.alive) return;
    if (this.isActive()) {
      this.pending += delta;
      this.session += delta;
    }
    if (this.pending >= 5000) this.flush();
  };
  Tracker.prototype.flush = function () {
    if (this.pending > 0) {
      addTime(this.id, this.pending);
      this.pending = 0;
    }
  };
  Tracker.prototype.stop = function () {
    if (!this.alive) return;
    this.tick();
    this.alive = false;
    clearInterval(this.timer);
    this.flush();
    endPlay(this.id, this.session);
  };

  /* ---------- formatting ---------- */
  function fmtTime(ms, long) {
    var sec = Math.floor((ms || 0) / 1000);
    if (sec < 60) return sec + "s";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + "m";
    var h = Math.floor(min / 60), m = min % 60;
    if (long || h < 100) return h + "h " + m + "m";
    return h + "h";
  }

  function fmtClock(ms) {
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function fmtAgo(ts) {
    if (!ts) return "never";
    var sec = Math.floor((Date.now() - ts) / 1000);
    if (sec < 60) return "just now";
    var min = Math.floor(sec / 60);
    if (min < 60) return min + "m ago";
    var h = Math.floor(min / 60);
    if (h < 24) return h + "h ago";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "d ago";
    return Math.floor(d / 7) + "w ago";
  }

  /* ---------- pixel icons (drawn on a grid, crisp at any size) ---------- */
  var ICONS = {
    pad: ["..XXXXXXX..", ".XXXXXXXXX.", "XX.XXXXX.XX", "X...XXX.X.X", "XX.XXXXX.XX", "XXXX...XXXX", "XXX.....XXX"],
    home: ["...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", ".X....X.", ".X.XX.X.", ".X.XX.X.", ".XXXXXX."],
    pick: ["..XXXXXX..", ".XX....XX.", "XX..XX..XX", "X...XX...X", "....XX....", "....XX....", "....XX....", "....XX....", "....XX....", "....XX...."],
    gear: ["...X.X...", ".XXXXXXX.", ".XX...XX.", "XX..X..XX", "X..XXX..X", "XX..X..XX", ".XX...XX.", ".XXXXXXX.", "...X.X..."],
    pin: ["..XXXX..", "...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", "...XX...", "...XX...", "...X...."],
    close: ["XX....XX", "XXX..XXX", ".XXXXXX.", "..XXXX..", "..XXXX..", ".XXXXXX.", "XXX..XXX", "XX....XX"],
    full: ["XXX..XXX", "X......X", "X......X", "........", "........", "X......X", "X......X", "XXX..XXX"],
    reload: ["..XXXX.X", ".X....XX", "X....XXX", "X.......", "X.......", "X......X", ".X....X.", "..XXXX.."],
    out: ["....XXXX", "......XX", ".....X.X", "XXX.X..X", "X..X....", "X......X", "X......X", "XXXXXXXX"],
    play: ["X......", "XXX....", "XXXXX..", "XXXXXXX", "XXXXX..", "XXX....", "X......"],
    search: [".XXXX...", "X....X..", "X....X..", "X....X..", ".XXXX...", ".....X..", "......X.", ".......X"],
    clock: ["..XXXX..", ".X....X.", "X...X..X", "X...X..X", "X...XXXX", "X......X", ".X....X.", "..XXXX.."],
    hourglass: ["XXXXXXXX", ".X....X.", "..X..X..", "...XX...", "...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX"],
    fire: ["...X....", "...XX...", "..XXX.X.", ".XXXXXX.", ".XXX.XXX", "XXX...XX", "XXX...XX", ".XXXXXX."],
    trophy: ["XXXXXXXX", "X.XXXX.X", ".XXXXXX.", "..XXXX..", "...XX...", "...XX...", "..XXXX..", ".XXXXXX."],
    back: ["...X....", "..XX....", ".XXXXXXX", "XXXXXXXX", ".XXXXXXX", "..XX....", "...X....", "........"],
    star: ["...XX...", "...XX...", "XXXXXXXX", ".XXXXXX.", "..XXXX..", ".XXXXXX.", ".XX..XX.", "X......X"]
  };

  function icon(name, cls) {
    var rows = ICONS[name];
    if (!rows) return "";
    var w = rows[0].length, h = rows.length, rects = "";
    for (var y = 0; y < h; y++) {
      var row = rows[y], x = 0;
      while (x < w) {
        if (row.charAt(x) === "X") {
          var start = x;
          while (x < w && row.charAt(x) === "X") x++;
          rects += '<rect x="' + start + '" y="' + y + '" width="' + (x - start) + '" height="1"/>';
        } else x++;
      }
    }
    return '<svg class="px-icon ' + (cls || "") + '" viewBox="0 0 ' + w + " " + h + '" aria-hidden="true" shape-rendering="crispEdges" fill="currentColor">' + rects + "</svg>";
  }

  /* ---------- tab disguise ---------- */
  var DEFAULT_TITLE = "MMC:Rebooted";
  var DEFAULT_ICON = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">' +
    '<rect width="16" height="16" fill="#0b0618"/>' +
    '<path fill="#00f0ff" d="M2 3h3v1h1v1h1v1h2V5h1V4h1V3h3v10h-3V8h-1v1H9v1H7V9H6V8H5v5H2z"/>' +
    '<path fill="#ff2bd6" d="M2 13h12v1H2z"/></svg>');

  function setFavicon(href) {
    var links = document.querySelectorAll('link[rel*="icon"]');
    for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);
    var link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    document.head.appendChild(link);
  }

  function applyDisguise(fallbackTitle) {
    var s = getSettings();
    document.title = s.title || fallbackTitle || DEFAULT_TITLE;
    setFavicon(s.icon || DEFAULT_ICON);
  }

  window.MMC = {
    getSettings: getSettings,
    THEMES: THEMES,
    themeById: themeById,
    setSetting: setSetting,
    getPins: getPins,
    isPinned: isPinned,
    togglePin: togglePin,
    clearPins: clearPins,
    getStats: getStats,
    resetStats: resetStats,
    dayKey: dayKey,
    Tracker: Tracker,
    fmtTime: fmtTime,
    fmtClock: fmtClock,
    fmtAgo: fmtAgo,
    icon: icon,
    applyDisguise: applyDisguise,
    DEFAULT_TITLE: DEFAULT_TITLE,
    DEFAULT_ICON: DEFAULT_ICON,
    KEYS: { settings: KEY_SETTINGS, stats: KEY_STATS, pins: KEY_PINS }
  };
})();
