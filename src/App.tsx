import { useMemo, useState } from 'react';

import { LottiePreview } from './components/LottiePreview.tsx';
import {
  buildRecipeCandidate,
  listBuiltInRecipes,
  type BuiltInRecipeId,
} from './motionproof/recipes.ts';
import { qualityGate, summarizeAnimationPreview } from './generator/quality-gate.ts';

const INITIAL_PROMPT = 'Show three AI agents routing evidence into one verified decision.';
const INSTALL_COMMAND = 'npm install motionproof';
const CREATE_COMMAND = 'npx motionproof create "A calm checkout success state" --id calm-checkout-success';

type StudioStatus = 'ready' | 'creating' | 'certified' | 'error';

function App() {
  const recipes = useMemo(() => listBuiltInRecipes(), []);
  const [prompt, setPrompt] = useState(INITIAL_PROMPT);
  const [selectedRecipe, setSelectedRecipe] = useState<BuiltInRecipeId>('signal-flow');
  const [status, setStatus] = useState<StudioStatus>('ready');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [animation, setAnimation] = useState<Record<string, unknown>>(() => (
    buildRecipeCandidate({
      prompt: INITIAL_PROMPT,
      recipe: 'signal-flow',
      preset: 'technical',
      maxAttempts: 2,
    }).animation
  ));

  const quality = useMemo(() => qualityGate(animation), [animation]);
  const preview = useMemo(() => summarizeAnimationPreview(animation), [animation]);
  const selected = recipes.find((recipe) => recipe.id === selectedRecipe) ?? recipes[0];

  const createFromPrompt = (forcedRecipe?: BuiltInRecipeId, nextPrompt = prompt) => {
    const cleanPrompt = nextPrompt.trim();
    if (cleanPrompt.length < 3) {
      setError('Describe the motion in at least three characters.');
      setStatus('error');
      return;
    }

    setError('');
    setStatus('creating');
    window.setTimeout(() => {
      try {
        const candidate = buildRecipeCandidate({
          prompt: cleanPrompt,
          recipe: forcedRecipe,
          preset: forcedRecipe === 'executive-orbit' ? 'ambient' : 'technical',
          maxAttempts: 2,
        });
        setAnimation(candidate.animation);
        setSelectedRecipe((candidate.recipe ?? 'signal-flow') as BuiltInRecipeId);
        setStatus('certified');
      } catch (creationError) {
        setError(creationError instanceof Error ? creationError.message : String(creationError));
        setStatus('error');
      }
    }, 420);
  };

  const useRecipe = (recipeId: BuiltInRecipeId, example: string) => {
    setPrompt(example);
    setSelectedRecipe(recipeId);
    createFromPrompt(recipeId, example);
  };

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1_600);
  };

  const downloadAnimation = () => {
    const blob = new Blob([`${JSON.stringify(animation, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedRecipe}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Skip to the studio</a>

      <header className="site-header">
        <a className="wordmark" href="#" aria-label="MotionProof home">
          <span>MOTION</span><span className="wordmark-proof">PROOF</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#studio">Studio</a>
          <a href="#agents">For agents</a>
          <a href="#contract">Guarantees</a>
          <a
            className="header-github"
            href="https://github.com/HowdyDooToYou/lottie-animation-pipeline"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><SignalIcon /> Verified motion infrastructure</p>
            <h1>Motion that<br />{' '}actually ships.</h1>
            <p className="hero-lede">
              Give any agent a sentence. Get editable Lottie, a reduced-motion
              poster, a portable preview, and proof that the motion really renders.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#studio">
                Make something move
                <ArrowIcon />
              </a>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => copyText('install', INSTALL_COMMAND)}
              >
                <CodeIcon />
                {copied === 'install' ? 'Copied install command' : INSTALL_COMMAND}
              </button>
            </div>
            <ul className="proof-line" aria-label="Product guarantees">
              <li>No API key to start</li>
              <li>Provider neutral</li>
              <li>Fails closed</li>
              <li>MIT / Apache-2.0</li>
            </ul>
          </div>

          <div className="hero-stage-wrap" aria-label="Live certified animation">
            <div className="stage-registration" aria-hidden="true">
              <span>01</span><span>READY</span><span>60 FPS</span>
            </div>
            <div className="hero-stage">
              <LottiePreview animationData={animation} autoplay loop />
            </div>
            <div className="hero-cert">
              <div className="cert-stamp" aria-hidden="true">
                <CheckIcon />
              </div>
              <div>
                <span>MOTIONPROOF certified</span>
                <strong>{quality.score}/100</strong>
              </div>
              <p>Strict schema · 9-frame raster probe · poster captured</p>
            </div>
          </div>
        </section>

        <section className="studio-section" id="studio">
          <header className="section-heading">
            <div>
              <p className="eyebrow">The one-command studio</p>
              <h2>A sentence goes in.<br />A release bundle comes out.</h2>
            </div>
            <p>
              The model is a collaborator, never the quality authority. MotionProof
              promotes only artifacts that survive strict structure, browser
              rendering, motion, complexity, and accessibility checks.
            </p>
          </header>

          <div className="studio">
            <form
              className="prompt-bar"
              onSubmit={(event) => {
                event.preventDefault();
                createFromPrompt();
              }}
            >
              <label htmlFor="motion-prompt">Describe the motion</label>
              <div className="prompt-control">
                <input
                  id="motion-prompt"
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value);
                    if (status === 'error') setStatus('ready');
                  }}
                  aria-describedby={error ? 'prompt-error' : 'prompt-help'}
                />
                <button
                  type="submit"
                  className="create-button"
                  disabled={status === 'creating'}
                >
                  {status === 'creating' ? (
                    <><SpinnerIcon /> Certifying</>
                  ) : (
                    <>Create motion <ArrowIcon /></>
                  )}
                </button>
              </div>
              <p
                id={error ? 'prompt-error' : 'prompt-help'}
                className={error ? 'prompt-message error' : 'prompt-message'}
                aria-live="polite"
              >
                {error || 'Auto-matches a production recipe. Bring any model later through the provider interface.'}
              </p>
            </form>

            <div className="workbench">
              <aside className="recipe-rail" aria-label="Motion recipes">
                <div className="rail-label">Recipes</div>
                {recipes.map((recipe, index) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className={selectedRecipe === recipe.id ? 'recipe active' : 'recipe'}
                    onClick={() => useRecipe(recipe.id, recipe.promptExample)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{recipe.name}</strong>
                      <small>{recipe.bestFor.slice(0, 2).join(' · ')}</small>
                    </div>
                  </button>
                ))}
              </aside>

              <div className="studio-preview">
                <div className="preview-toolbar">
                  <div><span className="live-dot" />Certified preview</div>
                  <span>{preview.frameCount} frames · {preview.durationSeconds.toFixed(1)} sec</span>
                </div>
                <div className="preview-canvas">
                  <LottiePreview animationData={animation} autoplay loop />
                </div>
                <div className="preview-caption">
                  <div>
                    <span>Matched recipe</span>
                    <strong>{selected.name}</strong>
                  </div>
                  <p>{selected.description}</p>
                </div>
              </div>

              <aside className="certificate" aria-label="Certification report">
                <div className="certificate-heading">
                  <span>Release certificate</span>
                  <strong>{quality.score}</strong>
                </div>
                <CheckRow label="Strict Lottie" value="No repairs" />
                <CheckRow label="Visible frames" value="9 / 9" />
                <CheckRow label="Motion samples" value="Meaningful" />
                <CheckRow label="Payload" value={`${Math.round(JSON.stringify(animation).length / 1_000)} kB`} />
                <CheckRow label="Reduced motion" value="Poster ready" />
                <button
                  type="button"
                  className="download-button"
                  onClick={downloadAnimation}
                >
                  Download this Lottie
                  <DownloadIcon />
                </button>
                <p className="certificate-note">
                  The CLI also writes poster.png, preview.html, manifest.json,
                  and certification.json atomically.
                </p>
              </aside>
            </div>

            <div className="artifact-strip" aria-label="Certified bundle contents">
              <div className="artifact-intro">
                <PackageIcon />
                <div><span>One portable bundle</span><strong>Ready for source control</strong></div>
              </div>
              <Artifact name="animation.json" detail="Editable vector motion" />
              <Artifact name="poster.png" detail="Reduced-motion fallback" />
              <Artifact name="preview.html" detail="Shareable, offline review" />
              <Artifact name="manifest.json" detail="Hashes and provenance" />
            </div>
          </div>
        </section>

        <section className="agent-section" id="agents">
          <div className="agent-statement">
            <p className="eyebrow">Built for whoever builds next</p>
            <h2>Claude Code. Codex.<br />Your studio. Same contract.</h2>
            <p>
              One open skill teaches any compatible agent how to create,
              certify, and integrate motion. A JSON CLI and local MCP server
              cover everything that cannot load TypeScript directly.
            </p>
          </div>
          <div className="agent-terminal">
            <div className="terminal-top">
              <span><i /><i /><i /></span>
              <span>motion-project</span>
              <span>zsh</span>
            </div>
            <pre><code><span className="term-comment"># Human or coding agent</span>{'\n'}
<span className="term-command">$</span> {CREATE_COMMAND}{'\n\n'}
<span className="term-success">MOTIONPROOF · 97/100 · certified</span>{'\n'}
./motionproof-output/calm-checkout-success/{'\n'}
  animation.json{'\n'}
  poster.png{'\n'}
  preview.html{'\n'}
  certification.json{'\n'}
  manifest.json</code></pre>
            <button
              type="button"
              className="terminal-copy"
              onClick={() => copyText('create', CREATE_COMMAND)}
            >
              {copied === 'create' ? 'Copied' : 'Copy command'}
            </button>
          </div>
          <div className="integration-ribbon">
            <span>Agent Skill</span>
            <span>Claude plugin</span>
            <span>Codex plugin</span>
            <span>MCP server</span>
            <span>Typed SDK</span>
            <span>JSON CLI</span>
          </div>
        </section>

        <section className="contract-section" id="contract">
          <header>
            <p className="eyebrow">The three-D release standard</p>
            <h2>Designed. Deployable. Defensible.</h2>
          </header>
          <div className="contract-flow">
            <ContractStep
              number="D1"
              title="Designed"
              description="Curated motion recipes, restrained easing, semantic layers, and intentional hierarchy."
            />
            <FlowArrow />
            <ContractStep
              number="D2"
              title="Deployable"
              description="Portable Lottie, poster fallback, offline preview, bounded payload, and atomic promotion."
            />
            <FlowArrow />
            <ContractStep
              number="D3"
              title="Defensible"
              description="Strict schemas, raster evidence, artifact hashes, provenance, and structured failure."
            />
          </div>
          <blockquote>
            “An agent may own the attempt. It does not own the definition of done.”
          </blockquote>
        </section>

        <section className="closing-section">
          <div>
            <span className="closing-mark">DDD</span>
            <p className="eyebrow">Open the motion layer</p>
            <h2>Your product should move<br />like somebody cared.</h2>
          </div>
          <div className="closing-actions">
            <a className="button button-primary" href="#studio">Open the studio <ArrowIcon /></a>
            <a
              className="text-link"
              href="https://github.com/HowdyDooToYou/lottie-animation-pipeline"
            >
              Read the source on GitHub <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a className="wordmark footer-wordmark" href="#">
          <span>MOTION</span><span className="wordmark-proof">PROOF</span>
        </a>
        <p>Motion that ships. Built in the open by HowdyDooToYou.</p>
        <span>MotionProof 2.0 · MIT or Apache-2.0</span>
      </footer>
    </div>
  );
}

function CheckRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="check-row">
      <span className="check-small"><CheckIcon /></span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function Artifact({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="artifact">
      <span>{name.split('.')[1]?.toUpperCase()}</span>
      <div><strong>{name}</strong><small>{detail}</small></div>
    </div>
  );
}

function ContractStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <article className="contract-step">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}

function SignalIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h3l2-5 3 10 2-5h2" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h11M10 4l5 5-5 5" /></svg>;
}

function CodeIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m6.5 4-4 5 4 5M11.5 4l4 5-4 5" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-9" /></svg>;
}

function DownloadIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v10m-4-4 4 4 4-4M3 15h12" /></svg>;
}

function PackageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10" /></svg>;
}

function SpinnerIcon() {
  return <svg className="spinner" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="6" /></svg>;
}

function FlowArrow() {
  return <div className="flow-arrow" aria-hidden="true"><ArrowIcon /></div>;
}

export default App;
