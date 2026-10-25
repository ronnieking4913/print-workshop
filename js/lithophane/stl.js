// Step 4: write the mesh as a binary STL file.
window.LM = window.LM || {};

LM.stl = (() => {
  // mesh: { pos: [x, y, z, ...], idx: [a, b, c, ...] } from LM.mesh.build.
  function build(mesh) {
    const { pos, idx } = mesh, count = idx.length / 3;
    const buf = new ArrayBuffer(84 + count * 50), dv = new DataView(buf);
    const header = "Lithophane made with Lithophane Maker";
    for (let i = 0; i < header.length; i++) dv.setUint8(i, header.charCodeAt(i));
    dv.setUint32(80, count, true);
    let off = 84;
    const put = v => { dv.setFloat32(off, v, true); off += 4; };
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      put(nx / len); put(ny / len); put(nz / len);
      for (const p of [a, b, c]) { put(pos[p]); put(pos[p + 1]); put(pos[p + 2]); }
      off += 2;
    }
    return { blob: new Blob([buf], { type: "model/stl" }), count };
  }

  return { build };
})();
