import lottie, { type AnimationItem } from 'lottie-web';
import './quality-review.css';

interface ReviewSample {
  id: string;
  title: string;
  description: string;
  dimensions: string;
  duration: string;
  score: string;
}

const samples: ReviewSample[] = [
  {
    id: 'sample-executive-orbit-01',
    title: 'Executive Intelligence Orbit',
    description: 'A restrained orbital system with a stable focal core, staggered nodes, and a single gold signal sweep.',
    dimensions: '400 × 400',
    duration: '2.0 seconds',
    score: '100 / 100 gate',
  },
  {
    id: 'sample-signal-convergence-01',
    title: 'Data Routing Panel',
    description: 'Persistent routing rails carry staggered packets into a processing hub with a precise confirmation response.',
    dimensions: '480 × 320',
    duration: '2.0 seconds',
    score: '100 / 100 gate',
  },
  {
    id: 'sample-milestone-bloom-01',
    title: 'Milestone Completion Seal',
    description: 'A visible baseline progresses into a gold completion sweep and mint check before returning cleanly to rest.',
    dimensions: '360 × 360',
    duration: '1.6 seconds',
    score: '100 / 100 gate',
  },
];

const root = document.querySelector<HTMLElement>('#review-root');
if (!root) throw new Error('Quality review root was not found');

root.innerHTML = `
  <header class="review-header">
    <div>
      <p class="eyebrow">Production output review</p>
      <h1>Three motion studies.<br><span>One uncompromising gate.</span></h1>
      <p class="lede">Each sample is strict-schema valid, paints visible pixels across representative frames, and renders in Chromium without runtime errors.</p>
    </div>
    <div class="review-actions">
      <button id="toggle-motion" type="button">Pause motion</button>
      <a href="/">Open pipeline</a>
    </div>
  </header>
  <section class="review-grid" aria-label="Production Lottie samples">
    ${samples.map((sample, index) => `
      <article class="sample-card ${index === 0 ? 'sample-card--featured' : ''}">
        <div class="sample-stage" id="stage-${sample.id}" aria-label="${sample.title} animation"></div>
        <div class="sample-copy">
          <div class="sample-index">0${index + 1}</div>
          <h2>${sample.title}</h2>
          <p>${sample.description}</p>
          <dl>
            <div><dt>Canvas</dt><dd>${sample.dimensions}</dd></div>
            <div><dt>Loop</dt><dd>${sample.duration}</dd></div>
            <div><dt>Validation</dt><dd>${sample.score}</dd></div>
          </dl>
        </div>
      </article>
    `).join('')}
  </section>
  <footer>
    <span>Reduced-motion preferences are respected automatically.</span>
    <span>Generated and verified 2026-07-21.</span>
  </footer>
`;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animations: AnimationItem[] = [];

let paused = reducedMotion;
const toggle = document.querySelector<HTMLButtonElement>('#toggle-motion');
if (toggle) {
  toggle.textContent = paused ? 'Play motion' : 'Pause motion';
  toggle.addEventListener('click', () => {
    paused = !paused;
    for (const animation of animations) paused ? animation.pause() : animation.play();
    toggle.textContent = paused ? 'Play motion' : 'Pause motion';
  });
}

async function loadSamples(): Promise<void> {
  for (const sample of samples) {
    const container = document.querySelector<HTMLElement>(`#stage-${sample.id}`);
    if (!container) continue;

    const response = await fetch(`/animations/final/${sample.id}.json`);
    if (!response.ok) throw new Error(`Could not load ${sample.id}: HTTP ${response.status}`);

    animations.push(lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: !reducedMotion,
      animationData: await response.json(),
      rendererSettings: { progressiveLoad: true },
    }));
  }
}

loadSamples().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  root.insertAdjacentHTML('beforeend', `<p class="review-error">Samples could not load. ${message}</p>`);
});
