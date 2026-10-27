/* Animated URP Forward+ pipeline diagram */
(function () {
  "use strict";
  const stages = [
    "Culling",
    "Shadow Maps",
    "Depth Prepass",
    "Cluster Lights",
    "Opaque",
    "Skybox",
    "Transparent",
    "Post FX",
  ];

  function mount(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "pipeline";
    const nodes = [];
    const arrows = [];

    stages.forEach((name, i) => {
      if (i > 0) {
        const ar = document.createElement("span");
        ar.className = "pipe-arrow";
        ar.textContent = "→";
        wrap.appendChild(ar);
        arrows.push(ar);
      }
      const n = document.createElement("div");
      n.className = "pipe-node";
      n.textContent = name;
      wrap.appendChild(n);
      nodes.push(n);
    });
    root.appendChild(wrap);

    let idx = -1;
    function tick() {
      idx = (idx + 1) % stages.length;
      nodes.forEach((n, i) => n.classList.toggle("active", i <= idx));
      arrows.forEach((a, i) => a.classList.toggle("active", i < idx));
    }
    tick();
    setInterval(tick, 900);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount("demo-pipeline"));
  } else {
    mount("demo-pipeline");
  }
})();
