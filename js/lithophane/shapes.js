// Picture shapes: the outline of the part of the lithophane that shows the picture.
// Everything outside it is solid frame.
window.LM = window.LM || {};

LM.shapes = (() => {
  // The classic heart curve, scaled to fill a 0..1 box (y down).
  const heart = (() => {
    const pts = [];
    for (let i = 0; i < 240; i++) {
      const t = (2 * Math.PI * i) / 240;
      pts.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
    return { pts: pts.map(([x, y]) => [(x - x0) / w, (y - y0) / h]), aspect: w / h };
  })();

  // Starts a new canvas path with the shape fitted inside the box x, y, w, h (y down).
  // The oval fills the box; the heart keeps its own proportions and sits in the middle.
  function path(g, shape, x, y, w, h) {
    g.beginPath();
    if (shape === "oval") {
      g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === "heart") {
      const hw = Math.min(w, h * heart.aspect), hh = hw / heart.aspect;
      const hx = x + (w - hw) / 2, hy = y + (h - hh) / 2;
      heart.pts.forEach(([u, v], i) => (i ? g.lineTo(hx + u * hw, hy + v * hh) : g.moveTo(hx + u * hw, hy + v * hh)));
      g.closePath();
    } else {
      g.rect(x, y, w, h);
    }
  }

  return { path };
})();
