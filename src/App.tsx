import { useState, useCallback, useMemo } from 'react';
import { LottiePreview } from './components/LottiePreview.tsx';
import { Timeline } from './components/Timeline.tsx';
import { AnimationList } from './components/AnimationList.tsx';
import { buildSystemPrompt, FEW_SHOT_EXAMPLES, isLottieJson, autoFixLottie } from './generator/index.ts';
import { buildReviewCardData, type AnimationGenerationMeta } from './generator/review-card.ts';

interface AnimationEntry {
  name: string;
  path: string;
  data: Record<string, unknown>;
  generation?: AnimationGenerationMeta;
}

function App() {
  const [animations, setAnimations] = useState<AnimationEntry[]>(() =>
    Object.entries(FEW_SHOT_EXAMPLES).map(([key, example]) => ({
      name: key,
      path: `builtin:${key}`,
      data: example.animation as unknown as Record<string, unknown>,
    })),
  );
  const [selectedName, setSelectedName] = useState<string | null>(animations[0]?.name ?? null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selected = animations.find((a) => a.name === selectedName);
  const reviewCard = useMemo(() => {
    if (!selected) return null;
    return buildReviewCardData(selected);
  }, [selected]);

  const handleLoadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        let raw = JSON.parse(reader.result as string);
        if (!isLottieJson(raw)) {
          raw = autoFixLottie(raw);
        }
        const entry: AnimationEntry = {
          name: file.name.replace(/\.json$/, ''),
          path: `file:${file.name}`,
          data: raw,
        };
        setAnimations((prev) => [...prev, entry]);
        setSelectedName(entry.name);
      } catch (e) {
        console.error('Invalid JSON file:', e);
        alert('Failed to parse Lottie JSON file.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleGenerateSystemPrompt = useCallback(() => {
    const sysPrompt = buildSystemPrompt();
    setGeneratedPrompt(sysPrompt);
  }, []);

  const handleGenerateAnimation = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Enter a description first!');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (data.success && data.animation) {
        const entry: AnimationEntry = {
          name: `generated-${Date.now()}`,
          path: 'generated',
          data: data.animation,
          generation: {
            provider: data.provider,
            model: data.model,
            score: data.score,
            passed: data.passed,
            iterations: data.iterations,
          },
        };
        setAnimations((prev) => [...prev, entry]);
        setSelectedName(entry.name);
        alert('✅ Animation generated! Find it in your list.');
      } else {
        alert('❌ Generation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Generation error:', err);
      alert('❌ Could not connect to generation server.');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎬 Lottie Animation Pipeline</h1>
        <span className="version">v0.1.0</span>
      </header>

      <div className="app-layout">
        {/* Left panel: Animation list */}
        <aside className="panel panel-left">
          <h2>Animations</h2>
          <AnimationList
            animations={animations}
            selected={selectedName}
            onSelect={setSelectedName}
            onLoadFile={handleLoadFile}
          />
        </aside>

        {/* Center: Preview + Timeline */}
        <main className="panel panel-center">
          <div className="preview-area">
            <LottiePreview
              animationData={selected?.data ?? null}
              onFrameChange={handleFrameChange}
            />
          </div>
          {selected && (
            <>
              <Timeline
                currentFrame={currentFrame}
                totalFrames={(selected.data.op as number) || 0}
                fps={(selected.data.fr as number) || 60}
                onSeek={() => {}}
              />
              {reviewCard && (
                <section className="review-card">
                  <div className="review-card-header">
                    <div>
                      <h3>{reviewCard.title}</h3>
                      <p>{reviewCard.sourceLabel}</p>
                    </div>
                    <div className="review-badges">
                      {reviewCard.badges.map((badge) => (
                        <span key={badge} className="review-badge">{badge}</span>
                      ))}
                    </div>
                  </div>
                  <div className="review-metrics">
                    <div><span>Duration</span><strong>{reviewCard.metrics.duration}</strong></div>
                    <div><span>Frames</span><strong>{reviewCard.metrics.frames}</strong></div>
                    <div><span>Canvas</span><strong>{reviewCard.metrics.canvas}</strong></div>
                    <div><span>Motion</span><strong>{reviewCard.metrics.motion}</strong></div>
                  </div>
                  {reviewCard.generation && (
                    <div className="review-generation">
                      <span><strong>Provider:</strong> {reviewCard.generation.provider || 'unknown'}</span>
                      <span><strong>Model:</strong> {reviewCard.generation.model || 'unknown'}</span>
                      <span><strong>Score:</strong> {reviewCard.generation.score ?? 'n/a'}</span>
                      <span><strong>Iterations:</strong> {reviewCard.generation.iterations ?? 'n/a'}</span>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>

        {/* Right panel: Generator tools */}
        <aside className="panel panel-right">
          <h2>Generator Tools</h2>

          <div className="tool-section">
            <h3>Prompt → Animation</h3>
            <textarea
              className="prompt-input"
              placeholder="Describe your animation…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="tool-hint">
              Copy the system prompt below, then use it with Claude Code, Codex, or your LLM of choice.
            </p>
          </div>

          <div className="tool-section">
            <h3>Motion Presets</h3>
            <div className="preset-grid">
              {(['premium', 'energetic', 'subtle', 'technical'] as const).map((p) => (
                <button key={p} className="preset-btn" onClick={() => setPrompt(`Generate a ${p} animation: ${prompt}`)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="tool-section">
            <h3>Generate Animation</h3>
            <button
              className="generate-btn"
              disabled={isGenerating}
              onClick={() => handleGenerateAnimation()}
            >
              {isGenerating ? '🔄 Generating...' : '✨ Generate from Prompt'}
            </button>
          </div>

          <div className="tool-section">
            <h3>System Prompt</h3>
            <button className="generate-btn" onClick={handleGenerateSystemPrompt}>
              Generate System Prompt
            </button>
            {generatedPrompt && (
              <textarea
                className="system-prompt-output"
                readOnly
                value={generatedPrompt}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
            )}
          </div>

          <div className="tool-section">
            <h3>Brand Tokens</h3>
            <div className="color-swatches">
              {Object.entries({
                Navy: '#121F47',
                Blue: '#408FF5',
                Gold: '#FFC240',
                Mint: '#40D6AB',
                Coral: '#F56161',
                Charcoal: '#333844',
              }).map(([name, hex]) => (
                <div key={name} className="swatch" title={`${name} ${hex}`}>
                  <div className="swatch-color" style={{ background: hex }} />
                  <span className="swatch-label">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
