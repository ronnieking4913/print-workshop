// Tests for js/lithophane/mesh.js and stl.js: shape, fit, and a printable mesh.
(() => {
  const { test, expect, checkMesh } = T;
  const { settings, picture, plain, center, volume, range } = LT;

  const gradient = picture(4, 3, [0, 0.3, 0.6, 1, 0, 0.3, 0.6, 1, 0, 0.3, 0.6, 1]);
  const build = (over, pic = gradient, res = 1) => {
    const o = settings({ width: 30, height: 40, ...over });
    return { o, mesh: LM.mesh.build(LM.thickness.build(pic, center, o, res), o) };
  };

  for (const [name, over] of [
    ["curved, with mount", {}],
    ["curved, no mount", { mountOn: false }],
    ["flat, with mount", { curved: false }],
    ["flat, no mount", { curved: false, mountOn: false }],
  ]) {
    test(`the mesh is closed and every face points outwards (${name})`, async () => {
      const { mesh } = build(over);
      const check = await checkMesh(LM.stl.build(mesh).blob);
      expect(check.count).toBeGreaterThan(0);
      expect(check.openEdges).toBe(0, "open edges:");
      expect(check.badNormals).toBe(0, "normals that disagree with the winding:");
      expect(volume(mesh)).toBeGreaterThan(0, "volume (mm³), negative means inside out:");
    });
  }

  test("a flat lithophane holds as much plastic as its thickness says", () => {
    const { o, mesh } = build({ curved: false, mountOn: false }, plain(1), 0.25);
    const iw = o.width - 2 * o.frame, ih = o.height - 2 * o.frame;
    const expected = iw * ih * o.minT + (o.width * o.height - iw * ih) * o.maxT;
    // the grid turns the frame's inner edge into a slope, so allow a little either way
    expect(volume(mesh)).toBeCloseTo(expected, expected * 0.05, "volume (mm³):");
  });

  test("the front of the picture is the Light to picture distance from the light", () => {
    for (const curved of [true, false]) {
      const { o, mesh } = build({ curved, mountOn: false });
      expect(range(mesh, 1)[0]).toBeCloseTo(-o.distance, 1e-3, `front (mm), curved ${curved}:`);
    }
  });

  test("the picture is as wide as Width along its curve, and as tall as Height", () => {
    const { o, mesh } = build({ mountOn: false, radius: 40 });
    const [x0, x1] = range(mesh, 0), [z0, z1] = range(mesh, 2);
    // the front's ends sit at ±(width / 2) / radius around the curve
    expect(x1 - x0).toBeCloseTo(2 * o.radius * Math.sin(o.width / 2 / o.radius), 1e-3, "straight-across width (mm):");
    expect(z1 - z0).toBeCloseTo(o.height, 1e-3, "height (mm):");
  });

  test("the picture sits on top of the mount, with the slot opening at the bottom", () => {
    const { o, mesh } = build({});
    const [z0, z1] = range(mesh, 2);
    expect(z0).toBeCloseTo(0, 1e-3, "bottom (mm):");
    expect(z1).toBeCloseTo(o.slotD + o.adapter + o.height, 1e-3, "top (mm):");
    expect(LM.mesh.mountDepth(o)).toBeCloseTo(o.slotW + 2 * o.slotWall, 1e-9, "mount depth (mm):");
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
    for (const over of [{ maxT: 0.5 }, { frame: 40 }, { radius: 3 }, { width: 250, radius: 50 }, { slotW: 0 }]) {
      expect(LM.mesh.check(settings(over)).length).toBeGreaterThan(0, JSON.stringify(over));
    }
  });
})();
