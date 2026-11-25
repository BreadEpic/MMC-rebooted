/* MMC:Rebooted dashboard */
(function () {
  "use strict";

  var G = window.MMC_GAMES;
  var $ = function (id) { return document.getElementById(id); };
  var icon = MMC.icon;

  var TABS = [
    { id: "home", label: "Home", icon: "home" },
    { id: "games", label: "Games", icon: "pad" },
    { id: "minecraft", label: "Minecraft", icon: "pick" },
    { id: "settings", label: "Settings", icon: "gear" }
  ];

  var BLANK_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABRklEQVR42mKgOqjq75ds7510YNL0uV9nAGqniqwKYiCIHIIjcAK22BGQLRdgBWvc3fnWk/FJhrkPO1xPgGvqPfLfJMHhT1yqurvS48bPaJhjD2efgidnVwa2yv59xecvEvi0UWCXq9t0ItfP2MMZ7nwIpkA8F1n8uLxZHM6yrBH7FIl2gFXDHYsErkn2hyKLHtcKrFntk58uVQJ+kSdQnmjhID4cwLLa8+K0BXsfNWCqBOsFdo2Yldv43DBrkxd30cjnNyYBhK0SQGkI9pG4Mu40D5b374DRCAyhHqXVfTmOwivivMkJxBz5wnHCtBfGgNFC+ChWKWRf3hsQIlyEoIv4IYEo5wkgtBLRekY9DE4Uin4Keae6hydGnljPmE8kRcCine6827AMsJ1IuW9ibnlQpXLBCR/WC875m2BP+VSu3c/0m+8V08OBngc0pxcAAAAASUVORK5CYII="; // about:blank style icon from Gams

  var state = { tab: "home", filter: "All", query: "" };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* =====================================================
     Toast + tooltip
     ===================================================== */
  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  var tip = $("tooltip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    var left = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
    var top = y - r.height - 14;
    if (top < 8) top = y + 18;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.hidden = true; }

  /* =====================================================
     Tabs
     ===================================================== */
  TABS.forEach(function (t) {
    var b = $("tabbtn-" + t.id);
    b.innerHTML = icon(t.icon) + "<span>" + t.label + "</span>";
    b.addEventListener("click", function () { showTab(t.id); });
  });

  function measureHeader() {
    document.documentElement.style.setProperty("--top-h", $("top").offsetHeight + "px");
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Smooth tab changes: View Transitions where the browser has them (the header glides into its
  // compact Minecraft layout instead of jumping), a short fade/slide everywhere else.
  function showTab(id, instant) {
    if (!TABS.some(function (t) { return t.id === id; })) id = "home";
    var order = TABS.map(function (t) { return t.id; });
    var same = id === state.tab && document.body.hasAttribute("data-tab");
    document.documentElement.setAttribute("data-dir", order.indexOf(id) >= order.indexOf(state.tab) ? "fwd" : "back");
    if (instant || same || reduceMotion) { applyTab(id); return; }
    if (document.startViewTransition) {
      document.startViewTransition(function () { applyTab(id); });
    } else {
      applyTab(id);
      var v = $("tab-" + id);
      v.classList.remove("view-enter");
      void v.offsetWidth;
      v.classList.add("view-enter");
    }
  }

  function applyTab(id) {
    state.tab = id;
    document.body.setAttribute("data-tab", id);
    TABS.forEach(function (t) {
      $("tab-" + t.id).hidden = t.id !== id;
      $("tabbtn-" + t.id).setAttribute("aria-selected", t.id === id ? "true" : "false");
    });
    if (window.MMCFX) MMCFX.hold("minecraft", id === "minecraft");
    if (id === "minecraft") {
      loadLauncher();
      // frames cannot be captured mid-transition, so the launcher fades itself in
      var mf = document.querySelector(".mc-frame");
      mf.classList.remove("mc-enter"); void mf.offsetWidth; mf.classList.add("mc-enter");
    }
    if (id === "home") renderHome();
    if (location.hash !== "#" + id) history.replaceState(null, "", "#" + id);
    measureHeader();
    hideTip();
  }

  // The launcher loads quietly in the background soon after start, so opening the tab is instant
  function loadLauncher() {
    var f = $("mcFrame");
    if (f.getAttribute("src")) return;
    f.addEventListener("load", function () {
      f.classList.add("ready");
      $("mcLoading").classList.add("done");
    }, { once: true });
    f.setAttribute("src", "minecraft/index.html");
  }
  window.addEventListener("load", function () {
    var later = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    setTimeout(function () { later(loadLauncher); }, 1500);
  });

  window.addEventListener("hashchange", function () { showTab(location.hash.slice(1)); });
  window.addEventListener("resize", measureHeader);

  /* =====================================================
     Launching games
     ===================================================== */
  var current = null;   // the game open in the on-page player
  var windows = [];     // games open in other tabs / windows

  function launch(id, forceMode) {
    var g = G.byId[id];
    if (!g) return;
    var mode = forceMode || MMC.getSettings().mode;
    if (g.raw && !forceMode) mode = "raw";

    if (mode === "tab") return openWindow(g, "mmc/play.html?id=" + encodeURIComponent(g.id));
    if (mode === "raw") return openWindow(g, g.href);
    if (mode === "blank") return openBlank(g);
    if (mode === "replace") {
      location.href = "mmc/play.html?id=" + encodeURIComponent(g.id) + "&track=1";
      return;
    }
    openPlayer(g);
  }

  function popupBlocked(g) {
    toast("Popup blocked. Playing here.");
    openPlayer(g);
  }

  function trackWindow(g, w) {
    var rec = { game: g, win: w };
    rec.tracker = new MMC.Tracker(g.id, function () {
      try { return !w.closed; } catch (e) { return false; }
    });
    windows.push(rec);
    renderHome();
  }

  function openWindow(g, url) {
    var w = window.open(url, "_blank");
    if (!w) return popupBlocked(g);
    trackWindow(g, w);
  }

  function openBlank(g) {
    var w = window.open("about:blank", "_blank");
    if (!w) return popupBlocked(g);
    try {
      var d = w.document, s = MMC.getSettings();
      d.title = s.title || "about:blank";
      var link = d.createElement("link");
      link.rel = "icon";
      link.href = s.icon || BLANK_ICON;
      d.head.appendChild(link);
      d.body.style.cssText = "margin:0;overflow:hidden;background:#000";
      var f = d.createElement("iframe");
      f.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;border:0";
      f.setAttribute("allow", "autoplay; fullscreen; gamepad; clipboard-write");
      f.src = new URL("mmc/play.html?id=" + encodeURIComponent(g.id) + "&in=blank", location.href).href;
      d.body.appendChild(f);
    } catch (e) {
      w.location.href = "mmc/play.html?id=" + encodeURIComponent(g.id);
    }
    trackWindow(g, w);
  }

  // Watch other windows: stop counting the moment one closes.
  setInterval(function () {
    var changed = false;
    windows = windows.filter(function (rec) {
      var closed = true;
      try { closed = rec.win.closed; } catch (e) { closed = true; }
      if (closed) { rec.tracker.stop(); changed = true; return false; }
      return true;
    });
    if (changed) renderHome();
  }, 1000);

  window.addEventListener("pagehide", function () {
    if (current) current.tracker.flush();
    windows.forEach(function (rec) { rec.tracker.flush(); });
  });

  /* ---------- On this page player ---------- */
  var frame = $("playerFrame");
  var clockTimer;

  ["pPin", "pReload", "pFull", "pOut", "pClose"].forEach(function (id) {
    var map = { pPin: "pin", pReload: "reload", pFull: "full", pOut: "out", pClose: "close" };
    $(id).innerHTML = icon(map[id]);
  });

  function setPlayerPin() {
    var on = current && MMC.isPinned(current.game.id);
    $("pPin").classList.toggle("on", !!on);
    $("pPin").title = on ? "Unpin" : "Pin";
    $("pPin").setAttribute("aria-pressed", on ? "true" : "false");
  }

  var loadingTimer;
  function loadFrame(g) {
    var loading = $("playerLoading");
    loading.classList.remove("done");
    var done = function () {
      clearTimeout(loadingTimer);
      loading.classList.add("done");
      try { frame.focus(); } catch (e) {}
    };
    frame.onload = function () {
      if (frame.getAttribute("src") === "about:blank") return;
      done();
    };
    // Big games (Minecraft, Unity) can hold the load event while they start up or show a popup.
    // Never leave the loading screen covering a game that is already running.
    clearTimeout(loadingTimer);
    loadingTimer = setTimeout(done, 8000);
    frame.setAttribute("src", g.href);
  }

  function openPlayer(g) {
    if (current) closePlayer();
    hideTip();
    $("playerThumb").src = g.img;
    $("playerName").textContent = g.name;
    $("playerClock").textContent = "00:00:00";
    $("player").hidden = false;
    document.body.classList.add("no-scroll");
    if (window.MMCFX) MMCFX.hold("player", true);
    current = {
      game: g,
      tracker: new MMC.Tracker(g.id, function () { return document.visibilityState === "visible"; })
    };
    setPlayerPin();
    loadFrame(g);
    clockTimer = setInterval(function () {
      if (current) $("playerClock").textContent = MMC.fmtClock(current.tracker.session);
    }, 1000);
  }

  function closePlayer() {
    if (!current) return;
    current.tracker.stop();
    current = null;
    clearInterval(clockTimer);
    clearTimeout(loadingTimer);
    frame.onload = null;
    frame.setAttribute("src", "about:blank");
    $("player").hidden = true;
    document.body.classList.remove("no-scroll");
    if (window.MMCFX) MMCFX.hold("player", false);
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    renderHome();
  }

  $("pClose").addEventListener("click", closePlayer);
  $("pReload").addEventListener("click", function () { if (current) loadFrame(current.game); });
  $("pFull").addEventListener("click", function () {
    var f = frame.requestFullscreen || frame.webkitRequestFullscreen;
    if (f) f.call(frame);
  });
  $("pOut").addEventListener("click", function () {
    if (!current) return;
    var g = current.game;
    closePlayer();
    launch(g.id, "tab");
  });
  $("pPin").addEventListener("click", function () {
    if (!current) return;
    pinToggle(current.game.id);
    setPlayerPin();
  });

  /* ---------- Minecraft launches from the Ampler launcher ---------- */
  window.addEventListener("message", function (e) {
    var f = $("mcFrame");
    if (!f || e.source !== f.contentWindow) return;
    var d = e.data;
    if (!d || d.mmc !== "launch" || typeof d.id !== "string") return;
    var g = G.byId[d.id];
    if (g && g.mc) launch(g.id);
  });

  /* =====================================================
     Pins
     ===================================================== */
  function pinToggle(id) {
    var on = MMC.togglePin(id);
    var g = G.byId[id];
    toast((on ? "Pinned " : "Unpinned ") + (g ? g.name : ""));
    syncPinState(id);
    renderPinned();
  }

  function syncPinState(id) {
    var on = MMC.isPinned(id);
    var tiles = document.querySelectorAll('.tile[data-id="' + id + '"]');
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].classList.toggle("pinned", on);
      var b = tiles[i].querySelector(".tile-pin");
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.title = on ? "Unpin" : "Pin";
    }
  }

  /* =====================================================
     Tiles
     ===================================================== */
  function tile(g) {
    var pinned = MMC.isPinned(g.id);
    var t = el("div", "tile" + (g.mc ? " mc" : "") + (g.pixel ? " px" : "") + (pinned ? " pinned" : ""));
    t.setAttribute("data-id", g.id);
    var play = el("button", "tile-play");
    play.setAttribute("data-play", g.id);
    var img = el("img", "tile-img");
    img.src = g.img;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    var name = el("span", "tile-name");
    name.textContent = g.name;
    play.appendChild(img);
    play.appendChild(name);
    var pin = el("button", "tile-pin", icon("pin"));
    pin.setAttribute("data-pin", g.id);
    pin.setAttribute("aria-label", "Pin " + g.name);
    pin.setAttribute("aria-pressed", pinned ? "true" : "false");
    pin.title = pinned ? "Unpin" : "Pin";
    t.appendChild(play);
    t.appendChild(pin);
    if (g.isNew) t.appendChild(el("span", "tile-new", "New"));
    if (g.online) {
      var w = el("span", "tile-online", "Online");
      w.title = "Needs internet to play";
      t.appendChild(w);
    }
    return t;
  }

  document.addEventListener("click", function (e) {
    var pin = e.target.closest("[data-pin]");
    if (pin) { pinToggle(pin.getAttribute("data-pin")); return; }
    var play = e.target.closest("[data-play]");
    if (play) launch(play.getAttribute("data-play"));
  });

  /* =====================================================
     Home: stats
     ===================================================== */
  function parseDay(k) {
    var p = k.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function streaks(days) {
    var d = new Date(), cur = 0;
    if (!(days[MMC.dayKey(d)] > 0)) d.setDate(d.getDate() - 1);
    while (days[MMC.dayKey(d)] > 0) { cur++; d.setDate(d.getDate() - 1); }
    var keys = Object.keys(days).filter(function (k) { return days[k] > 0; }).sort();
    var best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      var dt = parseDay(k);
      run = (prev && Math.round((dt - prev) / 86400000) === 1) ? run + 1 : 1;
      if (run > best) best = run;
      prev = dt;
    });
    return { cur: cur, best: best };
  }

  function statTile(iconName, label, value, sub) {
    return '<div class="stat"><div class="stat-label">' + icon(iconName) + label + "</div>" +
      '<div class="stat-value">' + value + "</div>" +
      '<div class="stat-sub">' + sub + "</div></div>";
  }

  function renderStats(s) {
    var today = s.days[MMC.dayKey()] || 0;
    var week = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(); d.setDate(d.getDate() - i);
      week += s.days[MMC.dayKey(d)] || 0;
    }
    var st = streaks(s.days);
    var tried = 0;
    for (var id in s.games) if (G.byId[id] && s.games[id].time > 0) tried++;
    var longest = s.longest && s.longest.ms ? MMC.fmtTime(s.longest.ms, true) : "none yet";
    $("statRow").innerHTML =
      statTile("hourglass", "Playtime", MMC.fmtTime(s.total, true), s.sessions + (s.sessions === 1 ? " session" : " sessions")) +
      statTile("clock", "Today", MMC.fmtTime(today, true), "This week " + MMC.fmtTime(week, true)) +
      statTile("fire", "Streak", st.cur + (st.cur === 1 ? " day" : " days"), "Best " + st.best + (st.best === 1 ? " day" : " days")) +
      statTile("trophy", "Games Tried", tried + "/" + G.list.length, "Longest run " + longest);
  }

  /* ---------- Most played: pie + legend ---------- */
  var PIE_SLOTS = 5;       // top 5 games get a color, the rest go in "Other"
  var pieSig = "";
  var pieBooted = false;

  // Each game keeps its color while it stays in the top 5, so colors follow the game, not its rank.
  function pieColors(ids) {
    var saved = {};
    try { saved = JSON.parse(localStorage.getItem("mmc-pie-colors") || "{}") || {}; } catch (e) {}
    var out = {}, used = {};
    ids.forEach(function (id) {
      var k = saved[id];
      if (typeof k === "number" && k >= 0 && k < PIE_SLOTS && !used[k]) { out[id] = k; used[k] = true; }
    });
    ids.forEach(function (id) {
      if (out[id] != null) return;
      for (var k = 0; k < PIE_SLOTS; k++) if (!used[k]) { out[id] = k; used[k] = true; break; }
    });
    var keep = {};
    ids.forEach(function (id) { keep[id] = out[id]; });
    try { localStorage.setItem("mmc-pie-colors", JSON.stringify(keep)); } catch (e) {}
    return out;
  }

  function pct(v, total) {
    var p = total ? (v / total) * 100 : 0;
    return (p > 0 && p < 1 ? "<1" : Math.round(p)) + "%";
  }

  function highlight(k) {
    var pie = $("pie");
    if (k == null) pie.removeAttribute("data-hl"); else pie.setAttribute("data-hl", k);
    var sl = pie.querySelectorAll(".slice");
    for (var j = 0; j < sl.length; j++) sl[j].classList.toggle("on", sl[j].getAttribute("data-k") === String(k));
    var rows = $("topList").querySelectorAll(".top-item");
    for (var i = 0; i < rows.length; i++) rows[i].classList.toggle("hl", String(i) === String(k));
  }

  // point on the circle, 0 = 12 o'clock, going clockwise
  function polar(f, r) {
    var a = f * Math.PI * 2;
    return [50 + r * Math.sin(a), 50 - r * Math.cos(a)];
  }

  function renderPie(s) {
    var ids = Object.keys(s.games)
      .filter(function (id) { return G.byId[id] && s.games[id].time > 0; })
      .sort(function (a, b) { return s.games[b].time - s.games[a].time; });
    var total = 0;
    ids.forEach(function (id) { total += s.games[id].time; });
    var top = ids.slice(0, PIE_SLOTS);
    var rest = ids.slice(PIE_SLOTS);
    var restTime = 0;
    rest.forEach(function (id) { restTime += s.games[id].time; });
    var colors = pieColors(top);

    // slices in reading order: biggest first from 12 o'clock, "Other" last
    var slices = top.map(function (id) {
      var g = G.byId[id];
      return { id: id, name: g.name, img: g.img, mc: g.mc, time: s.games[id].time, cls: "p" + colors[id] };
    });
    if (restTime > 0) slices.push({ id: null, name: "Other (" + rest.length + (rest.length === 1 ? " game)" : " games)"), time: restTime, cls: "po" });

    $("pieMeta").textContent = total ? "Total " + MMC.fmtTime(total, true) : "";

    // ---- the pie (smooth SVG arcs) ----
    var R = 48, pie = $("pie");
    var sig = total ? slices.map(function (sl) { return sl.cls + ":" + (sl.time / total).toFixed(3); }).join(",") : "empty";
    if (sig !== pieSig) {
      pieSig = sig;
      var html = "", from = 0;
      if (!total) {
        html = '<circle class="slice pe" cx="50" cy="50" r="' + R + '"></circle>';
      } else {
        slices.forEach(function (sl, k) {
          var share = sl.time / total, to = from + share, mid = from + share / 2;
          var off = polar(mid, 3);
          var style = ' style="--dx:' + (off[0] - 50).toFixed(2) + 'px;--dy:' + (off[1] - 50).toFixed(2) + 'px"';
          if (share >= 0.9999) {
            html += '<circle class="slice ' + sl.cls + '" data-k="' + k + '" cx="50" cy="50" r="' + R + '"' + style + "></circle>";
          } else {
            var p1 = polar(from, R), p2 = polar(to, R);
            html += '<path class="slice ' + sl.cls + '" data-k="' + k + '"' + style + ' d="M50 50L' + p1[0].toFixed(3) + " " + p1[1].toFixed(3) +
              "A" + R + " " + R + " 0 " + (share > 0.5 ? 1 : 0) + " 1 " + p2[0].toFixed(3) + " " + p2[1].toFixed(3) + 'Z"></path>';
          }
          from = to;
        });
      }
      // sweep the pie in clockwise the first time it shows real data
      if (!pieBooted && total) {
        pieBooted = true;
        html = '<defs><mask id="pieMask"><circle class="pie-sweep" cx="50" cy="50" r="25" fill="none" stroke="#fff" stroke-width="52"' +
          ' stroke-dasharray="157.08 157.08" stroke-dashoffset="157.08" transform="rotate(-90 50 50)"></circle></mask></defs>' +
          '<g mask="url(#pieMask)">' + html + "</g>";
      }
      pie.innerHTML = html;
    }
    pie.setAttribute("aria-label", total
      ? "Playtime split: " + slices.map(function (sl) { return sl.name + " " + pct(sl.time, total); }).join(", ")
      : "No playtime yet");
    pie.onmousemove = function (e) {
      var node = e.target.closest ? e.target.closest(".slice") : null;
      var k = node ? +node.getAttribute("data-k") : -1;
      if (!(k >= 0) || !slices[k]) { highlight(null); hideTip(); return; }
      highlight(k);
      var sl = slices[k];
      showTip("<b>" + sl.name.replace(/</g, "&lt;") + "</b>" + MMC.fmtTime(sl.time, true) + " &middot; " + pct(sl.time, total), e.clientX, e.clientY);
    };
    pie.onmouseleave = function () { highlight(null); hideTip(); };
    pie.onclick = function (e) {
      var node = e.target.closest ? e.target.closest(".slice") : null;
      var k = node ? +node.getAttribute("data-k") : -1;
      if (k >= 0 && slices[k] && slices[k].id) launch(slices[k].id);
    };

    // ---- the legend: exact numbers for every slice ----
    var list = $("topList");
    list.innerHTML = "";
    if (!slices.length) {
      list.innerHTML = '<li class="empty">No playtime yet. <b>Play anything and your top games fill the pie.</b></li>';
      return;
    }
    slices.forEach(function (sl, k) {
      var li = el("li", "top-item");
      if (sl.id) {
        li.setAttribute("data-play", sl.id);
        li.tabIndex = 0;
        li.title = "Play " + sl.name;
      }
      li.innerHTML =
        '<span class="top-rank">' + (sl.id ? k + 1 : "") + "</span>" +
        '<span class="top-swatch ' + sl.cls + '"></span>' +
        (sl.id ? '<img class="top-thumb' + (sl.mc ? " mc" : "") + '" alt="" src="' + sl.img + '">' : '<span class="top-thumb none"></span>') +
        '<span class="top-name"></span>' +
        '<span class="top-time">' + MMC.fmtTime(sl.time, true) + "</span>" +
        '<span class="top-pct">' + pct(sl.time, total) + "</span>";
      li.querySelector(".top-name").textContent = sl.name;
      li.addEventListener("mouseenter", function () { highlight(k); });
      li.addEventListener("mouseleave", function () { highlight(null); });
      li.addEventListener("focus", function () { highlight(k); });
      li.addEventListener("blur", function () { highlight(null); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter" && sl.id) launch(sl.id); });
      list.appendChild(li);
    });
  }

  function renderPinned() {
    var wrap = $("pinned");
    var pins = MMC.getPins().filter(function (id) { return G.byId[id]; });
    $("pinCount").textContent = pins.length ? pins.length + (pins.length === 1 ? " game" : " games") : "";
    wrap.innerHTML = "";
    if (!pins.length) {
      wrap.innerHTML = '<div class="empty">No pins yet. <b>Hover a game and hit the pin to keep it here.</b></div>';
      return;
    }
    pins.forEach(function (id) { wrap.appendChild(tile(G.byId[id])); });
  }

  function renderRecent(s) {
    var wrap = $("recent");
    var ids = Object.keys(s.games)
      .filter(function (id) { return G.byId[id] && s.games[id].last; })
      .sort(function (a, b) { return s.games[b].last - s.games[a].last; })
      .slice(0, 8);
    wrap.innerHTML = "";
    if (!ids.length) {
      wrap.innerHTML = '<div class="empty">Nothing yet. <b>Games you play land here so you can jump right back in.</b></div>';
      return;
    }
    ids.forEach(function (id) {
      var g = G.byId[id], st = s.games[id];
      var b = el("button", "recent-card" + (g.mc ? " mc" : ""));
      b.setAttribute("data-play", id);
      b.innerHTML = '<img alt="" src="' + g.img + '">' +
        '<span class="recent-info"><span class="recent-name"></span>' +
        '<span class="recent-meta">' + MMC.fmtAgo(st.last) + " &middot; " + MMC.fmtTime(st.time) + " played</span></span>" +
        '<span class="recent-go">' + icon("play") + "</span>";
      b.querySelector(".recent-name").textContent = g.name;
      b.setAttribute("aria-label", "Play " + g.name);
      wrap.appendChild(b);
    });
  }

  function renderHome() {
    if (state.tab !== "home") return;
    var s = MMC.getStats();
    renderStats(s);
    renderPie(s);
    renderPinned();
    renderRecent(s);
  }

  // keep the numbers fresh while games run in other tabs
  setInterval(function () {
    if (state.tab === "home" && !current && document.visibilityState === "visible") renderHome();
  }, 5000);

  /* =====================================================
     Home: library
     ===================================================== */
  function renderChips() {
    var chips = $("chips");
    var counts = { All: G.list.length };
    G.list.forEach(function (g) { counts[g.section] = (counts[g.section] || 0) + 1; });
    chips.innerHTML = "";
    ["All"].concat(G.sections).forEach(function (sec) {
      var c = el("button", "chip");
      c.textContent = sec + " " + counts[sec];
      c.setAttribute("aria-pressed", state.filter === sec ? "true" : "false");
      c.addEventListener("click", function () {
        state.filter = sec;
        renderChips();
        renderLibrary();
      });
      chips.appendChild(c);
    });
  }

  function renderLibrary() {
    var grid = $("libGrid");
    var q = state.query.trim().toLowerCase();
    var games = G.list.filter(function (g) {
      if (state.filter !== "All" && g.section !== state.filter) return false;
      if (q && (g.name + " " + g.section).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    $("gameCount").textContent = (games.length === G.list.length ? "" : games.length + " of ") + G.list.length + " games";
    grid.className = "tiles";
    grid.innerHTML = "";
    if (!games.length) {
      grid.innerHTML = '<div class="empty">No games match <b>"' + q.replace(/[<>&"]/g, "") + '"</b>.</div>';
      return;
    }
    var grouped = state.filter === "All" && !q;
    var lastSection = null;
    games.forEach(function (g) {
      if (grouped && g.section !== lastSection) {
        lastSection = g.section;
        var n = G.list.filter(function (x) { return x.section === g.section; }).length;
        var h = el("h3", "lib-section");
        h.innerHTML = g.section + " <small>" + n + "</small>";
        grid.appendChild(h);
      }
      grid.appendChild(tile(g));
    });
  }

  $("searchIcon").innerHTML = icon("search");
  $("search").addEventListener("input", function () {
    state.query = this.value;
    renderLibrary();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || current) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (state.tab !== "games") showTab("games", true);
    e.preventDefault();
    var s = $("search");
    s.focus();
    s.scrollIntoView({ block: "center" });
  });

  /* =====================================================
     Settings
     ===================================================== */
  function applyLook() {
    var s = MMC.getSettings(), r = document.documentElement, t = MMC.themeById(s.theme);
    r.setAttribute("data-theme", t.id);
    r.setAttribute("data-fx", s.fx ? "on" : "off");
    if (window.MMCFX) MMCFX.set(t.fx, s.fx);
    var tn = $("themeName");
    if (tn) tn.textContent = t.name;
    var cards = document.querySelectorAll(".theme-card");
    for (var i = 0; i < cards.length; i++) cards[i].setAttribute("aria-checked", cards[i].getAttribute("data-theme") === t.id ? "true" : "false");
    pieSig = ""; // slice gap color follows the theme
    if (state.tab === "home") renderHome();
  }

  function renderDisguiseState() {
    var s = MMC.getSettings();
    $("disguiseState").textContent = s.title || s.icon ? "On" + (s.title ? ": " + s.title : "") : "Off";
    var btns = $("presets").querySelectorAll(".preset");
    for (var i = 0; i < btns.length; i++) {
      var p = window.MMC_PRESETS[i];
      btns[i].setAttribute("aria-pressed", s.title === p.title && s.icon === p.icon ? "true" : "false");
    }
  }

  function setupSettings() {
    var s = MMC.getSettings();

    var themes = $("themes");
    MMC.THEMES.forEach(function (t) {
      var b = el("button", "theme-card");
      b.setAttribute("data-theme", t.id);
      b.setAttribute("role", "radio");
      b.setAttribute("aria-label", t.name + " theme");
      b.innerHTML = '<span class="tc-art"><i></i><i></i><b></b></span><span class="tc-name"><span></span>' + icon("star") + "</span>";
      b.querySelector(".tc-name span").textContent = t.name;
      b.addEventListener("click", function () {
        MMC.setSetting("theme", t.id);
        applyLook();
      });
      themes.appendChild(b);
    });

    $("setFx").checked = !!s.fx;
    $("setFx").addEventListener("change", function () {
      MMC.setSetting("fx", this.checked);
      applyLook();
    });

    $("setMode").value = s.mode;
    $("setMode").addEventListener("change", function () {
      MMC.setSetting("mode", this.value);
      toast("Saved");
    });
    $("setBar").value = s.bar;
    $("setBar").addEventListener("change", function () {
      MMC.setSetting("bar", this.value);
      toast("Saved");
    });

    // Disguise
    $("tabName").value = s.title || "";
    $("applyTitle").addEventListener("click", function () {
      var v = $("tabName").value.trim();
      if (!v) { toast("Type a tab name first"); return; }
      MMC.setSetting("title", v);
      MMC.applyDisguise();
      renderDisguiseState();
      toast("Tab name applied");
    });
    $("tabName").addEventListener("keydown", function (e) { if (e.key === "Enter") $("applyTitle").click(); });

    $("tabIcon").addEventListener("change", function () {
      $("tabIconName").textContent = this.files && this.files[0] ? this.files[0].name : "No file";
    });
    $("applyIcon").addEventListener("click", function () {
      var input = $("tabIcon");
      if (!input.files || !input.files[0]) { toast("Choose an image first"); return; }
      var url = URL.createObjectURL(input.files[0]);
      var img = new Image();
      img.onload = function () {
        var max = 32, w = img.width, h = img.height;
        if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; }
        var c = document.createElement("canvas");
        c.width = Math.max(1, w); c.height = Math.max(1, h);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        MMC.setSetting("icon", c.toDataURL("image/png"));
        MMC.applyDisguise();
        renderDisguiseState();
        toast("Tab icon applied");
      };
      img.onerror = function () { toast("That image did not load"); };
      img.src = url;
    });

    var pr = $("presets");
    (window.MMC_PRESETS || []).forEach(function (p) {
      var b = el("button", "preset");
      b.title = p.title;
      b.setAttribute("aria-label", "Disguise as " + p.title);
      var im = el("img");
      im.src = p.icon;
      im.alt = "";
      b.appendChild(im);
      b.addEventListener("click", function () {
        MMC.setSetting("title", p.title);
        MMC.setSetting("icon", p.icon);
        $("tabName").value = p.title;
        MMC.applyDisguise();
        renderDisguiseState();
        toast("Disguised as " + p.title);
      });
      pr.appendChild(b);
    });

    $("removeDisguise").addEventListener("click", function () {
      MMC.setSetting("title", "");
      MMC.setSetting("icon", "");
      $("tabName").value = "";
      MMC.applyDisguise();
      renderDisguiseState();
      toast("Disguise off");
    });
    renderDisguiseState();

    // Data
    $("resetStats").addEventListener("click", function () {
      if (!confirm("Reset all playtime stats?")) return;
      MMC.resetStats();
      toast("Playtime reset");
      renderHome();
    });
    $("clearPins").addEventListener("click", function () {
      if (!confirm("Unpin every game?")) return;
      MMC.clearPins();
      G.list.forEach(function (g) { syncPinState(g.id); });
      renderPinned();
      toast("All games unpinned");
    });
  }

  // Changes made in another tab (disguise, stats from "Replace this tab" mode, pins)
  window.addEventListener("storage", function (e) {
    if (e.key === MMC.KEYS.settings) { applyLook(); MMC.applyDisguise(); renderDisguiseState(); }
    if (e.key === MMC.KEYS.pins) { G.list.forEach(function (g) { syncPinState(g.id); }); renderPinned(); }
    if (e.key === MMC.KEYS.stats) renderHome();
  });

  /* =====================================================
     Tips: tips.js sits next to Run Me.html in the release zip
     (release/tips.js in the repo). A random one shows each time.
     ===================================================== */
  var tips = [];
  var DEFAULT_TIPS = [
    "Press / to jump straight to the game search.",
    "Hover any game and hit the pin to keep it on Home.",
    "Settings > Disguise can make this tab look like Google Docs, Classes and more.",
    "Turn off Effects in Settings if games feel slow.",
    "Everything runs offline. No wifi needed once it is unzipped."
  ];
  window.MMC_TIPS = function (list) {
    if (!Array.isArray(list)) return;
    var clean = list.map(function (t) { return String(t).trim(); }).filter(Boolean);
    if (!clean.length) return;
    tips = clean;
    showTip_(true);
  };

  function showTip_(first) {
    if (!tips.length) tips = DEFAULT_TIPS.slice();
    var last = -1;
    try { last = +sessionStorage.getItem("mmc-last-tip"); } catch (e) {}
    var i = Math.floor(Math.random() * tips.length);
    if (tips.length > 1 && i === last) i = (i + 1 + Math.floor(Math.random() * (tips.length - 1))) % tips.length;
    try { sessionStorage.setItem("mmc-last-tip", String(i)); } catch (e) {}
    var text = $("tipText");
    text.textContent = tips[i];
    text.classList.remove("swap");
    if (!first) { void text.offsetWidth; text.classList.add("swap"); }
    $("tipCount").textContent = (i + 1) + " of " + tips.length;
  }

  $("tipIcon").innerHTML = icon("star");
  $("tipNextIcon").innerHTML = icon("reload");
  $("tipNext").addEventListener("click", function () { showTip_(false); });
  showTip_(true); // built-in tips right away, replaced as soon as tips.js loads

  // tips.js sits next to Run Me.html in the release zip (release/tips.js in the repo)
  (function loadTips(paths) {
    if (!paths.length) return;
    var s = document.createElement("script");
    s.src = paths[0];
    s.onerror = function () { s.remove(); loadTips(paths.slice(1)); };
    document.body.appendChild(s);
  })(["../tips.js", "tips.js", "release/tips.js"]);

  /* =====================================================
     Packs: optional zips (Extra Games, FNF, PvZ2, Bonus) that extract into the same folder.
     Each one has packs/<id>.js that calls MMC_PACK({...}); missing packs are simply skipped.
     ===================================================== */
  var PACKS = ["bonus", "extra1", "extra2", "extra3", "fnf", "pvz2"];
  var packsLoaded = [];
  var packRender;
  window.MMC_PACK = function (pack) {
    if (!pack || !Array.isArray(pack.games)) return;
    var added = 0;
    pack.games.forEach(function (g) { if (G.add(g, pack.name)) added++; });
    packsLoaded.push(pack.name + " (" + added + ")");
    // order: core games by section as before, pack games alphabetical inside their section
    G.list.sort(function (a, b) {
      var sa = G.sections.indexOf(a.section), sb = G.sections.indexOf(b.section);
      if (sa !== sb) return sa - sb;
      if (!a.pack && !b.pack) return 0;
      if (!a.pack) return -1;
      if (!b.pack) return 1;
      return a.name.localeCompare(b.name);
    });
    clearTimeout(packRender);
    packRender = setTimeout(function () {
      renderChips();
      renderLibrary();
      if (state.tab === "home") renderHome();
      var pi = $("packInfo");
      if (pi) pi.textContent = packsLoaded.join(", ");
    }, 30);
  };
  PACKS.forEach(function (id) {
    var s = document.createElement("script");
    s.src = "packs/" + id + ".js";
    s.onerror = function () { s.remove(); };
    document.body.appendChild(s);
  });

  /* =====================================================
     Boot
     ===================================================== */
  MMC.applyDisguise();
  setupSettings();
  applyLook();
  renderChips();
  renderLibrary();
  showTab(location.hash.slice(1) || "home", true);
})();
