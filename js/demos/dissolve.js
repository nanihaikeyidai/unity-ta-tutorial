/* Dissolve effect with noise */
(function () {
  "use strict";
  function mount() {
    const canvas = document.getElementById("demo-dissolve");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const slider = document.getElementById("dissolve-amount");
    const label = document.getElementById("dissolve-label");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w, h, noise;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width | 0;
      h = rect.height | 0;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      // build noise once per size
      noise = new Float32Array(w * h);
      for (let i = 0; i < noise.length; i++) {
        noise[i] = Math.random();
      }
      // blur-ish: average neighbors (cheap)
      const tmp = new Float32Array(noise.length);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let s = 0;
          for (let oy = -1; oy <= 1; oy++)
            for (let ox = -1; ox <= 1; ox++)
              s += noise[(y + oy) * w + (x + ox)];
          tmp[y * w + x] = s / 9;
        }
      }
      noise = tmp;
    }

    let auto = 0;
    function draw() {
      auto += 0.004;
      let amount = slider ? +slider.value : 0.5;
      if (!slider || document.activeElement !== slider) {
        // gentle auto cycle when not dragging
        if (!slider || !slider.matches(":active")) {
          amount = 0.5 + 0.45 * Math.sin(auto);
          if (slider) slider.value = amount;
        }
      }
      if (label) label.textContent = "Dissolve " + amount.toFixed(2);

      const cw = canvas.width;
      const ch = canvas.height;
      const img = ctx.createImageData(cw, ch);
      const data = img.data;
      const edge = 0.06;

      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          const sx = ((x / dpr) | 0);
          const sy = ((y / dpr) | 0);
          const n = noise[Math.min(sy, h - 1) * w + Math.min(sx, w - 1)] || 0;
          const i = (y * cw + x) * 4;
          // shape: rounded rect "card"
          const nx = (sx / w) * 2 - 1;
          const ny = (sy / h) * 2 - 1;
          const inShape = Math.abs(nx) < 0.55 && Math.abs(ny) < 0.55 &&
            (Math.abs(nx) < 0.45 || Math.abs(ny) < 0.45 || (Math.abs(nx) - 0.45) ** 2 + (Math.abs(ny) - 0.45) ** 2 < 0.01);

          data[i] = 5;
          data[i + 1] = 8;
          data[i + 2] = 15;
          data[i + 3] = 255;

          if (!inShape) continue;

          if (n > amount + edge) {
            // solid body — violet/cyan material
            const shade = 0.4 + 0.3 * (1 - Math.abs(nx)) + 0.2 * (1 - Math.abs(ny));
            data[i] = (60 * shade) | 0;
            data[i + 1] = (100 * shade) | 0;
            data[i + 2] = (180 * shade) | 0;
          } else if (n > amount) {
            // burn edge
            const f = (n - amount) / edge;
            data[i] = (255 * (1 - f * 0.3)) | 0;
            data[i + 1] = (180 * f + 80) | 0;
            data[i + 2] = (40 + 200 * f) | 0;
          }
          // else dissolved (bg already set)
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#64748b";
      ctx.font = "11px Inter, system-ui";
      ctx.fillText("clip(noise - threshold) + 边缘发光带", 12, 20);

      requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", () => {
      resize();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else mount();
})();
