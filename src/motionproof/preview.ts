import type { MotionProofCertification } from './contracts.ts';

export function createPortablePreviewHtml(input: {
  animation: Record<string, unknown>;
  certification: MotionProofCertification;
  title: string;
  description: string;
  posterFrame: number;
  playerSource: string;
}): string {
  const animationJson = safeInlineJson(input.animation);
  const title = escapeHtml(input.title);
  const description = escapeHtml(input.description);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'">
  <title>${title} — MotionProof preview</title>
  <style>
    :root { color-scheme: dark; --ink: #f2eee6; --muted: #a9adb7; --stage: #11151b; --line: #303640; --signal: #ef6545; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px; background: #090c10; color: var(--ink); font: 15px/1.5 ui-sans-serif, system-ui, sans-serif; }
    main { width: min(920px, 100%); }
    header { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 18px; }
    h1 { margin: 0; font: 500 clamp(26px, 5vw, 48px)/1.04 Georgia, serif; letter-spacing: -.035em; }
    p { color: var(--muted); max-width: 62ch; }
    .cert { color: #d9f7ae; font-weight: 700; white-space: nowrap; }
    #stage { aspect-ratio: var(--ratio); width: 100%; max-height: 68vh; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; background: var(--stage); }
    #animation { width: 100%; height: 100%; }
    footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; color: var(--muted); font-size: 13px; }
    button { border: 1px solid var(--line); border-radius: 999px; padding: 8px 14px; background: #171c23; color: var(--ink); font: inherit; cursor: pointer; }
    button:hover { border-color: #626b78; }
    button:focus-visible { outline: 3px solid var(--signal); outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { .motion-note::after { content: " · poster frame"; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div><h1>${title}</h1><p>${description}</p></div>
      <div class="cert">MOTIONPROOF · ${input.certification.score}/100</div>
    </header>
    <section id="stage" style="--ratio:${Number(input.animation.w) || 1}/${Number(input.animation.h) || 1}" aria-label="${description}">
      <div id="animation"></div>
    </section>
    <footer>
      <span class="motion-note">Strict schema · 9-frame raster probe · reduced-motion ready</span>
      <button id="toggle" type="button">Pause motion</button>
    </footer>
  </main>
  <script>${input.playerSource.replace(/<\/script/gi, '<\\/script')}</script>
  <script>
    const data = ${animationJson};
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animation = lottie.loadAnimation({
      container: document.getElementById('animation'),
      renderer: 'svg',
      loop: !reduced,
      autoplay: !reduced,
      animationData: data
    });
    let playing = !reduced;
    animation.addEventListener('DOMLoaded', () => {
      if (reduced) animation.goToAndStop(Math.round((animation.totalFrames - 1) * ${input.posterFrame}), true);
    });
    const button = document.getElementById('toggle');
    button.textContent = playing ? 'Pause motion' : 'Play motion';
    button.addEventListener('click', () => {
      playing = !playing;
      if (playing) animation.play(); else animation.pause();
      button.textContent = playing ? 'Pause motion' : 'Play motion';
    });
  </script>
</body>
</html>`;
}

function safeInlineJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
