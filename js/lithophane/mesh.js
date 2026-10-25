// Step 3: bend the thickness map around the light and turn it into a closed 3D mesh,
// with the mount (a strip with a slot that slides onto the night light) underneath.
//
// Coordinates in mm: X runs left to right as seen from the front, Z is up, the light is at the
// origin and the viewer stands at -Y. The front of the picture is smooth; the bumps face the light.
window.LM = window.LM || {};

LM.mesh = (() => {
  const OVERLAP = 0.3; // separate parts overlap this much so slicers merge them into one solid, mm

  const mountHeight = o => (o.mountOn ? o.slotD + o.adapter : 0);
  const mountDepth = o => 2 * o.slotWall + o.slotW;

  // Where a point of the flat layout ends up once the panel is bent around the light.
  // s: mm along the front from the middle (right is +), depth: mm in from the front, z: mm up.
  function bender(o) {
    if (!o.curved) return (s, depth, z) => [s, depth - o.distance, z];
    // the curve's centre is behind the front, so the picture bows out toward the viewer
    const R = o.radius, cy = R - o.distance;
    return (s, depth, z) => {
      const r = R - depth, a = s / R;
      return [r * Math.sin(a), cy - r * Math.cos(a), z];
    };
  }

  // A plain-English problem with the settings, or "" when they make a printable part.
  function check(o) {
    if (!(o.width > 0 && o.height > 0)) return "Width and height must be more than 0.";
    if (!(o.minT > 0)) return "Thinnest must be more than 0 mm.";
    if (!(o.maxT > o.minT)) return "Thickest must be more than Thinnest.";
    if (!(o.frame >= 0) || o.width - 2 * o.frame <= 0 || o.height - 2 * o.frame <= 0) return "The frame is too wide for the picture.";
    if (!(o.distance >= 0)) return "Light to picture can't be less than 0.";
    if (o.mountOn && !(o.slotW > 0 && o.slotD > 0 && o.slotWall > 0 && o.adapter > 0)) return "The slot sizes must all be more than 0.";
    if (o.curved) {
      if (!(o.radius > Math.max(o.maxT, o.mountOn ? mountDepth(o) : 0) + 1)) return "Curve radius is too small for how thick the picture is.";
      if (o.width / o.radius > Math.PI) return "Curve radius is too small: the picture would bend more than half a circle.";
    }
    return "";
  }

  function build(map, o) {
    const mesh = { pos: [], idx: [] }, bend = bender(o), base = mountHeight(o);
    const s = spaced(-o.width / 2, o.width / 2, map.cols), z = spaced(base, base + o.height, map.rows);
    shell(mesh, bend, s, z, () => 0, (i, j) => map.t[j * map.cols + i]);

    if (o.mountOn) {
      // A flat mount needs no extra points; a curved one gets a point every mm to follow the curve.
      const ms = spaced(-o.width / 2, o.width / 2, o.curved ? Math.ceil(o.width) + 1 : 2);
      const block = (d0, d1, z0, z1) => shell(mesh, bend, ms, [z0, z1], () => d0, () => d1);
      const depth = mountDepth(o);
      block(0, o.slotWall, 0, o.slotD + OVERLAP);               // front wall of the slot
      block(depth - o.slotWall, depth, 0, o.slotD + OVERLAP);   // back wall of the slot
      block(0, depth, o.slotD, base + OVERLAP);                 // top of the slot, under the picture
    }
    return mesh;
  }

  // A closed solid between a front and a back surface over a grid of (s, z) points.
  // front(i, j) and back(i, j) give the depth of each surface at point i across and j up.
  function shell(mesh, bend, s, z, front, back) {
    const cols = s.length, rows = z.length, first = mesh.pos.length / 3;
    for (const depthAt of [front, back])
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) mesh.pos.push(...bend(s[i], depthAt(i, j), z[j]));
    const F = (i, j) => first + j * cols + i, B = (i, j) => first + cols * rows + j * cols + i;
    const tri = (a, b, c) => mesh.idx.push(a, b, c); // counter-clockwise seen from outside

    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      tri(F(i, j), F(i + 1, j), F(i, j + 1)); tri(F(i + 1, j), F(i + 1, j + 1), F(i, j + 1)); // front
      tri(B(i, j), B(i, j + 1), B(i + 1, j)); tri(B(i + 1, j), B(i, j + 1), B(i + 1, j + 1)); // back
    }
    const top = rows - 1, right = cols - 1;
    for (let i = 0; i < cols - 1; i++) {
      tri(F(i, 0), B(i, 0), F(i + 1, 0)); tri(F(i + 1, 0), B(i, 0), B(i + 1, 0));                 // bottom
      tri(F(i, top), F(i + 1, top), B(i, top)); tri(F(i + 1, top), B(i + 1, top), B(i, top));     // top
    }
    for (let j = 0; j < rows - 1; j++) {
      tri(F(0, j), F(0, j + 1), B(0, j)); tri(F(0, j + 1), B(0, j + 1), B(0, j));                 // left
      tri(F(right, j), B(right, j), F(right, j + 1)); tri(F(right, j + 1), B(right, j), B(right, j + 1)); // right
    }
  }

  function spaced(a, b, n) {
    return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  }

  // Outer size of the printed part in mm: width (X), depth (Y) and height (Z).
  function footprint(o) {
    const bend = bender(o), deepest = Math.max(o.maxT, o.mountOn ? mountDepth(o) : 0);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of spaced(-o.width / 2, o.width / 2, 101)) for (const d of [0, o.maxT, deepest]) {
      const [x, y] = bend(s, d, 0);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { width: x1 - x0, depth: y1 - y0, height: mountHeight(o) + o.height };
  }

  return { build, check, bender, footprint, mountHeight, mountDepth, spaced };
})();
