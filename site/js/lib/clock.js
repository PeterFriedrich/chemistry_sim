// Simulation clock + transport bar (play/pause, reset, slow motion). The
// animation frame always runs so a paused sim still redraws when a slider
// moves; only simulated time stops.
import { el } from './controls.js';

export function createClock(transport, { frame, onReset, speeds = [0.25, 0.5, 1, 2], speed = 1, autoplay = false }) {
  const clock = { t: 0, running: false, speed };

  const playBtn = el('button', { type: 'button', class: 'btn btn-primary', 'aria-label': 'Play' }, transport);
  const resetBtn = el('button', { type: 'button', class: 'btn', text: 'Reset' }, transport);
  const speedWrap = el('label', { class: 'speed' }, transport);
  el('span', { text: 'Speed' }, speedWrap);
  const speedSel = el('select', { 'aria-label': 'Playback speed' }, speedWrap);
  for (const s of speeds) {
    const o = el('option', { value: s, text: `${s}×` }, speedSel);
    if (s === speed) o.selected = true;
  }
  const timeOut = el('output', { class: 'clock-time' }, transport);

  const paint = () => {
    playBtn.textContent = clock.running ? 'Pause' : 'Play';
    playBtn.setAttribute('aria-label', clock.running ? 'Pause' : 'Play');
  };
  clock.play = () => {
    clock.running = true;
    paint();
  };
  clock.pause = () => {
    clock.running = false;
    paint();
  };
  clock.reset = () => {
    clock.t = 0;
    onReset?.();
  };
  clock.setTimeLabel = (s) => {
    if (timeOut.textContent !== s) timeOut.textContent = s;
  };

  playBtn.addEventListener('click', () => (clock.running ? clock.pause() : clock.play()));
  resetBtn.addEventListener('click', () => {
    clock.pause();
    clock.reset();
  });
  speedSel.addEventListener('change', () => (clock.speed = Number(speedSel.value)));

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dSim = clock.running ? dt * clock.speed : 0;
    clock.t += dSim;
    frame(clock, dSim);
    requestAnimationFrame(tick);
  };
  paint();
  if (autoplay) clock.play();
  requestAnimationFrame(tick);
  return clock;
}
