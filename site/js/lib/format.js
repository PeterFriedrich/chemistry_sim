// Number formatting for readouts: significant figures, and scientific notation
// written the way students write it (1.60 × 10⁻¹⁹), not as 1.6e-19.

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const minus = (s) => s.replace(/^-/, '−');

export function superscript(n) {
  return String(n).split('').map((ch) => SUP[ch] ?? ch).join('');
}

export function fmt(x, sig = 3) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '−∞';
  if (x === 0) return (0).toPrecision(sig);
  const ax = Math.abs(x);
  if (ax >= 1e5 || ax < 1e-3) {
    const [mant, exp] = x.toExponential(sig - 1).split('e');
    return `${minus(mant)} × 10${superscript(parseInt(exp, 10))}`;
  }
  const s = x.toPrecision(sig);
  // toPrecision switches to e-notation once the integer part has more digits than `sig`.
  return minus(s.includes('e') ? String(Number(s)) : s);
}

export function withUnit(x, unit, sig = 3) {
  const s = fmt(x, sig);
  return unit ? `${s} ${unit}` : s;
}

// Floating-point residue (x = 1e-17 m at equilibrium) would print as a real
// number in scientific notation. Snap values that are tiny *relative to the
// quantity's own scale* to zero. There is no absolute threshold: 1.60 × 10⁻¹⁹ C
// is a real charge.
export function snap(x, scale) {
  return Math.abs(x) < 1e-9 * Math.abs(scale) ? 0 : x;
}
