/* Vectors 2.0 kit: glow (bloom) for 2D canvases, vignette, scanlines, screen shake, flashes,
   a tiny synth for sound effects, and a small FX menu. Everything is local, no internet.

   VFX.init({ canvas, bloom: 0.7, vignette: true, scanlines: false, title: "Game Name" })
   VFX.shake(px, ms)   VFX.flash(color, ms)   VFX.sfx("shoot" | "hit" | "boom" | "pickup" | "power" | "click" | "hurt" | "coin" | "jump" | "win" | "lose")
*/
(function () {
  "use strict";
  var KEY = "vectors-fx";
  var S = { glow: true, vignette: true, scanlines: false, sound: true };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "{}"); for (var k in saved) if (k in S) S[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var opts = { bloom: 0.7, vignette: true, scanlines: false };
  var css = document.createElement("style");
  css.textContent =
    ".vfx-bloom{position:fixed;left:0;top:0;pointer-events:none;mix-blend-mode:screen;image-rendering:auto}" +
    ".vfx-vig{position:fixed;inset:0;pointer-events:none;z-index:2147482000;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 58%,rgba(0,0,0,.5) 100%)}" +
    ".vfx-scan{position:fixed;inset:0;pointer-events:none;z-index:2147482001;opacity:.18;background:repeating-linear-gradient(to bottom,rgba(0,0,0,.9) 0 1px,transparent 1px 3px)}" +
    ".vfx-flash{position:fixed;inset:0;pointer-events:none;z-index:2147482002;opacity:0;transition:opacity .25s ease-out}" +
    ".vfx-btn{position:fixed;right:10px;bottom:10px;z-index:2147483000;width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.25);" +
    "background:rgba(10,10,20,.6);color:#fff;font:700 10px/28px Inter,Segoe UI,sans-serif;text-align:center;cursor:pointer;opacity:.35;transition:opacity .3s;backdrop-filter:blur(6px)}" +
    ".vfx-btn:hover{opacity:1}.vfx-btn.hide{opacity:0}" +
    ".vfx-menu{position:fixed;right:10px;bottom:48px;z-index:2147483000;background:rgba(10,10,22,.92);border:1px solid rgba(255,255,255,.18);border-radius:12px;" +
    "padding:10px 12px;color:#e8e8ff;font:500 12px Inter,Segoe UI,sans-serif;min-width:150px;box-shadow:0 10px 40px rgba(0,0,0,.6);display:none;backdrop-filter:blur(10px)}" +
    ".vfx-menu.open{display:block}.vfx-menu b{display:block;font:700 10px Orbitron,Inter,sans-serif;letter-spacing:2px;color:#7df9ff;margin-bottom:6px}" +
    ".vfx-menu label{display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer}.vfx-menu input{accent-color:#7df9ff}" +
    ".vfx-splash{position:fixed;inset:0;z-index:2147483600;background:#05030c;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "transition:opacity .45s ease;font-family:Orbitron,Inter,sans-serif;color:#fff;cursor:pointer}" +
    ".vfx-splash .v{font-weight:900;font-size:clamp(22px,5vw,46px);letter-spacing:.3em;background:linear-gradient(90deg,#7df9ff,#ff4fd8,#ffe14f);" +
    "-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(125,249,255,.45));animation:vfx-in .7s cubic-bezier(.2,.9,.2,1) both}" +
    ".vfx-splash .t{margin-top:14px;font:700 clamp(11px,1.6vw,15px) Inter,sans-serif;letter-spacing:.4em;color:#b9b6d9;text-transform:uppercase;animation:vfx-in .7s .12s cubic-bezier(.2,.9,.2,1) both}" +
    ".vfx-splash .bar{margin-top:22px;width:160px;height:3px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}" +
    ".vfx-splash .bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#7df9ff,#ff4fd8);transform-origin:left;animation:vfx-bar .8s ease-out both}" +
    "@keyframes vfx-in{from{opacity:0;transform:translateY(10px) scale(.96);letter-spacing:.6em}to{opacity:1;transform:none}}" +
    "@keyframes vfx-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}";
  (document.head || document.documentElement).appendChild(css);

  /* ---- one shared animation frame, so the glow is drawn right after the game draws ---- */
  var raf0 = window.requestAnimationFrame.bind(window);
  var caf0 = window.cancelAnimationFrame.bind(window);
  var queue = [], nextId = 1, scheduled = 0, post = [];
  function tick(t) {
    scheduled = 0;
    var run = queue; queue = [];
    for (var i = 0; i < run.length; i++) {
      try { run[i][1](t); } catch (e) { setTimeout(function (err) { return function () { throw err; }; }(e)); }
    }
    for (var j = 0; j < post.length; j++) post[j](t);
    if (post.length && !scheduled) scheduled = raf0(tick);
  }
  window.requestAnimationFrame = function (cb) {
    var id = nextId++;
    queue.push([id, cb]);
    if (!scheduled) scheduled = raf0(tick);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    for (var i = 0; i < queue.length; i++) if (queue[i][0] === id) { queue.splice(i, 1); return; }
  };
  void caf0;
  function onFrame(fn) { post.push(fn); if (!scheduled) scheduled = raf0(tick); }

  /* ---- glow: a blurred, contrast boosted copy of the game canvas, added on top with screen blending ---- */
  var blooms = [];
  function addBloom(src, strength) {
    if (!src || src.__vfxBloom) return;
    var o = document.createElement("canvas");
    o.className = "vfx-bloom";
    var b = { src: src, c: o, x: o.getContext("2d"), s: strength == null ? opts.bloom : strength, w: 0, h: 0 };
    src.__vfxBloom = b;
    src.parentNode.insertBefore(o, src.nextSibling);
    var z = getComputedStyle(src).zIndex;
    if (z && z !== "auto") o.style.zIndex = z;
    blooms.push(b);
  }
  var slow = 0, lastT = 0;
  onFrame(function (t) {
    var dt = lastT ? t - lastT : 16; lastT = t;
    // Automatic safety: if the computer struggles for a few seconds, turn the glow off.
    if (S.glow && blooms.length) { if (dt > 40 && dt < 400) slow++; else if (slow > 0) slow -= 0.5; if (slow > 150) { S.glow = false; save(); syncMenu(); } }
    for (var i = 0; i < blooms.length; i++) {
      var b = blooms[i], src = b.src;
      if (!S.glow || !src.isConnected || src.width < 2) { if (b.c.style.display !== "none") b.c.style.display = "none"; continue; }
      var vis = getComputedStyle(src);
      var fixed = vis.position === "fixed";
      // Fixed canvases use screen coordinates. Everything else uses layout offsets, which stay right
      // even when a parent is scaled with a CSS transform.
      var r = fixed ? src.getBoundingClientRect() : { left: src.offsetLeft, top: src.offsetTop, width: src.offsetWidth, height: src.offsetHeight };
      if (r.width < 2 || vis.display === "none" || vis.visibility === "hidden") { b.c.style.display = "none"; continue; }
      b.c.style.display = "block";
      b.c.style.position = fixed ? "fixed" : "absolute";
      var w = Math.max(2, Math.round(r.width / 3)), h = Math.max(2, Math.round(r.height / 3));
      if (w !== b.w || h !== b.h) { b.c.width = b.w = w; b.c.height = b.h = h; }
      b.c.style.left = r.left + "px"; b.c.style.top = r.top + "px";
      b.c.style.transform = fixed ? "" : (src.style.transform || "");
      b.c.style.width = r.width + "px"; b.c.style.height = r.height + "px";
      b.c.style.opacity = b.s;
      var x = b.x;
      x.globalCompositeOperation = "copy";
      x.filter = "brightness(1.05) contrast(2.4) saturate(1.5) blur(" + Math.max(2, Math.round(w / 110)) + "px)";
      try { x.drawImage(src, 0, 0, w, h); } catch (e) {}
      x.filter = "none";
    }
  });

  /* ---- overlays ---- */
  var vig, scan, flashEl;
  function overlays() {
    if (!document.body) return;
    if (!vig) { vig = document.createElement("div"); vig.className = "vfx-vig"; document.body.appendChild(vig); }
    if (!scan) { scan = document.createElement("div"); scan.className = "vfx-scan"; document.body.appendChild(scan); }
    if (!flashEl) { flashEl = document.createElement("div"); flashEl.className = "vfx-flash"; document.body.appendChild(flashEl); }
    vig.style.display = S.vignette && opts.vignette ? "" : "none";
    scan.style.display = S.scanlines ? "" : "none";
  }

  /* ---- shake and flash ---- */
  var shakeT = 0, shakeA = 0, shakeEnd = 0;
  function shakeTarget() { return opts.shakeEl || opts.canvas || document.body; }
  onFrame(function (t) {
    var el = shakeTarget();
    if (!el) return;
    if (t < shakeEnd) {
      var k = (shakeEnd - t) / shakeT, a = shakeA * k;
      el.style.transform = "translate(" + ((Math.random() * 2 - 1) * a).toFixed(1) + "px," + ((Math.random() * 2 - 1) * a).toFixed(1) + "px)";
      el.__vfxShaking = 1;
    } else if (el.__vfxShaking) { el.style.transform = ""; el.__vfxShaking = 0; }
  });
  function shake(px, ms) {
    var now = performance.now();
    if (now < shakeEnd && px < shakeA * (shakeEnd - now) / shakeT) return;
    shakeA = px || 6; shakeT = ms || 220; shakeEnd = now + shakeT;
  }
  function flash(color, ms) {
    overlays();
    if (!flashEl) return;
    flashEl.style.transition = "none"; flashEl.style.background = color || "#fff"; flashEl.style.opacity = ".45";
    void flashEl.offsetWidth;
    flashEl.style.transition = "opacity " + ((ms || 250) / 1000) + "s ease-out"; flashEl.style.opacity = "0";
  }

  /* ---- tiny synth ---- */
  var AC = null, master = null;
  function ac() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = 0.35; master.connect(AC.destination);
    }
    if (AC.state === "suspended") AC.resume();
    return AC;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol, freq, delay) {
    var a = ac(); if (!a) return;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var t = a.currentTime + (delay || 0);
    var s = a.createBufferSource(), g = a.createGain(), f = a.createBiquadFilter();
    s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.setValueAtTime(freq || 2000, t); f.frequency.exponentialRampToValueAtTime(80, t + dur);
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  var lastSfx = {};
  var SFX = {
    shoot: function () { tone(880, 220, 0.09, "square", 0.06); },
    laser: function () { tone(1400, 300, 0.12, "sawtooth", 0.05); },
    hit: function () { tone(300, 90, 0.08, "square", 0.08); },
    boom: function () { noise(0.45, 0.35, 1600); tone(120, 40, 0.35, "sine", 0.25); },
    pickup: function () { tone(660, 0, 0.06, "square", 0.08); tone(990, 0, 0.08, "square", 0.08, 0.06); },
    coin: function () { tone(988, 0, 0.05, "square", 0.07); tone(1319, 0, 0.18, "square", 0.07, 0.05); },
    power: function () { tone(220, 880, 0.35, "sawtooth", 0.08); tone(330, 1320, 0.35, "square", 0.04, 0.05); },
    click: function () { tone(1200, 600, 0.04, "square", 0.04); },
    hurt: function () { tone(220, 60, 0.25, "sawtooth", 0.12); noise(0.15, 0.15, 900); },
    jump: function () { tone(300, 700, 0.14, "square", 0.06); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, 0.18, "square", 0.08, i * 0.11); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0, 0.25, "triangle", 0.12, i * 0.16); }); }
  };
  function sfx(name) {
    if (!S.sound || !SFX[name]) return;
    var now = performance.now();
    if (lastSfx[name] && now - lastSfx[name] < 35) return;
    lastSfx[name] = now;
    try { SFX[name](); } catch (e) {}
  }

  /* ---- FX menu ---- */
  var btn, menu, hideT;
  function syncMenu() {
    if (!menu) return;
    menu.querySelectorAll("input").forEach(function (i) { i.checked = !!S[i.name]; });
    overlays();
  }
  function buildMenu() {
    if (btn || !document.body) return;
    btn = document.createElement("div"); btn.className = "vfx-btn"; btn.textContent = "FX"; btn.title = "Vectors 2.0 effects";
    menu = document.createElement("div"); menu.className = "vfx-menu";
    var rows = [["glow", "Glow"], ["vignette", "Vignette"], ["scanlines", "Scanlines"], ["sound", "Sound effects"]];
    menu.innerHTML = "<b>VECTORS 2.0</b>" + rows.map(function (r) { return '<label><input type="checkbox" name="' + r[0] + '">' + r[1] + "</label>"; }).join("");
    menu.addEventListener("change", function (e) { S[e.target.name] = e.target.checked; if (e.target.name === "glow" && S.glow) slow = 0; save(); syncMenu(); });
    btn.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.toggle("open"); });
    ["mousedown", "keydown", "touchstart"].forEach(function (ev) { menu.addEventListener(ev, function (e) { e.stopPropagation(); }); btn.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) menu.classList.remove("open"); });
    document.body.appendChild(menu); document.body.appendChild(btn);
    function wake() { btn.classList.remove("hide"); clearTimeout(hideT); hideT = setTimeout(function () { if (!menu.classList.contains("open")) btn.classList.add("hide"); }, 2500); }
    document.addEventListener("mousemove", wake, { passive: true });
    wake();
    syncMenu();
  }

  function splash(title) {
    var k = "vectors-splash-" + title;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, 1); } catch (e) {}
    var d = document.createElement("div"); d.className = "vfx-splash";
    d.innerHTML = '<div class="v">VECTORS 2.0</div><div class="t"></div><div class="bar"><i></i></div>';
    d.querySelector(".t").textContent = title;
    document.body.appendChild(d);
    function go() { d.style.opacity = "0"; d.style.pointerEvents = "none"; setTimeout(function () { d.remove(); }, 500); }
    d.addEventListener("click", go);
    setTimeout(go, 1100);
  }

  function init(o) {
    o = o || {};
    for (var k in o) opts[k] = o[k];
    function go() {
      overlays(); buildMenu();
      if (o.title) splash(o.title);
      var cs = o.canvas ? [].concat(o.canvas) : [];
      cs.forEach(function (c) { if (typeof c === "string") c = document.querySelector(c); if (c && c.getContext) addBloom(c, o.bloom); });
    }
    if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
  }

  // For games that update once per animation frame: returns true about 60 times a second,
  // so they run at the same speed on 60Hz, 75Hz, 120Hz and 144Hz screens.
  var gateAcc = 0, gateLast = 0;
  function tick60(now) {
    now = now || performance.now();
    if (!gateLast) { gateLast = now; return true; }
    gateAcc += Math.min(100, now - gateLast); gateLast = now;
    if (gateAcc < 1000 / 61) return false;
    gateAcc = Math.min(gateAcc - 1000 / 60, 1000 / 60);
    if (gateAcc < 0) gateAcc = 0;
    return true;
  }

  window.VFX = { tick60: tick60, init: init, bloom: addBloom, shake: shake, flash: flash, sfx: sfx, tone: tone, noise: noise, settings: S, onFrame: onFrame };
})();
