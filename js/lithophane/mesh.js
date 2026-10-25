// Step 3: bend the thickness map around the light and turn it into a closed 3D mesh, standing
// on a flat base. The base has a U-shaped slot that slides around the night light's bulb post.
//
// Coordinates in mm: X runs left to right as seen from the front, Z is up, the light (the middle
// of the slot's rounded end) is at the origin and the viewer stands at -Y. The front of the
// picture carries the bumps (the picture shows on the outside); the side facing the light is smooth.
window.LM = window.LM || {};

LM.mesh = (() => {
  const OVERLAP = 0.3; // the base reaches this far up into the picture so slicers merge them, mm

  // The base that fits the night light
  // (the Emotionlite night light). Fixed on purpose: only a different night light changes it.
  // slotW: width of the slot (fits the bulb post), slotD: from the back edge to the slot's far end,
  // thickness: of the base, margin: base on each side of the slot at the back edge. All mm.
  const BASE = { slotW: 17, slotD: 17, thickness: 1.8, margin: 8 };

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

  // The base seen from above, counter-clockwise: along the front of the picture, in to the
  // back edge, around the slot (its rounded end wraps around the light), and back out.
  function baseOutline(o) {
    const bend = bender(o), r = BASE.slotW / 2;
    const back = BASE.slotD - r, corner = r + BASE.margin;
    const pts = spaced(-o.width / 2, o.width / 2, o.curved ? Math.ceil(o.width) + 1 : 2).map(s => bend(s, 0, 0).slice(0, 2));
    pts.push([corner, back], [r, back]);
    for (let i = 0; i <= 24; i++) {
      const a = (-Math.PI * i) / 24;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    pts.push([-r, back], [-corner, back]);
    return pts;
  }

  // A plain-English problem with the settings, or "" when they make a printable part.
  function check(o) {
    if (!(o.width > 0 && o.height > 0)) return "Width and height must be more than 0.";
    if (!(o.minT > 0)) return "Thinnest must be more than 0 mm.";
    if (!(o.maxT > o.minT)) return "Thickest must be more than Thinnest.";
    if (!(o.frame >= 0) || o.width - 2 * o.frame <= 0 || o.height - 2 * o.frame <= 0) return "The frame is too wide for the picture.";
    if (o.text && !(LM.thickness.region(o).h > 10)) return "The words leave no room for the picture: make it taller or the frame thinner.";
    if (!(o.distance > 0)) return "Light to picture must be more than 0.";
    if (o.curved) {
      if (!(o.radius > o.maxT + 1)) return "Curve radius is too small for how thick the picture is.";
      if (o.width / o.radius > Math.PI) return "Curve radius is too small: the picture would bend more than half a circle.";
    }
    const r = BASE.slotW / 2;
    if (!(o.distance - o.maxT > r + 1)) return "The picture is too close to the light: make Light to picture bigger.";
    const tip = bender(o)(o.width / 2, 0, 0);
    if (!(tip[0] > r + BASE.margin + 1 && tip[1] < BASE.slotD - r - 1))
      return "The picture is too narrow to reach around the base's slot: make it wider, or the curve radius bigger.";
    return "";
  }

  function build(map, o) {
    const mesh = { pos: [], idx: [] }, bend = bender(o), base = BASE.thickness;
    const s = spaced(-o.width / 2, o.width / 2, map.cols), z = spaced(base, base + o.height, map.rows);
    // the back sits Thickest in from the front, so the bumps come out the front and the back is smooth
    shell(mesh, bend, s, z, (i, j) => o.maxT - map.t[j * map.cols + i], () => o.maxT);
    prism(mesh, baseOutline(o), 0, base + OVERLAP);
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

  // A flat solid from z0 to z1 with the outline pts (counter-clockwise from above).
  function prism(mesh, pts, z0, z1) {
    const n = pts.length, first = mesh.pos.length / 3;
    for (const z of [z0, z1]) for (const [x, y] of pts) mesh.pos.push(x, y, z);
    const lo = i => first + i, hi = i => first + n + i;
    for (const [a, b, c] of triangulate(pts)) {
      mesh.idx.push(hi(a), hi(b), hi(c)); // top, facing up
      mesh.idx.push(lo(a), lo(c), lo(b)); // bottom, facing down
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      mesh.idx.push(lo(i), lo(j), hi(j), lo(i), hi(j), hi(i)); // sides, facing out
    }
  }

  // Splits a counter-clockwise outline into triangles by cutting off "ears" one at a time.
  function triangulate(pts) {
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const idx = pts.map((_, i) => i), tris = [];
    while (idx.length > 3) {
      let cut = false;
      for (let k = 0; k < idx.length && !cut; k++) {
        const i = idx[(k + idx.length - 1) % idx.length], j = idx[k], l = idx[(k + 1) % idx.length];
        const [a, b, c] = [pts[i], pts[j], pts[l]];
        if (cross(a, b, c) <= 1e-9) continue; // a dent or a straight run, not an ear
        const blocked = idx.some(m => m !== i && m !== j && m !== l &&
          cross(a, b, pts[m]) > 1e-9 && cross(b, c, pts[m]) > 1e-9 && cross(c, a, pts[m]) > 1e-9);
        if (blocked) continue;
        tris.push([i, j, l]); idx.splice(k, 1); cut = true;
      }
      if (!cut) throw new Error("Couldn't build the base with these settings. Try a smaller slot.");
    }
    tris.push(idx);
    return tris;
  }

  function spaced(a, b, n) {
    return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
  }

  // Outer size of the printed part in mm: width (X), depth (Y) and height (Z).
  function footprint(o) {
    const bend = bender(o);
    const pts = spaced(-o.width / 2, o.width / 2, 101).flatMap(s => [bend(s, 0, 0), bend(s, o.maxT, 0)]);
    pts.push(...baseOutline(o));
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...ys) - Math.min(...ys), height: BASE.thickness + o.height };
  }

  return { build, check, bender, footprint, baseOutline, spaced, BASE, OVERLAP };
})();
