/* SRP Batcher vs no-batch draw call meter */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-batcher");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const toggle = document.getElementById("batcher-toggle");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, t = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      t += 0.05;
      const batched = toggle ? toggle.checked : true;
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, w, h);

      const objects = 24;
      const drawCalls = batched ? 2 : objects;
      const cpuBar = batched ? 0.22 : 0.85;
      const pulse = 0.5 + 0.5 * Math.sin(t * (batched ? 1 : 4));

      // Objects grid
      const cols = 8;
      const size = Math.min(28, (w - 40) / cols - 6);
      for (let i = 0; i < objects; i++) {
        const col = i % cols;
        const row = (i / cols) | 0;
        const x = 24 + col * (size + 8);
        const y = 50 + row * (size + 8);
        ctx.fillStyle = batched ? "#22d3ee" : `hsl(${(i * 37 + t * 40) % 360},70%,60%)`;
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t + i);
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(x, y, size, size, 6)
          : ctx.rect(x, y, size, size);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Meters
      const mx = w * 0.55;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Inter, system-ui";
      ctx.fillText("SetPass / Draw Calls", mx, 48);
      ctx.fillStyle = "#111827";
      ctx.fillRect(mx, 58, w * 0.38, 18);
      ctx.fillStyle = batched ? "#22d3ee" : "#f87171";
      ctx.fillRect(mx, 58, w * 0.38 * (drawCalls / objects), 18);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "bold 14px JetBrains Mono, monospace";
      ctx.fillText(String(drawCalls), mx + w * 0.38 + 10, 72);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px Inter, system-ui";
      ctx.fillText("CPU 提交开销 (示意)", mx, 108);
      ctx.fillStyle = "#111827";
      ctx.fillRect(mx, 118, w * 0.38, 18);
      ctx.fillStyle = batched ? "#34d399" : "#fbbf24";
      ctx.fillRect(mx, 118, w * 0.38 * cpuBar * (0.85 + 0.15 * pulse), 18);

      ctx.fillStyle = batched ? "#34d399" : "#f87171";
      ctx.font = "600 13px Inter, system-ui";
      ctx.fillText(
        batched ? "SRP Batcher ON · 同 Shader Variant 合并" : "Batcher OFF · 每物体一次 SetPass",
        24,
        h - 20
      );

      requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else mount();
})();
