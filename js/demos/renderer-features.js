/* Renderer Feature stack — visual layers stacking */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-rf");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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

    const layers = [
      { name: "Opaque Pass", color: "#22d3ee" },
      { name: "Custom: Outline", color: "#a78bfa" },
      { name: "Skybox", color: "#60a5fa" },
      { name: "Transparent", color: "#34d399" },
      { name: "Blit: Bloom", color: "#f472b6" },
    ];

    function draw() {
      t += 0.016;
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const baseY = h * 0.72;
      layers.forEach((L, i) => {
        const lift = Math.sin(t * 1.2 + i * 0.7) * 4;
        const y = baseY - i * 28 + lift;
        const ww = Math.min(280, w * 0.55) + i * 8;
        const hh = 36;
        // shadow
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        roundRect(ctx, cx - ww / 2 + 4, y + 6, ww, hh, 8);
        ctx.fill();
        // card
        ctx.fillStyle = "rgba(17,24,39,0.92)";
        ctx.strokeStyle = L.color;
        ctx.lineWidth = 1.5;
        roundRect(ctx, cx - ww / 2, y, ww, hh, 8);
        ctx.fill();
        ctx.stroke();
        // glow bar
        ctx.fillStyle = L.color;
        ctx.globalAlpha = 0.85;
        roundRect(ctx, cx - ww / 2, y, 6, hh, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#e5e7eb";
        ctx.font = "600 12px Inter, system-ui, sans-serif";
        ctx.fillText(L.name, cx - ww / 2 + 16, y + 23);
        ctx.fillStyle = L.color;
        ctx.font = "10px JetBrains Mono, monospace";
        ctx.fillText("RF #" + i, cx + ww / 2 - 42, y + 23);
      });

      // camera icon label
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("URP Renderer Feature Stack  ·  从上到下注入 Pass", cx, 28);
      ctx.textAlign = "left";

      requestAnimationFrame(draw);
    }

    function roundRect(c, x, y, ww, hh, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + ww, y, x + ww, y + hh, r);
      c.arcTo(x + ww, y + hh, x, y + hh, r);
      c.arcTo(x, y + hh, x, y, r);
      c.arcTo(x, y, x + ww, y, r);
      c.closePath();
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else mount();
})();
