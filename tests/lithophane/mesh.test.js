// Tests for js/lithophane/mesh.js and stl.js: shape, fit, and a printable mesh.
(() => {
  const { test, expect, checkMesh } = T;
  const { settings, picture, plain, center, volume, range } = LT;

  const gradient = picture(4, 3, [0, 0.3, 0.6, 1, 0, 0.3, 0.6, 1, 0, 0.3, 0.6, 1]);
  const build = (over, pic = gradient, res = 1) => {
    // a small part that still reaches around the base's slot
    const o = settings({ width: 50, height: 40, ...over });
    return { o, mesh: LM.mesh.build(LM.thickness.build(pic, center, o, res), o) };
  };

  for (const [name, over] of [["curved", {}], ["flat", { curved: false }]]) {
    test(`the mesh is closed and every face points outwards (${name})`, async () => {
      const { mesh } = build(over);
      const check = await checkMesh(LM.stl.build(mesh).blob);
      expect(check.count).toBeGreaterThan(0);
      expect(check.openEdges).toBe(0, "open edges:");
      expect(check.badNormals).toBe(0, "normals that disagree with the winding:");
      expect(volume(mesh)).toBeGreaterThan(0, "volume (mm³), negative means inside out:");
    });
  }

  // Area inside an outline, in mm² (shoelace formula).
  const area = pts => Math.abs(pts.reduce((a, [x, y], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length];
    return a + x * y2 - x2 * y;
  }, 0)) / 2;

  test("a flat lithophane holds as much plastic as its thickness says", () => {
    const { o, mesh } = build({ curved: false }, plain(1), 0.25);
    const iw = o.width - 2 * o.frame, ih = o.height - 2 * o.frame;
    const base = area(LM.mesh.baseOutline(o)) * (LM.mesh.BASE.thickness + LM.mesh.OVERLAP);
    const expected = iw * ih * o.minT + (o.width * o.height - iw * ih) * o.maxT + base;
    // the grid turns the frame's inner edge into a slope, so allow a little either way
    expect(volume(mesh)).toBeCloseTo(expected, expected * 0.05, "volume (mm³):");
  });

  test("the front of the picture is the Light to picture distance from the light", () => {
    for (const curved of [true, false]) {
      const { o, mesh } = build({ curved });
      expect(range(mesh, 1)[0]).toBeCloseTo(-o.distance, 1e-3, `front (mm), curved ${curved}:`);
    }
  });

  test("the bumps are on the outside, and the side facing the light is smooth", () => {
    const { o, mesh } = build({ curved: false }, plain(1), 0.25), d = o.distance, top = LM.mesh.BASE.thickness + LM.mesh.OVERLAP;
    let back = -Infinity, middle = null;
    for (let i = 0; i < mesh.pos.length; i += 3) {
      const [x, y, z] = mesh.pos.slice(i, i + 3);
      if (z <= top) continue; // the base
      back = Math.max(back, y);
      if (Math.abs(x) < 0.01 && Math.abs(z - top - o.height / 2) < 0.2) middle = Math.min(middle ?? Infinity, y);
    }
    expect(back).toBeCloseTo(-d + o.maxT, 1e-6, "back, facing the light (mm):");
    // white is thinnest: its front sits furthest in, so the frame stands out around it
    expect(middle).toBeCloseTo(-d + o.maxT - o.minT, 1e-3, "front of the white middle (mm):");
  });

  test("the picture is as wide as Width along its curve, and stands Height tall on the base", () => {
    const { o, mesh } = build({ radius: 40 });
    const [x0, x1] = range(mesh, 0), [z0, z1] = range(mesh, 2);
    // the front's ends sit at ±(width / 2) / radius around the curve
    expect(x1 - x0).toBeCloseTo(2 * o.radius * Math.sin(o.width / 2 / o.radius), 1e-3, "straight-across width (mm):");
    expect(z0).toBeCloseTo(0, 1e-3, "bottom (mm):");
    expect(z1).toBeCloseTo(LM.mesh.BASE.thickness + o.height, 1e-3, "top (mm):");
  });

  // Is the point x, y inside the outline? (even-odd rule)
  const insideOutline = (pts, x, y) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };

  test("the base is 1.8 mm thick, with a 17 mm by 17 mm slot around the light", () => {
    const B = LM.mesh.BASE;
    expect(`${B.slotW} ${B.slotD} ${B.thickness}`).toBe("17 17 1.8", "slot width, slot depth, thickness (mm):");
    const o = settings(), pts = LM.mesh.baseOutline(o), r = B.slotW / 2;
    expect(insideOutline(pts, 0, 0)).toBe(false, "the light (middle of the slot's round end) is in the slot:");
    expect(insideOutline(pts, 0, B.slotD - r - 0.5)).toBe(false, "the slot is open at the back:");
    expect(insideOutline(pts, 0, -r - 1)).toBe(true, "base just in front of the slot:");
    expect(insideOutline(pts, r + 1, 0)).toBe(true, "base beside the slot:");
    expect(insideOutline(pts, 0, -o.distance + 0.5)).toBe(true, "base reaches the front of the picture:");
    const ys = pts.map(p => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(B.slotD - r, 1e-9, "back edge, Slot depth behind the slot's far end (mm):");
  });

  test("the size shown under the preview matches the saved part", () => {
    const { o, mesh } = build({});
    const f = LM.mesh.footprint(o), [x0, x1] = range(mesh, 0), [y0, y1] = range(mesh, 1), [z0, z1] = range(mesh, 2);
    expect(f.width).toBeCloseTo(x1 - x0, 0.05, "width (mm):");
    expect(f.depth).toBeCloseTo(y1 - y0, 0.05, "depth (mm):");
    expect(f.height).toBeCloseTo(z1 - z0, 1e-3, "height (mm):");
  });

  test("settings that can't be printed give a clear message instead of a broken file", () => {
    expect(LM.mesh.check(settings())).toBe("", "defaults:");
    for (const over of [{ maxT: 0.5 }, { frame: 60 }, { radius: 3 }, { width: 250, radius: 50 }, { distance: 8 }, { width: 25 }]) {
      expect(LM.mesh.check(settings(over)).length).toBeGreaterThan(0, JSON.stringify(over));
    }
  });
})();
