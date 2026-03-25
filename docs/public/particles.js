(function () {
  "use strict";

  var BARS = 48, BAR_WIDTH = 3, BAR_GAP = 2, MAX_BAR_H = 60;

  var WAVE_TRACES = [
    { yFrac: 0.20, amp: 18, freq: 0.012, speed: 0.6, opacity: 0.08 },
    { yFrac: 0.50, amp: 28, freq: 0.008, speed: 1.0, opacity: 0.10 },
    { yFrac: 0.82, amp: 14, freq: 0.015, speed: 0.5, opacity: 0.06 },
  ];

  var CHIPS_DATA = [
    { label: "\u266a Blinding Lights",  dot: "#a855f7" },
    { label: "\ud83c\udfb5 Anti-Hero",  dot: "#ec4899" },
    { label: "\u266b Shape of You",     dot: "#3b82f6" },
    { label: "\ud83c\udfa7 93.7h listened", dot: "#10b981" },
    { label: "\ud83d\udd25 90 day streak",  dot: "#f59e0b" },
    { label: "\ud83c\udfa4 14 artists",     dot: "#6366f1" },
    { label: "\u266a Cruel Summer",     dot: "#06b6d4" },
    { label: "\ud83d\udcca 1,796 plays",    dot: "#ef4444" },
    { label: "\ud83c\udfb5 25 tracks",      dot: "#8b5cf6" },
    { label: "\u266b pop \u00b7 r&b",       dot: "#f97316" },
  ];

  var CHIP_GAP = 3000, PULSE_GAP = 2800, CHIP_LIFE = 240;
  var MAX_CHIPS = 5, MAX_PULSES = 4;
  var canvas, ctx, W, H, dpr = 1;
  var scrolls = [0, 0, 0], chips = [], pulses = [];
  var chipMs = 0, pulseMs = 0, lastTs = 0, barPhases = [];
  for (var i = 0; i < BARS; i++) barPhases.push(Math.random() * Math.PI * 2);

  function dark() { return document.documentElement.getAttribute("data-theme") !== "light"; }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }

  function drawWaves(dt) {
    var color = dark() ? "#a855f7" : "#7c3aed";
    WAVE_TRACES.forEach(function (tr, i) {
      scrolls[i] += tr.speed * dt / 16.67;
      var cy = tr.yFrac * H;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.lineJoin = "round"; ctx.globalAlpha = tr.opacity; ctx.beginPath();
      for (var px = 0; px <= W; px += 2) {
        var phase = scrolls[i] + px * tr.freq;
        var y = cy + Math.sin(phase) * tr.amp * (0.5 + 0.5 * Math.sin(phase * 0.3));
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke(); ctx.restore();
    });
  }

  function drawEQ(t) {
    var totalW = BARS * (BAR_WIDTH + BAR_GAP);
    var startX = (W - totalW) / 2, baseY = H * 0.92;
    var color = dark() ? "#a855f7" : "#7c3aed";
    ctx.save();
    for (var i = 0; i < BARS; i++) {
      var h = (0.3 + 0.7 * Math.abs(Math.sin(t * 0.002 + barPhases[i])))
            * (0.4 + 0.6 * Math.sin(t * 0.001 + i * 0.2)) * MAX_BAR_H;
      h = Math.max(2, Math.abs(h));
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 0.003 + i);
      ctx.fillRect(startX + i * (BAR_WIDTH + BAR_GAP), baseY - h, BAR_WIDTH, h);
    }
    ctx.restore();
  }

  function drawPulses(dt) {
    pulseMs += dt;
    if (pulseMs >= PULSE_GAP && pulses.length < MAX_PULSES) {
      pulses.push({ x: W * (0.15 + Math.random() * 0.7), y: H * (0.15 + Math.random() * 0.7),
        r: 0, maxR: 40 + Math.random() * 60, speed: 0.6 + Math.random() * 0.6 });
      pulseMs = 0;
    }
    var color = dark() ? "#a855f7" : "#7c3aed";
    pulses = pulses.filter(function (p) { return p.r < p.maxR; });
    pulses.forEach(function (p) {
      p.r += p.speed * dt / 16.67;
      ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.globalAlpha = (1 - p.r / p.maxR) * 0.25;
      ctx.stroke(); ctx.restore();
    });
  }

  function drawChips(dt) {
    chipMs += dt;
    if (chipMs >= CHIP_GAP && chips.length < MAX_CHIPS) {
      var v = CHIPS_DATA[Math.floor(Math.random() * CHIPS_DATA.length)];
      chips.push({ label: v.label, dot: v.dot,
        x: W * (0.06 + Math.random() * 0.88), y: H * (0.60 + Math.random() * 0.28),
        vy: -(0.25 + Math.random() * 0.35), age: 0 });
      chipMs = 0;
    }
    var textClr = dark() ? "#e9d5ff" : "#581c87";
    var bgClr = dark() ? "rgba(20,10,40,0.75)" : "rgba(245,240,255,0.88)";
    var bdClr = dark() ? "rgba(168,85,247,0.40)" : "rgba(124,58,237,0.25)";
    chips = chips.filter(function (c) { return c.age < CHIP_LIFE; });
    chips.forEach(function (c) {
      c.age += dt / 16.67; c.y += c.vy * (dt / 16.67);
      var p = c.age / CHIP_LIFE;
      var a = p < 0.15 ? p / 0.15 : p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
      ctx.save(); ctx.globalAlpha = a * 0.9;
      ctx.font = "12px system-ui, sans-serif";
      var tw = ctx.measureText(c.label).width, pw = tw + 28, ph = 26;
      var rx = c.x - pw / 2, ry = c.y - ph / 2;
      ctx.fillStyle = bgClr; ctx.strokeStyle = bdClr; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(rx, ry, pw, ph, 13); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx + 12, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = c.dot; ctx.fill();
      ctx.fillStyle = textClr; ctx.fillText(c.label, rx + 22, c.y + 4);
      ctx.restore();
    });
  }

  function frame(ts) {
    var dt = lastTs ? ts - lastTs : 16; lastTs = ts;
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    drawWaves(dt); drawEQ(ts); drawPulses(dt); drawChips(dt);
    ctx.restore(); requestAnimationFrame(frame);
  }

  function init() {
    canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:0;pointer-events:none;";
    document.body.prepend(canvas);
    ctx = canvas.getContext("2d");
    resize(); window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
