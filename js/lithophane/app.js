// Connects the Lithophane Maker's controls to the steps: picture.js → thickness.js → mesh.js → stl.js.
(() => {
  const $ = id => document.getElementById(id);
  const PREVIEW_RES = 0.25; // grid for the night light preview, mm (the STL uses the Detail setting)

  const state = {
    name: "moon",
    p: null,                  // picture brightness (LM.picture.read), turned as the user chose
    view: { cx: 0.5, cy: 0.5 }, // middle of the part of the picture that shows, as fractions
    ok: false,                // settings make a printable part
    glow: document.createElement("canvas"), // the lithophane lit up, flat, before it's wrapped around the curve
  };

  function readSettings() {
    return {
      zoom: +$("zoom").value / 100, brightness: +$("brightness").value / 100, contrast: +$("contrast").value / 100,
      midtones: +$("midtones").value / 100, sharpness: (+$("sharpness").value / 100) * 1.5,
      shape: $("shape").value, soft: $("soft").checked, text: $("text").value.trim(),
      width: +$("width").value, height: +$("height").value, frame: +$("frame").value,
      minT: +$("minT").value, maxT: +$("maxT").value, res: +$("res").value,
      distance: +$("distance").value, curved: $("curved").checked, radius: +$("radius").value,
    };
  }
  const viewOf = o => ({ ...state.view, zoom: o.zoom });
  const aspectOf = o => { const r = LM.thickness.region(o); return r.w / r.h; }; // shape of the printed part of the picture

  // ---- previews (re-run when the picture or any setting changes) ----
  // Just the Picture preview: quick enough to redraw on every pointer move while dragging.
  function showBox(o = readSettings()) {
    if (LM.mesh.check(o)) return;
    LM.preview.photo($("photo"), state.p, LM.picture.crop(state.p, aspectOf(o), viewOf(o)), o.shape);
  }
  let frame = 0;
  const showBoxSoon = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; showBox(); }); };

  function update() {
    const o = readSettings();
    $("radiusField").hidden = !o.curved;
    $("zoomVal").textContent = o.zoom.toFixed(1) + "×";
    $("brightVal").textContent = $("brightness").value;
    $("contrastVal").textContent = $("contrast").value;
    $("midVal").textContent = $("midtones").value;
    $("sharpVal").textContent = $("sharpness").value;

    const problem = LM.mesh.check(o);
    state.ok = !problem;
    showError(problem);
    $("save").disabled = !state.ok;
    if (!state.ok) return;

    showBox(o);
    LM.preview.lit(state.glow, LM.thickness.build(state.p, viewOf(o), o, Math.max(o.res, PREVIEW_RES)), o);
    LM.preview.onLight($("onLight"), state.glow, o);
    const f = LM.mesh.footprint(o);
    $("stats").innerHTML =
      `<div><dt>Size</dt><dd>${f.width.toFixed(1)} × ${f.depth.toFixed(1)} × ${f.height.toFixed(1)} mm</dd></div>` +
      `<div><dt>Thickness</dt><dd>${o.minT}–${o.maxT} mm</dd></div>`;
  }

  function showError(msg) { $("err").textContent = msg; $("err").hidden = !msg; }

  let timer;
  const later = fn => { clearTimeout(timer); timer = setTimeout(fn, 60); };

  // Sets Brightness, Contrast and Midtones to suit the part of the picture that shows.
  function autoAdjust() {
    const o = readSettings(), a = LM.thickness.auto(state.p, viewOf(o), aspectOf(o));
    $("brightness").value = Math.round(a.brightness * 100);
    $("contrast").value = Math.round(a.contrast * 100);
    $("midtones").value = Math.round(a.midtones * 100);
    update();
  }

  // ---- loading a picture ----
  function loadImage(img, name) {
    state.p = LM.picture.read(img);
    state.view = { cx: 0.5, cy: 0.5 };
    state.name = name;
    $("zoom").value = 100;
    autoAdjust();
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) { showError("That file isn't an image. Use a PNG, JPG, WEBP or AVIF."); return; }
    const img = new Image();
    img.onload = () => {
      $("fname").textContent = file.name;
      $("thumb").src = img.src; $("thumb").hidden = false;
      loadImage(img, file.name.replace(/\.[^.]+$/, ""));
    };
    img.onerror = () => showError("Couldn't read that image. Try saving it as PNG or JPG.");
    img.src = URL.createObjectURL(file);
  }

  // A full moon over a hill with a tree, so there's something to see before choosing a picture.
  function sampleMoon() {
    const c = document.createElement("canvas"); c.width = 600; c.height = 800;
    const g = c.getContext("2d");
    const sky = g.createLinearGradient(0, 0, 0, 800);
    sky.addColorStop(0, "#0b1530"); sky.addColorStop(1, "#3c4f7a");
    g.fillStyle = sky; g.fillRect(0, 0, 600, 800);
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = "#fff";
    for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(rand() * 600, rand() * 560, 1 + rand() * 2.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#f6f1df"; g.beginPath(); g.arc(380, 250, 120, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d9d2bb";
    for (const [x, y, r] of [[340, 210, 26], [420, 290, 18], [395, 200, 12], [350, 300, 15]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#05070d";
    g.beginPath(); g.moveTo(0, 690); g.quadraticCurveTo(300, 600, 600, 700); g.lineTo(600, 800); g.lineTo(0, 800); g.fill();
    g.fillRect(140, 520, 14, 140);
    for (const [y, w] of [[440, 50], [490, 75], [545, 100]]) {
      g.beginPath(); g.moveTo(147, y - 50); g.lineTo(147 + w, y + 40); g.lineTo(147 - w, y + 40); g.fill();
    }
    return c;
  }

  // ---- saving ----
  function save() {
    if (!state.ok) return;
    const btn = $("save"), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Building…";
    setTimeout(() => {
      const o = readSettings();
      const mesh = LM.mesh.build(LM.thickness.build(state.p, viewOf(o), o, o.res), o);
      const { blob, count } = LM.stl.build(mesh);
      const file = `${state.name}-lithophane.stl`;
      download(blob, file);
      btn.disabled = false; btn.textContent = label;
      $("saved").textContent = `Saved ${file} · ${(blob.size / 1e6).toFixed(1)} MB · ${count.toLocaleString()} triangles`;
    }, 30);
  }

  function download(blob, file) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  // ---- wiring ----
  document.querySelectorAll(".controls input, .controls select")
    .forEach(el => el.id !== "file" && el.addEventListener("input", () => later(update)));
  $("turn").addEventListener("click", () => { state.p = LM.picture.rotate(state.p); state.view = { cx: 0.5, cy: 0.5 }; update(); });
  $("center").addEventListener("click", () => { state.view = { cx: 0.5, cy: 0.5 }; update(); });
  $("auto").addEventListener("click", autoAdjust);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => state.ok && update());

  // ---- moving the box by dragging it, resizing it by its edges, and zooming with the scroll wheel ----
  const photo = $("photo");

  // The picture is scaled to fit inside the canvas box (CSS object-fit): the pointer in picture pixels.
  function toPicture(e) {
    const rect = photo.getBoundingClientRect();
    const scale = Math.min(rect.width / photo.width, rect.height / photo.height);
    return {
      x: (e.clientX - rect.left - (rect.width - photo.width * scale) / 2) / scale,
      y: (e.clientY - rect.top - (rect.height - photo.height * scale) / 2) / scale,
      scale,
    };
  }

  // Which edges of the box the pointer is on ({ l, r, t, b }), or null when it's on none.
  function edgesAt(e) {
    const o = readSettings(), r = LM.picture.crop(state.p, aspectOf(o), viewOf(o)), at = toPicture(e);
    const near = (e.pointerType === "touch" ? 20 : 8) / at.scale; // how close counts, in screen pixels
    const across = at.y > r.y - near && at.y < r.y + r.h + near, along = at.x > r.x - near && at.x < r.x + r.w + near;
    const edges = {
      l: across && Math.abs(at.x - r.x) < near, r: across && Math.abs(at.x - r.x - r.w) < near,
      t: along && Math.abs(at.y - r.y) < near, b: along && Math.abs(at.y - r.y - r.h) < near,
    };
    if (edges.l && edges.r) edges.l = false; // a tiny box: grow it
    if (edges.t && edges.b) edges.t = false;
    return edges.l || edges.r || edges.t || edges.b ? edges : null;
  }
  const cursorFor = ed => !ed ? "" : (ed.l || ed.r) && (ed.t || ed.b)
    ? ((ed.l && ed.t) || (ed.r && ed.b) ? "nwse-resize" : "nesw-resize") : ed.l || ed.r ? "ew-resize" : "ns-resize";

  // Dragging an edge changes Width or Height (a corner changes both). The photo keeps its size
  // per mm, so a wider box prints wider and shows more of the photo; the opposite edges stay put.
  function resize(d, e) {
    const at = toPicture(e), r0 = d.box, o0 = d.o, k = r0.w / d.region.w; // picture pixels per mm
    const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
    const l = d.edges.l ? clamp(at.x, 0, r0.x + r0.w) : r0.x, r = d.edges.r ? clamp(at.x, r0.x, state.p.W) : r0.x + r0.w;
    const t = d.edges.t ? clamp(at.y, 0, r0.y + r0.h) : r0.y, b = d.edges.b ? clamp(at.y, r0.y, state.p.H) : r0.y + r0.h;
    const size = (input, picturePx, around, moved, was) => {
      if (!moved) return was;
      const mm = Math.round(picturePx / k + around); // around: the frame (and words) around the picture
      return clamp(mm, Math.max(+input.min, Math.ceil(around) + 5), +input.max);
    };
    const width = size($("width"), r - l, o0.width - d.region.w, d.edges.l || d.edges.r, o0.width);
    const height = size($("height"), b - t, o0.height - d.region.h, d.edges.t || d.edges.b, o0.height);
    const a = LM.thickness.region({ ...o0, width, height }), w = a.w * k, h = a.h * k;
    const box = { x: d.edges.l ? r0.x + r0.w - w : r0.x, y: d.edges.t ? r0.y + r0.h - h : r0.y, w, h };
    const view = LM.picture.fit(state.p, a.w / a.h, box);
    state.view = { cx: view.cx, cy: view.cy };
    $("zoom").value = view.zoom * 100;
    $("width").value = width; $("height").value = height;
    // tells the page (and Remember) that Width and Height changed
    ["width", "height"].forEach(id => $(id).dispatchEvent(new Event("input", { bubbles: true })));
    showBoxSoon(); // the night light waits for a pause (update), the box follows the pointer
  }

  let drag = null; // { last } while moving the box, { edges, box, region, o } while resizing it
  photo.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !state.ok) return;
    try { photo.setPointerCapture(e.pointerId); } catch { /* keep going without capture */ }
    const edges = edgesAt(e), o = readSettings();
    drag = edges
      ? { edges, o, region: LM.thickness.region(o), box: LM.picture.crop(state.p, aspectOf(o), viewOf(o)) }
      : { last: [e.clientX, e.clientY] };
    photo.classList.add("dragging");
  });
  photo.addEventListener("pointermove", e => {
    if (!drag) { photo.style.cursor = state.ok ? cursorFor(edgesAt(e)) : ""; return; }
    if (drag.edges) { resize(drag, e); return; }
    // turn the pointer's movement into picture pixels, then into a share of the box
    const o = readSettings(), { scale } = toPicture(e);
    const r = LM.picture.crop(state.p, aspectOf(o), viewOf(o));
    // pan moves the picture under the box, so moving the box is the opposite direction
    state.view = LM.picture.pan(state.p, aspectOf(o), viewOf(o),
      -(e.clientX - drag.last[0]) / scale / r.w, -(e.clientY - drag.last[1]) / scale / r.h);
    drag.last = [e.clientX, e.clientY];
    showBoxSoon();
    later(update);
  });
  const endDrag = () => { drag = null; photo.classList.remove("dragging"); };
  photo.addEventListener("pointerup", endDrag);
  photo.addEventListener("pointercancel", endDrag);
  photo.addEventListener("wheel", e => {
    e.preventDefault();
    $("zoom").value = +$("zoom").value - Math.sign(e.deltaY) * 10;
    later(update);
  }, { passive: false });

  const drop = $("drop");
  drop.addEventListener("click", () => $("file").click());
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } });
  $("file").addEventListener("change", e => loadFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach(t => document.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave", "drop"].forEach(t => document.addEventListener(t, e => { e.preventDefault(); drop.classList.remove("over"); }));
  document.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));
  $("save").addEventListener("click", save);

  loadImage(sampleMoon(), "moon");
})();
