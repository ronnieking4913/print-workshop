// Step 1: read the picture as brightness (0 = black, 1 = white), turn it, and work out which part shows.
window.LM = window.LM || {};

LM.picture = (() => {
  const MAX_SIDE = 2000; // more pixels than this add nothing at print resolution

  // img: an <img> or a canvas. Browsers already turn phone photos upright when drawing them.
  function read(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const k = Math.min(1, MAX_SIDE / Math.max(w, h));
    const W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k));
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); // transparent parts count as white, so they glow
    g.drawImage(img, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data, gray = new Float32Array(W * H);
    for (let i = 0; i < gray.length; i++)
      gray[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    return { W, H, gray, canvas: c }; // canvas: the picture in color, for the Picture preview
  }

  // A quarter turn clockwise.
  function rotate(p) {
    const W = p.H, H = p.W, gray = new Float32Array(p.gray.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gray[y * W + x] = p.gray[(p.H - 1 - x) * p.W + y];
    if (!p.canvas) return { W, H, gray };
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.translate(W, 0); g.rotate(Math.PI / 2); g.drawImage(p.canvas, 0, 0);
    return { W, H, gray, canvas: c };
  }

  // Brightness at x, y in pixels (pixel k covers k to k+1), blended between neighboring pixels.
  function sample(p, x, y) {
    const fx = Math.min(Math.max(x - 0.5, 0), p.W - 1), fy = Math.min(Math.max(y - 0.5, 0), p.H - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, p.W - 1), y1 = Math.min(y0 + 1, p.H - 1);
    const tx = fx - x0, ty = fy - y0, g = p.gray;
    const top = g[y0 * p.W + x0] * (1 - tx) + g[y0 * p.W + x1] * tx;
    const bottom = g[y1 * p.W + x0] * (1 - tx) + g[y1 * p.W + x1] * tx;
    return top * (1 - ty) + bottom * ty;
  }

  // The part of the picture that shows, in pixels: the biggest area with the panel's shape
  // (aspect = width / height), shrunk by view.zoom, centred on view.cx, view.cy (fractions of
  // the picture) but kept inside the picture.
  function crop(p, aspect, view) {
    let w, h;
    if (p.W / p.H > aspect) { h = p.H; w = h * aspect; } else { w = p.W; h = w / aspect; }
    const zoom = Math.max(1, view.zoom || 1);
    w /= zoom; h /= zoom;
    const cx = Math.min(Math.max(view.cx * p.W, w / 2), p.W - w / 2);
    const cy = Math.min(Math.max(view.cy * p.H, h / 2), p.H - h / 2);
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }

  // Move the picture by a fraction of the part that shows (dx, dy), as if dragging it.
  // Returns the new view, kept inside the picture.
  function pan(p, aspect, view, dx, dy) {
    const r = crop(p, aspect, view);
    // dragging the picture right shows more of its left side
    const moved = { ...view, cx: (r.x + r.w / 2 - dx * r.w) / p.W, cy: (r.y + r.h / 2 - dy * r.h) / p.H };
    const c = crop(p, aspect, moved);
    return { ...moved, cx: (c.x + c.w / 2) / p.W, cy: (c.y + c.h / 2) / p.H };
  }

  // The view whose crop is box (in pixels, with the panel's shape), for resizing the box by its
  // edges. A box bigger than the picture allows comes back as big as it can be (zoom 1).
  function fit(p, aspect, box) {
    const full = crop(p, aspect, { cx: 0.5, cy: 0.5, zoom: 1 });
    return { cx: (box.x + box.w / 2) / p.W, cy: (box.y + box.h / 2) / p.H, zoom: Math.max(1, full.w / box.w) };
  }

  return { read, rotate, sample, crop, pan, fit };
})();
