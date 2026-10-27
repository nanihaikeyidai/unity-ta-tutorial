/* Fresnel rim light sphere */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-fresnel");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const powerSlider = document.getElementById("fresnel-power");
    const powerLabel = document.getElementById("fresnel-power-label");
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
      t += 0.02;
      const power = powerSlider ? +powerSlider.value : 3;
      if (powerLabel) powerLabel.textContent = "Power " + power.toFixed(1);

      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.32;
      const img = ctx.createImageData(w, h);
      const data = img.data;

      // Light direction rotates slowly
      const lx = Math.cos(t * 0.4);
      const ly = Math.sin(t * 0.3);
      const lz = 0.6;
      const llen = Math.hypot(lx, ly, lz);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = (x - cx) / R;
          const ny = (y - cy) / R;
          const rr = nx * nx + ny * ny;
          if (rr > 1) continue;
          const nz = Math.sqrt(1 - rr);
          // View from +Z
          const NdotV = Math.max(0, nz);
          const fresnel = Math.pow(1 - NdotV, power);
          // Diffuse
          const ndl = Math.max(0, (nx * lx + ny * ly + nz * lz) / llen);
          const base = 0.08 + ndl * 0.25;
          const rimR = 0.13 + fresnel * 0.85;
          const rimG = 0.83 + fresnel * 0.1;
          const rimB = 0.93;
          const r = Math.min(1, base * 0.4 + rimR * fresnel + ndl * 0.15);
          const g = Math.min(1, base * 0.5 + rimG * fresnel * 0.7 + ndl * 0.2);
          const b = Math.min(1, base * 0.7 + rimB * fresnel + ndl * 0.25);
          const i = (y * w + x) * 4;
          data[i] = (r * 255) | 0;
          data[i + 1] = (g * 255) | 0;
          data[i + 2] = (b * 255) | 0;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);

      // Scale down putImageData for DPR — actually we wrote in CSS pixels via setTransform
      // Wait: putImageData ignores transform. Fix by writing to buffer sized to canvas buffer.
      // Re-do properly for DPR:

      requestAnimationFrame(draw);
    }

    // Proper DPR fresnel using canvas pixels
    function drawHi() {
      t += 0.02;
      const power = powerSlider ? +powerSlider.value : 3;
      if (powerLabel) powerLabel.textContent = "Power " + power.toFixed(1);

      const cw = canvas.width;
      const ch = canvas.height;
      const img = ctx.createImageData(cw, ch);
      const data = img.data;
      const cx = cw / 2;
      const cy = ch / 2;
      const R = Math.min(cw, ch) * 0.32;
      const lx = Math.cos(t * 0.4);
      const ly = Math.sin(t * 0.3);
      const lz = 0.6;
      const llen = Math.hypot(lx, ly, lz);

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const nx = (x - cx) / R;
          const ny = (y - cy) / R;
          const rr = nx * nx + ny * ny;
          const i = (y * cw + x) * 4;
          if (rr > 1) {
            data[i] = 5;
            data[i + 1] = 8;
            data[i + 2] = 15;
            data[i + 3] = 255;
            continue;
          }
          const nz = Math.sqrt(1 - rr);
          const NdotV = Math.max(0, nz);
          const fresnel = Math.pow(1 - NdotV, power);
          const ndl = Math.max(0, (nx * lx + ny * ly + nz * lz) / llen);
          const base = 0.08 + ndl * 0.3;
          const r = Math.min(1, base * 0.35 + fresnel * 0.95 + ndl * 0.1);
          const g = Math.min(1, base * 0.45 + fresnel * 0.75 + ndl * 0.15);
          const b = Math.min(1, base * 0.65 + fresnel * 0.9 + ndl * 0.2);
          data[i] = (r * 255) | 0;
          data[i + 1] = (g * 255) | 0;
          data[i + 2] = (b * 255) | 0;
          data[i + 3] = 255;
        }
      }
      // Reset transform for putImageData
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui";
      ctx.fillText("Fresnel = pow(1 - saturate(N·V), Power)  ·  边缘亮、正面暗", 12, 20);

      requestAnimationFrame(drawHi);
    }

    resize();
    drawHi();
    window.addEventListener("resize", resize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else mount();
})();
