// Form controls for the side panel. Each returns a small handle; sims read
// `.value` every frame rather than wiring callbacks, except where a change
// must reset the run (`onChange`).

let uid = 0;

function el(tag, attrs = {}, parent) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  parent?.appendChild(node);
  return node;
}

export function section(parent, title) {
  const box = el('fieldset', { class: 'group' }, parent);
  if (title) el('legend', { text: title }, box);
  return box;
}

export function slider(parent, { label, min, max, step, value, unit = '', digits }) {
  const id = `ctl-${++uid}`;
  const row = el('div', { class: 'ctl ctl-slider' }, parent);
  const head = el('div', { class: 'ctl-head' }, row);
  el('label', { for: id, html: label }, head);
  const num = el('input', { type: 'number', min, max, step, class: 'ctl-num', 'aria-label': `${label.replace(/<[^>]+>/g, '')} value` }, head);
  if (unit) el('span', { class: 'ctl-unit', html: unit }, head);
  const range = el('input', { id, type: 'range', min, max, step }, row);
  const dp = digits ?? Math.max(0, (String(step).split('.')[1] || '').length);
  const listeners = [];
  const show = (v) => {
    range.value = v;
    num.value = Number(v).toFixed(dp);
  };
  show(value);
  const emit = () => listeners.forEach((f) => f(Number(range.value)));
  range.addEventListener('input', () => {
    num.value = Number(range.value).toFixed(dp);
    emit();
  });
  num.addEventListener('change', () => {
    const v = Math.min(max, Math.max(min, Number(num.value)));
    show(Number.isFinite(v) ? v : value);
    emit();
  });
  return {
    get value() {
      return Number(range.value);
    },
    set value(v) {
      show(v);
    },
    onChange(f) {
      listeners.push(f);
      return this;
    },
  };
}

export function choice(parent, { label, options, value }) {
  const id = `ctl-${++uid}`;
  const row = el('div', { class: 'ctl ctl-choice' }, parent);
  el('label', { for: id, html: label }, row);
  const sel = el('select', { id }, row);
  options.forEach((o, i) => {
    const opt = el('option', { value: String(i), text: o.label }, sel);
    if (o.value === value) opt.selected = true;
  });
  const listeners = [];
  sel.addEventListener('change', () => listeners.forEach((f) => f(options[sel.selectedIndex].value)));
  return {
    get value() {
      return options[sel.selectedIndex].value;
    },
    set value(v) {
      const i = options.findIndex((o) => o.value === v);
      if (i >= 0) sel.selectedIndex = i;
    },
    get option() {
      return options[sel.selectedIndex];
    },
    onChange(f) {
      listeners.push(f);
      return this;
    },
  };
}

export function toggle(parent, { label, checked = false }) {
  const id = `ctl-${++uid}`;
  const row = el('div', { class: 'ctl ctl-toggle' }, parent);
  const box = el('input', { id, type: 'checkbox' }, row);
  box.checked = checked;
  el('label', { for: id, html: label }, row);
  const listeners = [];
  box.addEventListener('change', () => listeners.forEach((f) => f(box.checked)));
  return {
    get value() {
      return box.checked;
    },
    onChange(f) {
      listeners.push(f);
      return this;
    },
  };
}

export function buttons(parent, list) {
  const row = el('div', { class: 'ctl ctl-buttons' }, parent);
  return list.map(({ label, onClick, primary }) => {
    const b = el('button', { type: 'button', class: primary ? 'btn btn-primary' : 'btn', html: label }, row);
    b.addEventListener('click', onClick);
    return b;
  });
}

// Label/value rows. `set(id, text)` only touches the DOM when the text changes,
// since sims call it every frame.
export function readouts(parent, rows) {
  const dl = el('dl', { class: 'readouts' }, parent);
  const cells = {};
  for (const r of rows) {
    el('dt', { html: r.label }, dl);
    cells[r.id] = el('dd', { text: '—' }, dl);
  }
  return {
    set(id, str) {
      const c = cells[id];
      if (c && c.textContent !== str) c.textContent = str;
    },
  };
}

export { el };
