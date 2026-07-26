export interface ShowcaseVariant {
  slug: string;
  label: string;
  preset: string;
  prompt: string;
  outputPath: string;
  score: number;
  passed: boolean;
  provider: string;
  model: string;
  metrics: {
    durationSeconds: number;
    frameCount: number;
    layerCount: number;
    animatedPropertyCount: number;
    brandColors: string[];
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function previewClass(slug: string): string {
  return `preview-${slug}`;
}

export function renderShowcaseHtml(title: string, variants: ShowcaseVariant[]): string {
  const passedCount = variants.filter((variant) => variant.passed).length;
  const avgScore = variants.length ? Math.round(variants.reduce((sum, variant) => sum + variant.score, 0) / variants.length) : 0;

  const cards = variants.map((variant) => `
    <section class="card">
      <div class="card-head">
        <div>
          <h2>${escapeHtml(variant.label)}</h2>
          <p class="slug">${escapeHtml(variant.slug)} · ${escapeHtml(variant.preset)}</p>
        </div>
        <span class="score ${variant.passed ? 'pass' : 'warn'}">${variant.score}/100</span>
      </div>
      <div class="preview ${previewClass(variant.slug)}">
        <div class="shape a"></div>
        <div class="shape b"></div>
        <div class="shape c"></div>
      </div>
      <div class="meta-grid">
        <div><span>Provider</span><strong>${escapeHtml(variant.provider)}</strong></div>
        <div><span>Model</span><strong>${escapeHtml(variant.model)}</strong></div>
        <div><span>Duration</span><strong>${variant.metrics.durationSeconds.toFixed(2)}s</strong></div>
        <div><span>Frames</span><strong>${variant.metrics.frameCount}</strong></div>
        <div><span>Layers</span><strong>${variant.metrics.layerCount}</strong></div>
        <div><span>Animated props</span><strong>${variant.metrics.animatedPropertyCount}</strong></div>
      </div>
      <p class="prompt">${escapeHtml(variant.prompt)}</p>
      <p class="path">${escapeHtml(variant.outputPath)}</p>
    </section>
  `).join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { --bg:#0b1020; --panel:#121a2b; --panel2:#0f1726; --text:#e8eefc; --muted:#9aa8c7; --border:#24314d; --blue:#408ff5; --gold:#ffc240; --mint:#40d6ab; }
    *{box-sizing:border-box} body{margin:0;font-family:"Avenir Next",Avenir,"Segoe UI",sans-serif;background:linear-gradient(180deg,#0a1220,#0b1020);color:var(--text)}
    .wrap{max-width:1200px;margin:0 auto;padding:28px 20px 60px}
    .hero,.card{background:var(--panel);border:1px solid var(--border);border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.2)}
    .hero{padding:24px;margin-bottom:20px}.hero h1{margin:0 0 8px;font-size:32px}.hero p{margin:0;color:var(--muted)}
    .summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.summary div{background:var(--panel2);border:1px solid var(--border);border-radius:14px;padding:12px}.summary span{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.summary strong{font-size:18px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}.card{padding:18px}.card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.card h2{margin:0 0 4px}.slug,.prompt,.path{color:var(--muted);font-size:13px}.score{padding:6px 10px;border-radius:999px;font-weight:700;border:1px solid var(--border)}.score.pass{color:#b6ffd4;border-color:rgba(64,214,171,.35)}.score.warn{color:#ffe5a8;border-color:rgba(255,194,64,.35)}
    .preview{position:relative;height:180px;margin:16px 0;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,rgba(18,31,71,.85),rgba(10,18,32,1));border:1px solid rgba(64,143,245,.15)}
    .shape{position:absolute;border-radius:999px;opacity:.95}
    .preview-indicator-bars .shape{height:16px;left:-30%;width:45%;animation:slide 1.6s cubic-bezier(.16,1,.3,1) infinite}.preview-indicator-bars .a{top:115px;background:linear-gradient(90deg,transparent,var(--blue))}.preview-indicator-bars .b{top:85px;background:linear-gradient(90deg,transparent,var(--blue));animation-delay:.18s}.preview-indicator-bars .c{top:55px;background:linear-gradient(90deg,transparent,var(--gold));animation-delay:.36s}
    .preview-pulse-ring .shape{inset:auto;left:50%;top:50%;transform:translate(-50%,-50%);border:3px solid var(--gold);background:transparent;animation:pulse 1.6s ease-out infinite}.preview-pulse-ring .a{width:70px;height:70px}.preview-pulse-ring .b{width:110px;height:110px;animation-delay:.25s;opacity:.55}.preview-pulse-ring .c{width:150px;height:150px;animation-delay:.5s;opacity:.28}
    .preview-loading-dots .shape,.preview-metric-rise .shape{bottom:34px;width:22px}.preview-loading-dots .shape{height:22px;border-radius:50%;animation:bob 1s ease-in-out infinite}.preview-loading-dots .a{left:34%;background:var(--blue)}.preview-loading-dots .b{left:46%;background:var(--mint);animation-delay:.15s}.preview-loading-dots .c{left:58%;background:var(--gold);animation-delay:.3s}
    .preview-metric-rise .shape{border-radius:10px 10px 4px 4px;animation:rise 1.4s ease-out infinite}.preview-metric-rise .a{left:34%;height:50px;background:var(--blue)}.preview-metric-rise .b{left:46%;height:78px;background:var(--gold);animation-delay:.18s}.preview-metric-rise .c{left:58%;height:106px;background:var(--mint);animation-delay:.3s}
    .meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.meta-grid div{background:var(--panel2);border:1px solid var(--border);border-radius:12px;padding:10px}.meta-grid span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.meta-grid strong{font-size:13px}
    .path{font-family:ui-monospace,monospace;overflow-wrap:anywhere}
    @keyframes slide{0%{transform:translateX(0);opacity:0}15%{opacity:1}55%{transform:translateX(145%);opacity:1}100%{transform:translateX(175%);opacity:0}}
    @keyframes pulse{0%{transform:translate(-50%,-50%) scale(.7);opacity:.85}100%{transform:translate(-50%,-50%) scale(1.35);opacity:0}}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
    @keyframes rise{0%,100%{transform:scaleY(.8);transform-origin:bottom}50%{transform:scaleY(1.08);transform-origin:bottom}}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>${escapeHtml(title)}</h1>
      <p>${variants.length} variants · ${passedCount} passed · avg score ${avgScore}/100</p>
      <div class="summary">
        <div><span>Variants</span><strong>${variants.length} variants</strong></div>
        <div><span>Passed</span><strong>${passedCount}</strong></div>
        <div><span>Average score</span><strong>${avgScore}/100</strong></div>
      </div>
    </section>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;
}
