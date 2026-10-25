// Drawing the two previews: the photo with the printed part marked, and the lithophane glowing
// on the night light. lit draws the glow flat, as the picture for onLight to wrap around the curve.
window.LM = window.LM || {};

LM.preview = (() => {
  const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const DARKEST = 0.04; // share of the light that still gets through the thickest plastic

  // The whole photo in color, darkened outside r (LM.picture.crop), the part that gets printed,
  // with the picture's shape (LM.shapes) drawn inside it.
  function photo(canvas, p, r, shape) {
    canvas.width = p.W; canvas.height = p.H;
    const g = canvas.getContext("2d");
    g.drawImage(p.canvas, 0, 0);
    g.fillStyle = "rgb(0 0 0 / 0.55)";
    g.fillRect(0, 0, p.W, r.y);
    g.fillRect(0, r.y + r.h, p.W, p.H - r.y - r.h);
    g.fillRect(0, r.y, r.x, r.h);
    g.fillRect(r.x + r.w, r.y, p.W - r.x - r.w, r.h);
    const line = Math.max(2, Math.max(p.W, p.H) / 250);
    g.strokeStyle = "#fff"; g.lineWidth = line;
    g.strokeRect(r.x + line / 2, r.y + line / 2, r.w - line, r.h - line);
    if (shape && shape !== "rect") {
      g.setLineDash([line * 3, line * 2]);
      LM.shapes.path(g, shape, r.x, r.y, r.w, r.h);
      g.stroke();
      g.setLineDash([]);
    }
  }

  // Light fades with plastic thickness (Beer-Lambert law), so thin parts glow and thick parts stay dark.
  function lit(canvas, map, o) {
    const { cols, rows, t } = map, absorb = -Math.log(DARKEST) / (o.maxT - o.minT);
    canvas.width = cols; canvas.height = rows;
    const g = canvas.getContext("2d"), img = g.createImageData(cols, rows), d = img.data;
    for (let y = 0; y < rows; y++) {
      const row = rows - 1 - y; // the map starts at the bottom, the image at the top
      for (let x = 0; x < cols; x++) {
        const light = Math.exp(-absorb * (t[row * cols + x] - o.minT)), i = (y * cols + x) * 4;
        // warm white, like a night light bulb
        d[i] = 14 + 241 * light; d[i + 1] = 12 + 215 * light; d[i + 2] = 12 + 160 * light; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  }

  // The lithophane on the night light, glowing, seen from the front and a little above, so the
  // curve shows. picture: the lit-up preview canvas (from lit), wrapped around the curve.
  function onLight(canvas, picture, o) {
    const bend = LM.mesh.bender(o), base = LM.mesh.BASE.thickness, top = base + o.height;
    // a simple pinhole camera in front of the light, looking straight at it from above the picture
    const eye = { y: -(o.distance + 220), z: top + 40 };
    const project = ([x, y, z]) => [x / (y - eye.y), -(z - eye.z) / (y - eye.y)];
    const s = LM.mesh.spaced(-o.width / 2, o.width / 2, picture.width + 1);
    const edges = s.map(v => ({ top: project(bend(v, 0, top)), bottom: project(bend(v, 0, base)), floor: project(bend(v, 0, 0)) }));
    const baseTop = LM.mesh.baseOutline(o).map(([x, y]) => project([x, y, base]));

    const pts = [...edges.flatMap(e => [e.top, e.floor]), ...baseTop];
    const x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
    const y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const pad = 0.06 * Math.max(x1 - x0, y1 - y0), k = 1000 / Math.max(x1 - x0 + 2 * pad, y1 - y0 + 2 * pad);
    canvas.width = Math.round((x1 - x0 + 2 * pad) * k); canvas.height = Math.round((y1 - y0 + 2 * pad) * k);
    const X = x => (x - x0 + pad) * k, Y = y => (y - y0 + pad) * k;
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);

    // the base: its top (seen from above, with the slot), then its front edge below the picture
    const polygon = points => {
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
      g.closePath(); g.fill();
    };
    g.fillStyle = token("--mount");
    polygon(baseTop);
    polygon([...edges.map(e => e.bottom), ...edges.map(e => e.floor).reverse()]);
    // one strip per column of the picture: along a column only the height changes, so a
    // straight stretch is exact
    for (let i = 0; i < picture.width; i++) {
      const a = edges[i], b = edges[i + 1];
      g.drawImage(picture, i, 0, 1, picture.height,
        X(a.top[0]), Y(a.top[1]), X(b.top[0]) - X(a.top[0]) + 0.6, Y(a.bottom[1]) - Y(a.top[1]));
    }
  }

  return { photo, lit, onLight };
})();
