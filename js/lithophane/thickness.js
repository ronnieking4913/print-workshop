// Step 2: how thick the plastic is at every grid point. Dark parts of the picture are thick and
// block the light; light parts are thin and glow. Outside the picture's shape is solid frame,
// and the words (if any) are cut thin into a strip of frame under the picture, so they glow.
window.LM = window.LM || {};

LM.thickness = (() => {
  const WORDS_STRIP = 11; // height of the strip for the words, above the bottom frame, mm
  const WORDS_SIZE = 7.5; // height of the letters, mm
  const FADE = 2.5;       // width of the soft edge, mm

  // Where the picture goes on the panel, in mm from its bottom-left corner: inside the frame,
  // and above the words.
  function region(o) {
    const bottom = o.frame + (o.text ? WORDS_STRIP : 0);
    return { x: o.frame, y: bottom, w: o.width - 2 * o.frame, h: o.height - o.frame - bottom };
  }

  // The panel's height in mm that fits a picture of this shape (aspect = width / height) across
  // the whole Width, with the frame (and the words) around it. The reverse of region.
  function heightFor(o, aspect) {
    return (o.width - 2 * o.frame) / aspect + 2 * o.frame + (o.text ? WORDS_STRIP : 0);
  }

  // Brightness after Brightness, Contrast and Midtones. g and the result go from 0 (black) to 1 (white).
  function tone(g, o) {
    const b = Math.min(1, Math.max(0, (g - 0.5) * o.contrast + 0.5 + o.brightness));
    return b ** (2 ** -o.midtones); // midtones above 0 lighten the middle greys and leave black and white alone
  }

  // The picture's shape and the words, drawn at grid size. Returns two arrays, row by row from
  // the bottom like the thickness map: how much of the picture shows (0 to 1), and how much of
  // each point is part of a letter (0 to 1).
  function masks(o, cols, rows, dx, dz) {
    const c = document.createElement("canvas"); c.width = cols; c.height = rows;
    const g = c.getContext("2d", { willReadFrequently: true });
    const read = () => {
      const d = g.getImageData(0, 0, cols, rows).data, out = new Float32Array(cols * rows);
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++)
        out[row * cols + col] = d[((rows - 1 - row) * cols + col) * 4] / 255; // the canvas starts at the top
      return out;
    };
    // mm to canvas pixels, so each grid point lands on the middle of its pixel
    const r = region(o), X = mm => mm / dx + 0.5, Y = mm => (o.height - mm) / dz + 0.5;

    g.fillStyle = "#fff";
    // a soft edge is a blurred shape, pulled in by half the fade so the fade stays inside the picture area
    const fade = o.soft ? FADE / dx : 0;
    LM.shapes.path(g, o.shape, X(r.x) + fade / 2, Y(r.y + r.h) + fade / 2, r.w / dx - fade, r.h / dz - fade);
    g.fill();
    const shape = read();
    if (o.soft) for (let pass = 0; pass < 2; pass++) blur(shape, cols, rows, Math.max(1, Math.round(fade / 4)));

    let words = null;
    if (o.text) {
      g.clearRect(0, 0, cols, rows);
      g.textAlign = "center"; g.textBaseline = "middle";
      const font = size => `700 ${size}px "Segoe UI", Arial, sans-serif`;
      let size = WORDS_SIZE / dz;
      g.font = font(size);
      const room = (r.w - 2) / dx; // shrink long words to fit inside the frame
      if (g.measureText(o.text).width > room) { size *= room / g.measureText(o.text).width; g.font = font(size); }
      g.fillText(o.text, X(o.width / 2), Y(o.frame + WORDS_STRIP / 2));
      words = read();
    }
    return { shape, words };
  }

  // Averages every point with its neighbors up to k points away, across and then up (a box blur), in place.
  function blur(a, cols, rows, k) {
    const tmp = new Float32Array(a.length);
    const pass = (from, to, n, lines, stride, step) => {
      for (let line = 0; line < lines; line++) for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let d = -k; d <= k; d++) sum += from[line * stride + Math.min(n - 1, Math.max(0, i + d)) * step];
        to[line * stride + i * step] = sum / (2 * k + 1);
      }
    };
    pass(a, tmp, cols, rows, cols, 1);
    pass(tmp, a, rows, cols, 1, cols);
  }

  // p: picture (LM.picture.read), view: { zoom, cx, cy }, o: settings in mm, res: grid spacing in mm.
  // Returns { cols, rows, t }: t is row by row from the bottom, each row left to right as seen from the front.
  function build(p, view, o, res) {
    const cols = Math.max(2, Math.round(o.width / res) + 1), rows = Math.max(2, Math.round(o.height / res) + 1);
    const dx = o.width / (cols - 1), dz = o.height / (rows - 1), f = o.frame;
    const r = region(o), crop = LM.picture.crop(p, r.w / r.h, view);
    const { shape, words } = masks(o, cols, rows, dx, dz);
    // Sharpness compares each point with its neighbors one grid step away, in picture pixels.
    const step = (crop.w / r.w) * dx, sharp = o.sharpness;
    const t = new Float32Array(cols * rows);
    for (let row = 0; row < rows; row++) {
      const z = row * dz, frameRow = z < f || z > o.height - f;
      for (let col = 0; col < cols; col++) {
        const s = col * dx, i = row * cols + col;
        let thick = o.maxT;
        if (!frameRow && s >= f && s <= o.width - f) {
          if (shape[i] > 0) {
            const x = crop.x + ((s - r.x) / r.w) * crop.w, y = crop.y + (1 - (z - r.y) / r.h) * crop.h;
            let g = LM.picture.sample(p, x, y);
            if (sharp > 0) {
              const around = (LM.picture.sample(p, x - step, y) + LM.picture.sample(p, x + step, y) +
                LM.picture.sample(p, x, y - step) + LM.picture.sample(p, x, y + step)) / 4;
              g += sharp * (g - around);
            }
            const picture = o.minT + (1 - tone(g, o)) * (o.maxT - o.minT);
            thick += shape[i] * (picture - thick);
          }
          if (words && words[i] > 0) thick += words[i] * (o.minT - thick);
        }
        t[i] = thick;
      }
    }
    return { cols, rows, t };
  }

  // Brightness, Contrast and Midtones that make the part of the picture that shows use the
  // full range from dark to light, with faces and other middle greys slightly on the light side.
  function auto(p, view, aspect) {
    const crop = LM.picture.crop(p, aspect, view), n = 160, values = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++)
      values.push(LM.picture.sample(p, crop.x + ((i + 0.5) / n) * crop.w, crop.y + ((j + 0.5) / n) * crop.h));
    values.sort((a, b) => a - b);
    const at = q => values[Math.floor(q * (values.length - 1))];
    const lo = at(0.01), hi = at(0.99);
    const contrast = Math.min(3, Math.max(0.5, 1 / Math.max(hi - lo, 1e-3)));
    const brightness = Math.min(0.6, Math.max(-0.6, -((lo + hi) / 2 - 0.5) * contrast));
    // Midtones: bring the middle of the picture to 0.55 (a lithophane looks darker than a photo)
    const mid = tone(at(0.5), { contrast, brightness, midtones: 0 });
    const midtones = mid > 0.01 && mid < 0.99 ? Math.min(1, Math.max(-1, -Math.log2(Math.log(0.55) / Math.log(mid)))) : 0;
    return { brightness, contrast, midtones };
  }

  return { build, region, heightFor, auto, tone };
})();
