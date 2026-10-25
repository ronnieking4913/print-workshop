// Tests for js/lithophane/picture.js and thickness.js: reading, turning and framing the picture,
// and turning brightness into thickness.
(() => {
  const { test, expect } = T;
  const { settings, picture, plain, center } = LT;

  test("white parts are thinnest, black parts thickest, and the frame is full thickness", () => {
    const o = settings({ width: 30, height: 40 });
    const white = LM.thickness.build(plain(1), center, o, 1), black = LM.thickness.build(plain(0), center, o, 1);
    const mid = (m, col = m.cols >> 1, row = m.rows >> 1) => m.t[row * m.cols + col];
    expect(mid(white)).toBeCloseTo(o.minT, 1e-4, "white (mm):");
    expect(mid(black)).toBeCloseTo(o.maxT, 1e-4, "black (mm):");
    expect(mid(white, 0)).toBeCloseTo(o.maxT, 1e-4, "frame at the left edge (mm):");
    expect(mid(white, white.cols >> 1, 0)).toBeCloseTo(o.maxT, 1e-4, "frame at the bottom (mm):");
  });

  test("the top of the picture is at the top of the lithophane, and left stays left", () => {
    // 2 x 2 picture: white top-left, black everywhere else
    const p = picture(2, 2, [1, 0, 0, 0]), o = settings({ width: 40, height: 40 });
    const m = LM.thickness.build(p, center, o, 1), at = (col, row) => m.t[row * m.cols + col];
    expect(at(8, m.rows - 9) < at(m.cols - 9, m.rows - 9)).toBe(true, "top-left thinner than top-right:");
    expect(at(8, m.rows - 9) < at(8, 8)).toBe(true, "top-left thinner than bottom-left:");
  });

  test("Brightness and Contrast change the thickness the right way", () => {
    const o = settings({ width: 30, height: 40 }), grey = plain(0.5);
    const mid = m => m.t[(m.rows >> 1) * m.cols + (m.cols >> 1)];
    const normal = mid(LM.thickness.build(grey, center, o, 1));
    expect(mid(LM.thickness.build(grey, center, { ...o, brightness: 0.2 }, 1)) < normal).toBe(true, "brighter is thinner:");
    const darkGrey = plain(0.3), base = mid(LM.thickness.build(darkGrey, center, o, 1));
    expect(mid(LM.thickness.build(darkGrey, center, { ...o, contrast: 2 }, 1)) > base).toBe(true, "more contrast makes dark parts thicker:");
  });

  test("the picture is cropped to the lithophane's shape, and zoom shows less of it", () => {
    const p = picture(200, 100, new Array(200 * 100).fill(0.5));
    const r = LM.picture.crop(p, 0.5, center);
    expect(r.h).toBeCloseTo(100, 1e-9, "uses the full height:");
    expect(r.w).toBeCloseTo(50, 1e-9, "width matches the shape:");
    expect(LM.picture.crop(p, 0.5, { ...center, zoom: 2 }).w).toBeCloseTo(25, 1e-9, "zoomed width:");
  });

  test("dragging the picture can't move it past its edge", () => {
    const p = picture(100, 100, new Array(100 * 100).fill(0.5));
    const view = LM.picture.pan(p, 1, { ...center, zoom: 2 }, 10, 10);
    const r = LM.picture.crop(p, 1, view);
    expect(r.x).toBeCloseTo(0, 1e-9, "left edge:");
    expect(r.y).toBeCloseTo(0, 1e-9, "top edge:");
  });

  test("turning the picture four times puts it back", () => {
    const p = picture(3, 2, [1, 2, 3, 4, 5, 6]), once = LM.picture.rotate(p);
    expect([...once.gray].join()).toBe("4,1,5,2,6,3", "one quarter turn:");
    const four = LM.picture.rotate(LM.picture.rotate(LM.picture.rotate(once)));
    expect([...four.gray].join()).toBe([...p.gray].join(), "four quarter turns:");
  });

  test("reading a picture: white is 1, black is 0, and see-through parts count as white", () => {
    const c = T.picture(4, 1, g => { g.fillStyle = "#fff"; g.fillRect(0, 0, 1, 1); g.fillStyle = "#000"; g.fillRect(1, 0, 1, 1); });
    const p = LM.picture.read(c);
    expect(p.gray[0]).toBeCloseTo(1, 0.01, "white:");
    expect(p.gray[1]).toBeCloseTo(0, 0.01, "black:");
    expect(p.gray[3]).toBeCloseTo(1, 0.01, "see-through:");
  });
})();
