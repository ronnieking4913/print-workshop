// Step 2: how thick the plastic is at every grid point. Dark parts of the picture are thick and
// block the light; light parts are thin and glow. The frame around the picture is the full thickness.
window.LM = window.LM || {};

LM.thickness = (() => {
  // p: picture (LM.picture.read), view: { zoom, cx, cy }, o: settings in mm, res: grid spacing in mm.
  // Returns { cols, rows, t }: t is row by row from the bottom, each row left to right as seen from the front.
  function build(p, view, o, res) {
    const cols = Math.max(2, Math.round(o.width / res) + 1), rows = Math.max(2, Math.round(o.height / res) + 1);
    const dx = o.width / (cols - 1), dz = o.height / (rows - 1);
    const f = o.frame, iw = o.width - 2 * f, ih = o.height - 2 * f;
    const r = LM.picture.crop(p, iw / ih, view);
    const t = new Float32Array(cols * rows);
    for (let row = 0; row < rows; row++) {
      const z = row * dz, v = 1 - (z - f) / ih, frameRow = z < f || z > o.height - f;
      for (let col = 0; col < cols; col++) {
        const s = col * dx;
        let thick = o.maxT;
        if (!frameRow && s >= f && s <= o.width - f) {
          const g = LM.picture.sample(p, r.x + ((s - f) / iw) * r.w, r.y + v * r.h);
          const b = Math.min(1, Math.max(0, (g - 0.5) * o.contrast + 0.5 + o.brightness));
          thick = o.minT + (1 - b) * (o.maxT - o.minT);
        }
        t[row * cols + col] = thick;
      }
    }
    return { cols, rows, t };
  }

  return { build };
})();
