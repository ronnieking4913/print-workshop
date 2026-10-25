// Tests for js/remember.js: settings are remembered between visits, and Reset settings puts back
// the defaults. Shared by both makers. Each test builds a small set of controls in #sandbox.
(() => {
  const { test, expect } = T;
  const KEY = "print-workshop:test";

  // A fresh copy of the page's controls, as if the page had just been opened.
  function open() {
    const sandbox = document.getElementById("sandbox");
    sandbox.innerHTML = `
      <aside class="controls">
        <input type="number" id="t-size" value="80">
        <input type="checkbox" id="t-rim" checked>
        <select id="t-res"><option value="0.15">Fine</option><option value="0.25" selected>Normal</option></select>
        <input type="range" id="t-zoom" min="100" max="400" value="100" data-forget>
        <button id="resetSettings" type="button">Reset settings</button>
      </aside>`;
    const heard = [];
    sandbox.addEventListener("input", e => heard.push(e.target.id));
    Remember.attach(sandbox, KEY);
    const $ = id => sandbox.querySelector("#" + id);
    const change = (id, v) => {
      const el = $(id);
      if (el.type === "checkbox") el.checked = v; else el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    return { $, change, heard };
  }

  const clear = () => { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

  test("changed settings are back the next time the page opens, and the page hears about them", () => {
    clear();
    const first = open();
    first.change("t-size", "95"); first.change("t-rim", false); first.change("t-res", "0.15");
    const again = open();
    expect(again.$("t-size").value).toBe("95", "number:");
    expect(again.$("t-rim").checked).toBe(false, "switch:");
    expect(again.$("t-res").value).toBe("0.15", "list:");
    expect(again.heard.sort().join()).toBe("t-res,t-rim,t-size", "page told about:");
    clear();
  });

  test("settings marked data-forget (like zoom) start fresh each time", () => {
    clear();
    open().change("t-zoom", "250");
    expect(open().$("t-zoom").value).toBe("100", "zoom:");
    clear();
  });

  test("Reset settings puts back the page's own defaults and forgets the saved ones", () => {
    clear();
    const page = open();
    page.change("t-size", "95"); page.change("t-rim", false);
    page.$("resetSettings").click();
    expect(page.$("t-size").value).toBe("80", "number back to default:");
    expect(page.$("t-rim").checked).toBe(true, "switch back to default:");
    expect(open().$("t-size").value).toBe("80", "still default next time:");
    clear();
  });

  test("an unknown saved choice for a list is ignored instead of leaving it blank", () => {
    clear();
    try { localStorage.setItem(KEY, JSON.stringify({ "t-res": "9.9" })); } catch { return; }
    expect(open().$("t-res").value).toBe("0.25", "list:");
    clear();
  });
})();
