/* Normal map lighting on a plane */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-normal");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, t = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width | 0;
      h = rect.height | 0;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
    }

    // Procedural "brick" height → normal
    function heightAt(u, v) {
      const bx = ((u * 6) % 1);
      const by = ((v * 4 + ((u * 6) | 0) * 0.5) % 1);
      const mortar = bx < 0.08 || by < 0.08 ? 0 : 1;
      const brick = 0.15 + 0.1 * Math.sin(u * 40) * Math.cos(v * 30);
      return mortar * brick;
    }

    function draw() {
      t += 0.025;
      const cw = canvas.width;
      const ch = canvas.height;
      const img = ctx.createImageData(cw, ch);
      const data = img.data;

      const lx = Math.cos(t) * 0.8;
      const ly = Math.sin(t * 0.7) * 0.5;
      const lz = 0.7;
      const llen = Math.hypot(lx, ly, lz);
      const Lx = lx / llen, Ly = ly / llen, Lz = lz / llen;

      const step = dpr; // sample in css space roughly
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const u = x / cw;
          const v = y / ch;
          const eps = 0.004;
          const hC = heightAt(u, v);
          const hX = heightAt(u + eps, v);
          const hY = heightAt(u, v + eps);
          let nx = (hC - hX) * 12;
          let ny = (hC - hY) * 12;
          let nz = 1;
          const nlen = Math.hypot(nx, ny, nz);
          nx /= nlen; ny /= nlen; nz /= nlen;

          const ndl = Math.max(0.05, nx * Lx + ny * Ly + nz * Lz);
          const baseR = 0.55, baseG = 0.32, baseB = 0.22;
          const i = (y * cw + x) * 4;
          data[i] = Math.min(255, (baseR * ndl * 255 + nz * 20) | 0);
          data[i + 1] = Math.min(255, (baseG * ndl * 255 + nz * 15) | 0);
          data[i + 2] = Math.min(255, (baseB * ndl * 255 + nz * 10) | 0);
          data[i + 3] = 255;
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // light indicator
      ctx.beginPath();
      ctx.arc(w / 2 + lx * 60, h / 2 + ly * 40, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui";
      ctx.fillText("法线贴图改变 per-pixel 法线 · 几何仍是平面", 12, 20);

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
