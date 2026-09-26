// Values students have in front of them: the Alberta Chemistry 30 Data Booklet
// ("Updated 2010"), transcribed in docs/DATA_SHEET.md. Never CODATA, never an
// inline literal in a sim. Units are the booklet's: g, kJ or J, kPa, L, mol, °C.

// Specific heat capacities at 298.15 K and 100.000 kPa, J/(g·°C).
export const specificHeat = {
  water: 4.19,
  air: 1.01,
  polystyreneCup: 1.01,
  copper: 0.385,
  aluminium: 0.897,
  iron: 0.449,
  tin: 0.227,
};

export const Kw = 1.0e-14; // water autoionization constant at 298.15 K
export const F = 9.65e4; // Faraday constant, C/mol e⁻
export const KELVIN_OFFSET = 273.15; // "25.00 °C is equivalent to 298.15 K"

// Not printed in the booklet: the textbook assumption that 1 mL of water has a
// mass of 1.00 g, used to turn "48 mL of water" into m for Q = mcΔt (DECISIONS).
export const WATER_DENSITY = 1.0; // g/mL
