import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, snap, superscript } from '../site/js/lib/format.js';

test('test_format_significant_figures', () => {
  assert.equal(fmt(9.81), '9.81');
  assert.equal(fmt(0.5), '0.500');
  assert.equal(fmt(2), '2.00');
  assert.equal(fmt(-2), '−2.00');
  assert.equal(fmt(12345), '12300'); // not "1.23e+4"
  assert.equal(fmt(0), '0.00');
});

test('test_format_scientific_notation_like_students_write_it', () => {
  assert.equal(fmt(1.6e-19), '1.60 × 10⁻¹⁹');
  assert.equal(fmt(3e8), '3.00 × 10⁸');
  assert.equal(fmt(-9.11e-31), '−9.11 × 10⁻³¹');
  assert.equal(superscript(-27), '⁻²⁷');
});

test('test_format_non_finite', () => {
  assert.equal(fmt(Infinity), '∞');
  assert.equal(fmt(NaN), '—');
  assert.equal(fmt(null), '—');
});

test('test_format_snap_is_relative_not_absolute', () => {
  assert.equal(snap(1e-17, 0.3), 0);
  assert.equal(snap(1.6e-19, 1.6e-19), 1.6e-19); // a real charge is not residue
});
