// Canvas plumbing shared by every sim: HiDPI sizing, a metres→pixels view,
// theme colours pulled from CSS custom properties, and drawing primitives.

export function fitCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  const state = { ctx, w: 0, h: 0 };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.w = r.width;
    state.h = r.height;
    onResize?.(state);
  };
  new ResizeObserver(resize).observe(canvas);
  resize();
  return state;
}

// Maps a world box (metres, y up) into a pixel rectangle. `equal` keeps one
// scale for both axes so angles on screen are true angles.
export function makeView(rect, box, { equal = true, pad = 28 } = {}) {
  const { x = 0, y = 0, w, h } = rect;
  const iw = Math.max(1, w - 2 * pad);
  const ih = Math.max(1, h - 2 * pad);
  let sx = iw / (box.xMax - box.xMin);
  let sy = ih / (box.yMax - box.yMin);
  if (equal) sx = sy = Math.min(sx, sy);
  const ox = x + pad + (iw - sx * (box.xMax - box.xMin)) / 2;
  const oy = y + pad + (ih - sy * (box.yMax - box.yMin)) / 2;
  return {
    sx,
    sy,
    px: (wx) => ox + (wx - box.xMin) * sx,
    py: (wy) => oy + (box.yMax - wy) * sy,
    wx: (px) => box.xMin + (px - ox) / sx,
    wy: (py) => box.yMax - (py - oy) / sy,
  };
}

let cached = null;
// Guarded so this module can be imported under node for the catalog tests.
const media = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-color-scheme: dark)') : null;
media?.addEventListener?.('change', () => (cached = null));

const TOKENS = [
  'bg', 'surface', 'ink', 'muted', 'grid', 'accent',
  'velocity', 'accel', 'force', 'gravity', 'normal', 'friction',
  'kinetic', 'potential', 'total', 'series-a', 'series-b',
];

// Canvas colours come from the same tokens as the page, so both themes work.
export function theme() {
  if (cached) return cached;
  const cs = getComputedStyle(document.documentElement);
  cached = {};
  for (const t of TOKENS) cached[t.replace(/-(\w)/g, (_, ch) => ch.toUpperCase())] = cs.getPropertyValue(`--c-${t}`).trim();
  cached.font = cs.getPropertyValue('--font-sans').trim() || 'system-ui, sans-serif';
  return cached;
}

export function clear(ctx, w, h) {
  ctx.fillStyle = theme().surface;
  ctx.fillRect(0, 0, w, h);
}

export function font(size = 13, weight = 500) {
  return `${weight} ${size}px ${theme().font}`;
}

export function text(ctx, str, x, y, { color, size = 13, weight = 500, align = 'left', baseline = 'middle' } = {}) {
  ctx.fillStyle = color ?? theme().ink;
  ctx.font = font(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(str, x, y);
}

export function line(ctx, x1, y1, x2, y2, { color, width = 1.5, dash } = {}) {
  ctx.save();
  ctx.strokeStyle = color ?? theme().ink;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

// Arrow in pixel space from (x, y) by (dx, dy). Arrows shorter than the head
// are drawn as a dot so a zero vector is still visibly "zero", not missing.
export function arrow(ctx, x, y, dx, dy, { color, width = 2.5, head = 9, label, dash } = {}) {
  const len = Math.hypot(dx, dy);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = color ?? theme().ink;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (len < head * 0.8) {
    ctx.beginPath();
    ctx.arc(x, y, width + 1, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const ux = dx / len;
    const uy = dy / len;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx - ux * head * 0.8, y + dy - uy * head * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - ux * head - uy * head * 0.5, y + dy - uy * head + ux * head * 0.5);
    ctx.lineTo(x + dx - ux * head + uy * head * 0.5, y + dy - uy * head - ux * head * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (label) {
    const off = len < 1 ? 0 : 14 / len;
    subText(ctx, label, x + dx * (1 + off), y + dy * (1 + off) + (len < 1 ? -14 : 0), {
      color, size: 13, weight: 650, align: 'center',
    });
  }
}

// Text with one subscript, written `F_net` or `v_x rest`: canvas has no
// markup, and Unicode lacks subscript letters for most symbols (there is no
// subscript g).
export function subText(ctx, str, x, y, opts = {}) {
  const m = /^(.*?)_(\S+)(.*)$/.exec(str);
  if (!m) return text(ctx, str, x, y, opts);
  const { size = 13, weight = 500, align = 'left' } = opts;
  const [, base, sub, rest] = m;
  ctx.font = font(size, weight);
  const wBase = ctx.measureText(base).width;
  const wRest = ctx.measureText(rest).width;
  ctx.font = font(size * 0.72, weight);
  const wSub = ctx.measureText(sub).width;
  const total = wBase + wSub + wRest;
  let x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const o = { ...opts, align: 'left' };
  text(ctx, base, x0, y, o);
  text(ctx, sub, x0 + wBase, y + size * 0.3, { ...o, size: size * 0.72 });
  if (rest) text(ctx, rest, x0 + wBase + wSub, y, o);
}

// Saturating arrow length: near-proportional for small values, approaching
// `maxPx` for large ones (value = ref gives maxPx / 2), so one slider extreme cannot throw an arrow off-canvas. Direction is
// always exact; the magnitude lives in the readouts.
export function vecLen(value, ref, maxPx) {
  const s = Math.abs(value) / ref;
  return maxPx * (s / (1 + s)) * Math.sign(value);
}

export function grid(ctx, view, box, step, { color } = {}) {
  ctx.save();
  ctx.strokeStyle = color ?? theme().grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(box.xMin / step) * step; gx <= box.xMax + 1e-9; gx += step) {
    ctx.moveTo(view.px(gx), view.py(box.yMin));
    ctx.lineTo(view.px(gx), view.py(box.yMax));
  }
  for (let gy = Math.ceil(box.yMin / step) * step; gy <= box.yMax + 1e-9; gy += step) {
    ctx.moveTo(view.px(box.xMin), view.py(gy));
    ctx.lineTo(view.px(box.xMax), view.py(gy));
  }
  ctx.stroke();
  ctx.restore();
}

// A "nice" grid step (1, 2 or 5 × 10ⁿ) giving roughly `target` divisions.
export function niceStep(span, target = 8) {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
}
