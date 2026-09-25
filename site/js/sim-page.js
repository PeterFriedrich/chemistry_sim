// Loads one sim into sim.html from ?id=<sim id>. The sim module supplies
// `equations`, `prompts`, optional `legend`, and `mount(ui)`.
import { findSim, unitOf } from './catalog.js';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id');
const sim = id && findSim(id);

function fail(msg) {
  $('sim-root').innerHTML = '';
  const box = document.createElement('div');
  box.className = 'error';
  box.innerHTML = `<p>${msg}</p><p><a href="./">Back to all simulations</a></p>`;
  $('sim-root').appendChild(box);
}

if (!sim) {
  fail('That simulation does not exist.');
} else {
  const { course, unit } = unitOf(sim);
  document.title = `${sim.title} · Chemistry Sims`;
  $('sim-heading').textContent = sim.title;
  $('sim-summary').textContent = sim.summary;
  $('sim-badge').textContent = `${course.title} · Unit ${unit.id}: ${unit.title}`;

  import(`./sims/${sim.id}.js`)
    .then((mod) => {
      for (const eq of mod.equations) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="eq">${eq.html}</span><span class="what">${eq.what ?? ''}</span>`;
        $('sim-equations').appendChild(li);
      }
      for (const p of mod.prompts) {
        const li = document.createElement('li');
        li.innerHTML = p;
        $('sim-prompts').appendChild(li);
      }
      for (const item of mod.legend ?? []) {
        const span = document.createElement('span');
        span.innerHTML = `<i style="background: var(--c-${item.color})"></i>${item.label}`;
        $('sim-legend').appendChild(span);
      }
      if (mod.tallOnMobile) $('sim-canvas').parentElement.classList.add('tall');
      mod.mount({
        canvas: $('sim-canvas'),
        controls: $('sim-controls'),
        readouts: $('sim-readouts'),
        transport: $('sim-transport'),
      });
    })
    .catch((err) => {
      console.error(err);
      fail('This simulation failed to load.');
    });
}
