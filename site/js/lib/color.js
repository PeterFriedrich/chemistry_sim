// Approximate display colour for a wavelength of visible light. Outside
// 380–750 nm there is nothing to see, so it returns null and callers draw the
// invisible (UV/IR) beam their own way.
export function wavelengthToRgb(nm) {
  if (nm < 380 || nm > 750) return null;
  let r = 0, g = 0, b = 0;
  if (nm < 440) [r, b] = [(440 - nm) / 60, 1];
  else if (nm < 490) [g, b] = [(nm - 440) / 50, 1];
  else if (nm < 510) [g, b] = [1, (510 - nm) / 20];
  else if (nm < 580) [r, g] = [(nm - 510) / 70, 1];
  else if (nm < 645) [r, g] = [1, (645 - nm) / 65];
  else r = 1;
  // Fade toward the edges of vision.
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (750 - nm)) / 50 : 1;
  const to = (v) => Math.round(255 * Math.pow(v * f, 0.8));
  return `rgb(${to(r)}, ${to(g)}, ${to(b)})`;
}

export function bandName(nm) {
  if (nm < 10) return 'X-ray';
  if (nm < 380) return 'ultraviolet';
  if (nm <= 750) return 'visible';
  return 'infrared';
}
