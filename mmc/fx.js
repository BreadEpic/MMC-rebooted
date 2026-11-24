/* MMC:Rebooted animated theme backgrounds (matrix rain, bubbles, embers, petals, snow, stars).
   One small canvas behind the dashboard. It sleeps while a game is open, while the Minecraft tab
   is showing, while the browser tab is hidden, or when Effects are off, so games keep full speed. */
(function () {
  "use strict";

  var canvas = null, ctx = null, mode = null, items = [], raf = 0, lastFrame = 0, W = 0, H = 0;
  var holds = {};
  var col = {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#%&*+=<>/\\|{}[]";

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function rgb(hex) {
    hex = (hex || "#000").replace("#", "");
    if (hex.length === 3) hex = hex.replace(/./g, "$&$&");
    var n = parseInt(hex.slice(0, 6), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) { var c = rgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function density(base) { return Math.round(base * Math.min(1.6, (W * H) / (1366 * 768))); }

  /* ---------- the effects ---------- */
  var MODES = {
    matrix: {
      fps: 18,
      init: function () {
        items = [];
        for (var i = 0; i < Math.ceil(W / 14); i++) items.push(Math.floor(rand(-H / 16, 0)));
        ctx.fillStyle = col.bg;
        ctx.fillRect(0, 0, W, H);
      },
      draw: function () {
        ctx.fillStyle = rgba(col.bg, 0.16);
        ctx.fillRect(0, 0, W, H);
        ctx.font = "16px VT323, monospace";
        for (var i = 0; i < items.length; i++) {
          var y = items[i];
          ctx.fillStyle = Math.random() < 0.06 ? col.ink : col.a1;
          ctx.fillText(CHARS.charAt(Math.floor(Math.random() * CHARS.length)), i * 14, y * 16);
          items[i] = (y * 16 > H && Math.random() > 0.975) ? 0 : y + 1;
        }
      }
    },

    bubbles: {
      fps: 30,
      make: function (fresh) {
        return { x: rand(0, W), y: fresh ? rand(0, H) : H + 20, r: rand(2, 9), s: rand(0.3, 1.2), w: rand(0.2, 1), p: rand(0, 6.28) };
      },
      init: function () { items = []; for (var i = 0; i < density(46); i++) items.push(this.make(true)); },
      draw: function (t) {
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1.5;
        for (var i = 0; i < items.length; i++) {
          var b = items[i];
          b.y -= b.s;
          var x = b.x + Math.sin(b.p + t / 900) * 8 * b.w;
          if (b.y < -20) items[i] = this.make(false);
          ctx.strokeStyle = rgba(i % 3 ? col.a1 : col.a2, 0.55);
          ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, 6.283); ctx.stroke();
          ctx.fillStyle = rgba("#ffffff", 0.35);
          ctx.fillRect(Math.round(x - b.r * 0.4), Math.round(b.y - b.r * 0.5), 2, 2);
        }
      }
    },

    embers: {
      fps: 30,
      make: function (fresh) {
        return { x: rand(0, W), y: fresh ? rand(H * 0.3, H) : H + 5, z: Math.round(rand(2, 4)), s: rand(0.6, 2), d: rand(-0.4, 0.4), life: rand(0.6, 1), c: Math.random() < 0.6 ? "a1" : "a2" };
      },
      init: function () { items = []; for (var i = 0; i < density(80); i++) items.push(this.make(true)); },
      draw: function () {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < items.length; i++) {
          var e = items[i];
          e.y -= e.s; e.x += e.d + rand(-0.3, 0.3);
          var a = Math.max(0, Math.min(1, (e.y / H) * 1.4)) * e.life * (0.6 + Math.random() * 0.4);
          if (e.y < -10 || a <= 0.02) { items[i] = this.make(false); continue; }
          ctx.fillStyle = rgba(col[e.c], a);
          ctx.fillRect(Math.round(e.x), Math.round(e.y), e.z, e.z);
        }
      }
    },

    petals: {
      fps: 30,
      make: function (fresh) {
        return { x: rand(-W * 0.2, W), y: fresh ? rand(0, H) : -12, w: rand(5, 9), h: rand(3, 5), s: rand(0.5, 1.3), d: rand(0.3, 0.9), r: rand(0, 6.28), v: rand(-0.03, 0.03), p: rand(0, 6.28) };
      },
      init: function () { items = []; for (var i = 0; i < density(34); i++) items.push(this.make(true)); },
      draw: function (t) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < items.length; i++) {
          var p = items[i];
          p.y += p.s; p.x += p.d + Math.sin(p.p + t / 1100) * 0.6; p.r += p.v;
          if (p.y > H + 12 || p.x > W + 20) { items[i] = this.make(false); continue; }
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.fillStyle = i % 2 ? "rgba(255,143,177,0.75)" : "rgba(255,194,209,0.85)";
          ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.h, 0, 0, 6.283); ctx.fill();
          ctx.restore();
        }
      }
    },

    snow: {
      fps: 30,
      make: function (fresh) {
        return { x: rand(0, W), y: fresh ? rand(0, H) : -6, z: Math.round(rand(2, 4)), s: rand(0.4, 1.4), p: rand(0, 6.28) };
      },
      init: function () { items = []; for (var i = 0; i < density(110); i++) items.push(this.make(true)); },
      draw: function (t) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < items.length; i++) {
          var f = items[i];
          f.y += f.s; f.x += Math.sin(f.p + t / 1300) * 0.4;
          if (f.y > H + 6) { items[i] = this.make(false); continue; }
          ctx.fillStyle = f.z > 3 ? rgba(col.a2, 0.7) : "rgba(124,196,255,0.85)";
          ctx.fillRect(Math.round(f.x), Math.round(f.y), f.z, f.z);
        }
      }
    },

    stars: {
      fps: 24,
      init: function () {
        items = [];
        for (var i = 0; i < density(170); i++) items.push({ x: rand(0, W), y: rand(0, H), z: Math.random() < 0.15 ? 2 : 1, p: rand(0, 6.28), s: rand(0.6, 2) });
        this.shoot = null;
        this.next = 0;
      },
      draw: function (t) {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < items.length; i++) {
          var s = items[i];
          ctx.fillStyle = rgba(i % 7 ? col.ink : col.a2, 0.25 + 0.75 * Math.abs(Math.sin(s.p + t / 1000 * s.s)));
          ctx.fillRect(Math.round(s.x), Math.round(s.y), s.z, s.z);
        }
        if (!this.shoot && t > this.next) this.shoot = { x: rand(W * 0.2, W), y: rand(0, H * 0.4), l: 0 };
        if (this.shoot) {
          var sh = this.shoot;
          sh.l += 0.04;
          var x = sh.x - sh.l * 260, y = sh.y + sh.l * 120;
          var g = ctx.createLinearGradient(x, y, x + 80, y - 37);
          g.addColorStop(0, rgba(col.ink, 0.9)); g.addColorStop(1, rgba(col.ink, 0));
          ctx.strokeStyle = g; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 80, y - 37); ctx.stroke();
          if (sh.l > 1) { this.shoot = null; this.next = t + rand(4000, 9000); }
        }
      }
    }
  };

  /* ---------- engine ---------- */
  function readColors() {
    col = { bg: css("--bg") || "#000000", a1: css("--a1") || "#00f0ff", a2: css("--a2") || "#ff2bd6", ink: css("--ink") || "#ffffff" };
  }

  function resize() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    if (mode) MODES[mode].init();
  }

  function held() {
    for (var k in holds) if (holds[k]) return true;
    return false;
  }

  function frame(t) {
    raf = 0;
    if (!mode || held()) return;
    var m = MODES[mode];
    if (t - lastFrame >= 1000 / m.fps - 2) {
      lastFrame = t;
      m.draw(t);
    }
    raf = requestAnimationFrame(frame);
  }

  function run() {
    if (raf || !mode || held() || reduce) return;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  window.MMCFX = {
    // mode: one of the effect names, or null for none. on: the Effects setting.
    set: function (newMode, on) {
      if (!canvas) {
        var host = document.querySelector(".bg");
        if (!host) return;
        canvas = document.createElement("canvas");
        canvas.className = "fx";
        canvas.setAttribute("aria-hidden", "true");
        host.appendChild(canvas);
        ctx = canvas.getContext("2d");
        window.addEventListener("resize", resize);
        document.addEventListener("visibilitychange", function () {
          holds.hidden = document.visibilityState !== "visible";
          if (holds.hidden) stop(); else run();
        });
      }
      stop();
      mode = on && MODES[newMode] ? newMode : null;
      readColors();
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, W, H);
      canvas.hidden = !mode;
      if (mode) { MODES[mode].init(); run(); }
    },
    // hold("player", true) pauses the background until hold("player", false)
    hold: function (reason, on) {
      holds[reason] = !!on;
      if (held()) stop(); else run();
    }
  };
})();
