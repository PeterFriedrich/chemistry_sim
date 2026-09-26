// Every simulation the site hosts. The home page and the sim page both render
// from this list; tests/catalog.test.js checks that each entry has a module
// under js/sims/ exporting what sim-page.js needs.
//
// Units follow the Alberta Chemistry 20 and Chemistry 30 programs of study.

export const courses = [
  {
    id: 'c20',
    title: 'Chemistry 20',
    units: [
      { id: 'A', title: 'The Diversity of Matter and Chemical Bonding' },
      { id: 'B', title: 'Forms of Matter: Gases' },
      { id: 'C', title: 'Matter as Solutions, Acids, and Bases' },
      { id: 'D', title: 'Quantitative Relationships in Chemical Changes' },
    ],
  },
  {
    id: 'c30',
    title: 'Chemistry 30',
    units: [
      { id: 'A', title: 'Thermochemical Changes' },
      { id: 'B', title: 'Electrochemical Changes' },
      { id: 'C', title: 'Chemical Changes of Organic Compounds' },
      { id: 'D', title: 'Chemical Equilibrium Focusing on Acid–Base Systems' },
    ],
  },
];

export const sims = [
  {
    id: 'calorimetry',
    course: 'c30',
    unit: 'A',
    title: 'Simple Calorimetry',
    summary: 'Drop a hot metal block into water in a foam cup. The heat the metal loses is the heat the water gains.',
    concepts: ['Q = mcΔt', 'heat lost = heat gained', 'specific heat capacity'],
  },
  {
    id: 'hess',
    course: 'c30',
    unit: 'A',
    title: 'Enthalpy of Reaction from ΔfH°',
    summary: 'Pick a balanced reaction and get ΔrH from the Data Booklet’s formation enthalpies, drawn as an enthalpy diagram with the Hess route through the elements.',
    concepts: ['ΔrH = ΣnΔfH°(products) − ΣnΔfH°(reactants)', 'Hess’s law', 'ΔH = nΔrH'],
  },
  {
    id: 'voltaic',
    course: 'c30',
    unit: 'B',
    title: 'Voltaic Cell Builder',
    summary: 'Pick two half-cells from the Data Booklet’s redox table. See which is the cathode, the cell potential, the balanced net equation and which way electrons and ions move.',
    concepts: ['E°cell = E°cathode − E°anode', 'SOA and SRA', 'electron balance'],
  },
  {
    id: 'electrolysis',
    course: 'c30',
    unit: 'B',
    title: 'Electrolysis and Faraday’s Law',
    summary: 'Run a current through an aqueous electrolyte. Find the SOA and SRA from the redox table, then how much product forms: Q = It, n = Q/F, m = nM.',
    concepts: ['SOA and SRA with water', 'minimum voltage', 'Q = It, n = Q/F'],
  },
  {
    id: 'organic',
    course: 'c30',
    unit: 'C',
    title: 'Naming Organic Compounds',
    summary: 'Build a chain with branches, a double or triple bond, halogens or an –OH, and get its IUPAC name, formulas and line diagram — including when the longest chain is not the one you drew.',
    concepts: ['parent chain and numbering', 'alkanes, alkenes, alkynes', 'alcohols and organic halides'],
  },
  {
    id: 'lechatelier',
    course: 'c30',
    unit: 'D',
    title: 'Le Châtelier’s Principle',
    summary: 'Stress a system at equilibrium: add or remove a species, change the volume or the temperature, add a catalyst. Compare Q with Kc to predict the shift, then watch the concentrations settle.',
    concepts: ['Kc expression', 'Q vs Kc', 'only temperature changes Kc'],
  },
  {
    id: 'bronsted',
    course: 'c30',
    unit: 'D',
    title: 'Predicting Acid–Base Reactions',
    summary: 'Mix two solutions and use the Data Booklet’s acid table: list the entities, find the strongest acid and base, write the proton transfer and decide which side is favoured.',
    concepts: ['Brønsted–Lowry acids and bases', 'SA and SB from the table', 'products or reactants favoured'],
  },
  {
    id: 'titration',
    course: 'c30',
    unit: 'D',
    title: 'Acid–Base Titration Curves',
    summary: 'Titrate a strong or weak acid or base and watch the pH curve. Find the equivalence volume, the initial and equivalence pH, pKa at half-equivalence, and which indicator from the booklet fits.',
    concepts: ['n = cV, Veq', 'Ka, Kb = Kw/Ka', 'indicator choice'],
  },
];

export function findSim(id) {
  return sims.find((s) => s.id === id) ?? null;
}

export function unitOf(sim) {
  const course = courses.find((c) => c.id === sim.course);
  return { course, unit: course?.units.find((u) => u.id === sim.unit) };
}
