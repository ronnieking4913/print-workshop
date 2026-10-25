// Shared helpers for the Lithophane Maker tests (the runner itself is ../runner.js).
const LT = (() => {
  // Default settings, same as the page's defaults. Override any of them per test.
  const settings = over => ({
    zoom: 1, brightness: 0, contrast: 1, midtones: 0, sharpness: 0.45, shape: "rect", soft: false, text: "",
    width: 136, height: 105, frame: 7.5, minT: 0.5, maxT: 2.8, res: 0.25,
    distance: 30, curved: true, radius: 80, ...over,
  });

  // A picture made of brightness values (0 = black, 1 = white), row by row from the top.
  const picture = (W, H, values) => ({ W, H, gray: Float32Array.from(values) });
  const plain = value => picture(1, 1, [value]);
  const center = { zoom: 1, cx: 0.5, cy: 0.5 };

  // Space enclosed by the mesh, in mm³. Positive when every face points outwards.
  function volume(mesh) {
    const { pos, idx } = mesh;
    let v = 0;
    for (let t = 0; t < idx.length; t += 3) {
      const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
      v += (pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
          - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
          + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c])) / 6;
    }
    return v;
  }

  // Lowest and highest value of one coordinate (0 = X, 1 = Y, 2 = Z) over every point.
  function range(mesh, axis) {
    let lo = Infinity, hi = -Infinity;
    for (let i = axis; i < mesh.pos.length; i += 3) { lo = Math.min(lo, mesh.pos[i]); hi = Math.max(hi, mesh.pos[i]); }
    return [lo, hi];
  }

  return { settings, picture, plain, center, volume, range };
})();
