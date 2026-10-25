// Remembers each maker's settings between visits, in this browser on this computer.
// Every input and select in .controls is saved when it changes and put back when the page opens.
// Mark one with data-forget to leave it out (things that belong to one picture, like zoom).
// The Reset settings button (#resetSettings) puts back the page's own defaults.
// Shared by every maker page; load it after the page's app.js, so the page hears the changes.
window.Remember = (() => {
  // root: where to find .controls and #resetSettings, key: where the settings are stored.
  function attach(root, key) {
    const fields = [...root.querySelectorAll(".controls input, .controls select")]
      .filter(el => el.id && el.type !== "file" && !("forget" in el.dataset));
    const value = el => (el.type === "checkbox" ? el.checked : el.value);
    const setValue = (el, v) => {
      if (el.type === "checkbox") el.checked = v === true;
      else if (el.tagName !== "SELECT" || [...el.options].some(opt => opt.value === v)) el.value = v;
    };
    const original = el => {
      if (el.type === "checkbox") return el.defaultChecked;
      if (el.tagName === "SELECT") return ([...el.options].find(opt => opt.defaultSelected) || el.options[0]).value;
      return el.defaultValue;
    };

    // Tell the page these settings changed, so it updates its previews and the numbers beside
    // sliders. Last to first: a page may wait a moment and then run only the last update it was
    // asked for, and the settings near the top (like the cookie cutter's background) ask for the
    // most complete one.
    const announce = els => els.slice().reverse().forEach(el => el.dispatchEvent(new Event("input", { bubbles: true })));

    function load() {
      try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
    }
    function save() {
      try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(fields.map(el => [el.id, value(el)])))); }
      catch { /* storage blocked (for example a private window): just don't remember */ }
    }

    const saved = load();
    const changed = fields.filter(el => el.id in saved && value(el) !== saved[el.id]);
    changed.forEach(el => setValue(el, saved[el.id]));
    announce(changed);

    fields.forEach(el => { el.addEventListener("input", save); el.addEventListener("change", save); });
    const reset = root.querySelector("#resetSettings");
    if (reset) reset.addEventListener("click", () => {
      const different = fields.filter(el => value(el) !== original(el));
      different.forEach(el => setValue(el, original(el)));
      announce(different);
      try { localStorage.removeItem(key); } catch { /* nothing was stored */ }
    });
  }

  if (document.querySelector(".controls")) attach(document, "print-workshop:" + document.title);
  return { attach };
})();
