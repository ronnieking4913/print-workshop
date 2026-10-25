// Tests for the portrait features: picture shapes, soft edge, words, Midtones, Sharpness and Auto-adjust.
(() => {
  const { test, expect } = T;
  const { settings, picture, plain, center } = LT;

  // Thickness at a spot given in mm from the panel's bottom-left corner.
  const at = (m, o, s, z) => m.t[Math.round(z / (o.height / (m.rows - 1))) * m.cols + Math.round(s / (o.width / (m.cols - 1)))];
  const white = plain(1);

  test("an oval or heart picture is solid frame in the corners and picture in the middle", () => {
    for (const shape of ["oval", "heart"]) {
      const o = settings({ shape }), m = LM.thickness.build(white, center, o, 0.5);
      expect(at(m, o, o.width / 2, o.height / 2)).toBeCloseTo(o.minT, 0.01, `${shape}, middle (mm):`);
      expect(at(m, o, o.frame + 2, o.height - o.frame - 2)).toBeCloseTo(o.maxT, 0.01, `${shape}, top-left corner (mm):`);
    }
  });

  test("a soft edge fades from the picture into the frame instead of a sharp step", () => {
    const thicknessesAcross = soft => {
      const o = settings({ shape: "oval", soft }), m = LM.thickness.build(white, center, o, 0.25);
      const row = Math.round(m.rows / 2), values = new Set();
      for (let col = 0; col < m.cols / 2; col++) values.add(m.t[row * m.cols + col].toFixed(2));
      return values.size;
    };
    expect(thicknessesAcross(true)).toBeGreaterThan(thicknessesAcross(false) + 5, "in-between thicknesses at the edge:");
  });

  test("words make a strip under the picture, and the letters are thin so they glow", () => {
    const o = settings({ text: "HELLO" }), m = LM.thickness.build(plain(0), center, o, 0.25);
    const r = LM.thickness.region(o);
    expect(r.y > o.frame + 5).toBe(true, "picture moved up to make room:");
    // somewhere along the middle of the strip is a letter (thin); the strip's ends are frame (thick)
    const z = o.frame + (r.y - o.frame) / 2;
    let thinnest = Infinity;
    for (let s = o.width * 0.3; s < o.width * 0.7; s += 0.25) thinnest = Math.min(thinnest, at(m, o, s, z));
    expect(thinnest).toBeCloseTo(o.minT, 0.3, "letters (mm):");
    expect(at(m, o, o.frame + 1, z)).toBeCloseTo(o.maxT, 0.01, "strip beside the words (mm):");
  });

  test("words that leave no room for the picture give a clear message", () => {
    expect(LM.mesh.check(settings({ text: "Hi", height: 30, frame: 6 })).length).toBeGreaterThan(0);
  });

  test("Midtones lightens middle greys but leaves black and white alone", () => {
    const o = settings(), lighter = { ...o, midtones: 0.5 };
    expect(LM.thickness.tone(0.5, lighter) > LM.thickness.tone(0.5, o)).toBe(true, "grey gets lighter:");
    expect(LM.thickness.tone(0, lighter)).toBe(0, "black:");
    expect(LM.thickness.tone(1, lighter)).toBe(1, "white:");
  });

  test("Sharpness makes an edge crisper", () => {
    // a picture that's dark on the left and light on the right
    const p = picture(40, 40, Array.from({ length: 1600 }, (_, i) => (i % 40 < 20 ? 0.3 : 0.7)));
    const spread = sharpness => {
      const o = settings({ width: 40, height: 40, sharpness }), m = LM.thickness.build(p, center, o, 0.5);
      const row = m.t.subarray((m.rows >> 1) * m.cols, ((m.rows >> 1) + 1) * m.cols).slice(10, -10);
      return Math.max(...row) - Math.min(...row);
    };
    expect(spread(1.5)).toBeGreaterThan(spread(0) + 0.1, "difference across the edge (mm):");
  });

  test("Auto-adjust brightens a dark, flat photo so it uses the full range", () => {
    // a dim photo: everything between 0.1 and 0.5
    const p = picture(50, 50, Array.from({ length: 2500 }, (_, i) => 0.1 + 0.4 * ((i % 50) / 49)));
    const a = LM.thickness.auto(p, center, 1);
    const o = { ...settings(), ...a };
    expect(LM.thickness.tone(0.1, o)).toBeCloseTo(0, 0.05, "darkest becomes black:");
    expect(LM.thickness.tone(0.5, o)).toBeCloseTo(1, 0.05, "lightest becomes white:");
    expect(LM.thickness.tone(0.3, o)).toBeCloseTo(0.55, 0.05, "middle becomes a light grey:");
  });

  test("the Picture preview draws the oval inside the box", () => {
    const p = LM.picture.read(T.picture(200, 200, g => { g.fillStyle = "#000"; g.fillRect(0, 0, 200, 200); }));
    const c = document.createElement("canvas");
    LM.preview.photo(c, p, LM.picture.crop(p, 1, center), "oval");
    // the oval's outline crosses the middle of the left side
    let bright = 0;
    for (let x = 0; x < 12; x++) bright = Math.max(bright, c.getContext("2d").getImageData(x, 100, 1, 1).data[0]);
    expect(bright).toBeGreaterThan(200, "outline drawn:");
  });
})();
