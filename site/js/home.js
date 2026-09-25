import { courses, sims } from './catalog.js';
import { el } from './lib/controls.js';

const root = document.getElementById('catalog');
root.textContent = '';

for (const course of courses) {
  const sec = el('section', { class: 'course' }, root);
  el('h2', { text: course.title }, sec);
  const units = el('div', { class: 'units' }, sec);
  for (const unit of course.units) {
    const u = el('div', { class: 'unit' }, units);
    el('h3', { text: `Unit ${unit.id} · ${unit.title}` }, u);
    const list = sims.filter((s) => s.course === course.id && s.unit === unit.id);
    if (!list.length) {
      el('p', { class: 'unit-empty', text: 'Coming soon.' }, u);
      continue;
    }
    const cards = el('div', { class: 'cards' }, u);
    for (const s of list) {
      const a = el('a', { class: 'card', href: `sim.html?id=${encodeURIComponent(s.id)}` }, cards);
      el('h4', { text: s.title }, a);
      el('p', { text: s.summary }, a);
      const tags = el('ul', { class: 'tags' }, a);
      for (const c of s.concepts) el('li', { text: c }, tags);
    }
  }
}
