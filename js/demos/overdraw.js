/* Overdraw heat visualization */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-overdraw");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("overdraw-layers");
    const label = document.getElementById("overdraw-label");
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

    function heat(n) {
      // 0 = cool cyan, high = hot red/white
      const stops = [
        [0.1, 0.3, 0.5],
        [0.13, 0.83, 0.93],
        [0.2, 0.9, 0.4],
        [0.98, 0.75, 0.14],
        [0.97, 0.44, 0.44],
        [1, 1, 1],
      ];
      const x = Math.min(1, n / 8);
      const i = Math.min(stops.length - 2, Math.floor(x * (stops.length - 1)));
      const f = x * (stops.length - 1) - i;
      const a = stops[i], b = stops[i + 1];
      return [
        a[0] + (b[0] - a[0]) * f,
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
      ];
    }

    function draw() {
      t += 0.02;
      const layers = slider ? +slider.value : 4;
      if (label) label.textContent = layers + " 层透明叠加";

      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, w, h);

      // Grid of "pixels" — each counts how many quads cover it
      const cols = 48;
      const rows = 28;
      const cellW = w / cols;
      const cellH = h / rows;
      const cover = new Float32Array(cols * rows);

      for (let L = 0; L < layers; L++) {
        const cx = w * (0.3 + 0.1 * Math.sin(t * 0.7 + L) + L * 0.08);
        const cy = h * (0.35 + 0.08 * Math.cos(t * 0.5 + L * 0.4));
        const rw = w * (0.28 + L * 0.04);
        const rh = h * (0.32 + L * 0.03);
        const x0 = Math.max(0, Math.floor((cx - rw) / cellW));
        const x1 = Math.min(cols - 1, Math.floor((cx + rw) / cellW));
        const y0 = Math.max(0, Math.floor((cy - rh) / cellH));
        const y1 = Math.min(rows - 1, Math.floor((cy + rh) / cellH));
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const px = (x + 0.5) * cellW;
            const py = (y + 0.5) * cellH;
            if (
              ((px - cx) / rw) ** 2 + ((py - cy) / rh) ** 2 < 1
            ) {
              cover[y * cols + x] += 1;
            }
          }
        }
      }

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const n = cover[y * cols + x];
          if (n <= 0) continue;
          const [r, g, b] = heat(n);
          ctx.fillStyle = `rgb(${(r * 255) | 0},${(g * 255) | 0},${(b * 255) | 0})`;
          ctx.globalAlpha = 0.55 + Math.min(0.4, n * 0.08);
          ctx.fillRect(x * cellW + 0.5, y * cellH + 0.5, cellW - 1, cellH - 1);
        }
      }
      ctx.globalAlpha = 1;

      // Legend
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, system-ui";
      ctx.fillText("Overdraw 热力图 · 颜色越热 = 同像素被画次数越多", 14, 22);
      ctx.fillText("平均层数 ≈ " + (cover.reduce((a, b) => a + b, 0) / (cols * rows)).toFixed(2), 14, h - 14);

      requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    if (slider) slider.addEventListener("input", () => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else mount();
})();
