import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fixed, snap, species, superscript } from '../site/js/lib/format.js';

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

test('test_format_fixed_decimal_places_like_the_booklet', () => {
  assert.equal(fixed(-890.5, 1), '−890.5');
  assert.equal(fixed(-1675.7, 1), '−1\u202f675.7');
  assert.equal(fixed(-10940.2, 1), '−10\u202f940.2');
  assert.equal(fixed(179.2, 1), '179.2');
  assert.equal(fixed(-890.4999999999999, 1), '−890.5'); // float residue from the sums
  assert.equal(fixed(-0.04, 1), '0.0');
  assert.equal(fixed(2.3, 2), '2.30');
  assert.equal(fixed(NaN, 1), '—');
});

test('test_format_species_subscripts_and_charges', () => {
  assert.equal(species('C6H12O6(s)'), 'C₆H₁₂O₆(s)');
  assert.equal(species('SO4^2-(aq)'), 'SO₄²⁻(aq)');
  assert.equal(species('Ag^+(aq)'), 'Ag⁺(aq)');
  assert.equal(species('Al^3+(aq)'), 'Al³⁺(aq)');
  assert.equal(species('Cl^-(aq)'), 'Cl⁻(aq)');
});
