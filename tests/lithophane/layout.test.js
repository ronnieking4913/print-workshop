// Tests for the Lithophane Maker's layout and the menu shared with the Cookie Cutter Maker.
// Each test builds a small piece of the page inside #sandbox, using the same classes as the app.
(() => {
  const { test, expect } = T;

  function build(html) {
    const sandbox = document.getElementById("sandbox");
    sandbox.innerHTML = html;
    return sandbox;
  }

  test("the menu fits in the header next to the title and marks the open maker", () => {
    for (const width of [1200, 700]) {
      const s = build(`
        <header class="top" style="width:${width}px">
          <h1>Lithophane Maker</h1>
          <p>Choose a photo, see how it glows, download a printable STL for the night light.</p>
          <nav class="apps"><a href="#">Cookie cutter</a><a href="#" aria-current="page">Lithophane</a></nav>
        </header>`);
      const top = s.querySelector(".top").getBoundingClientRect(), links = s.querySelectorAll(".apps a");
      for (const a of links) expect(a.getBoundingClientRect().right <= top.right).toBe(true, `"${a.textContent}" visible at ${width}px:`);
      expect(getComputedStyle(links[1]).backgroundColor !== getComputedStyle(links[0]).backgroundColor).toBe(true, "open maker highlighted:");
    }
  });

  for (const [name, w, h] of [["tall", 381, 501], ["wide", 900, 300]]) {
    test(`a ${name} lithophane fits its preview panel without changing the layout`, () => {
      const s = build(`
        <section class="view" style="height:400px;width:300px">
          <header><h3>Lit up</h3></header>
          <div class="canvas-box night"><canvas width="${w}" height="${h}"></canvas></div>
        </section>`);
      const view = s.querySelector(".view"), box = s.querySelector(".canvas-box").getBoundingClientRect();
      const canvas = s.querySelector("canvas").getBoundingClientRect();
      if (matchMedia("(max-width: 760px)").matches) return; // phones scroll on purpose
      expect(view.scrollHeight <= view.clientHeight).toBe(true, "panel doesn't overflow:");
      expect(canvas.bottom <= box.bottom && canvas.right <= box.right).toBe(true, "picture inside its box:");
    });
  }

  test("the Picture preview shows the whole photo, darkened outside the printed part", () => {
    const p = LM.picture.read(T.picture(200, 100, g => { g.fillStyle = "#fff"; g.fillRect(0, 0, 200, 100); }));
    const r = LM.picture.crop(p, 0.5, { ...LT.center, cx: 0 }); // the left end of the photo
    const c = document.createElement("canvas");
    LM.preview.photo(c, p, r);
    const red = (x, y) => c.getContext("2d").getImageData(x, y, 1, 1).data[0];
    expect(c.width).toBe(200, "whole photo width:");
    expect(red(25, 50)).toBe(255, "inside the box stays bright:");
    expect(red(150, 50) < 150).toBe(true, "outside the box is darkened:");
  });

  test("turning the picture turns the color photo too", () => {
    const p = LM.picture.read(T.picture(30, 10, g => { g.fillStyle = "#000"; g.fillRect(0, 0, 10, 10); }));
    const turned = LM.picture.rotate(p);
    expect(`${turned.canvas.width}x${turned.canvas.height}`).toBe("10x30", "size after turning:");
    // black was on the left; after a clockwise quarter turn it's at the top
    expect(turned.canvas.getContext("2d").getImageData(5, 5, 1, 1).data[0]).toBe(0, "top is black:");
    expect(turned.canvas.getContext("2d").getImageData(5, 25, 1, 1).data[0]).toBe(255, "bottom is white:");
  });

  test("the night light preview shows the picture, so it changes when the picture does", () => {
    const o = LT.settings();
    const middle = value => {
      const lit = document.createElement("canvas"), view = document.createElement("canvas");
      LM.preview.lit(lit, LM.thickness.build(LT.plain(value), LT.center, o, 1), o);
      LM.preview.onLight(view, lit, o);
      return view.getContext("2d").getImageData(view.width >> 1, view.height >> 1, 1, 1).data[0];
    };
    const white = middle(1), black = middle(0);
    expect(white).toBeGreaterThan(black + 100, `white picture (${white}) much brighter than black (${black}):`);
  });
})();
