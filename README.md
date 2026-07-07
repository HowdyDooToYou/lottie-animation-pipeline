# Lottie Animation Pipeline 🎬

Lottie animation rendering, generation, and asset management. A reusable pipeline for any project needing Lottie animations.

## Quick Start

```bash
cd /home/tempest/lottie-animation-pipeline
npm install
npm run dev          # Start preview + API on :3300
```

## Usage

### Iteration Workflow

Generate → Quality Gate → Auto-Promote (like proposal-operator)

```bash
# Generate (quality-gated loop, up to 3 iterations)
npm run gen -- hero "sliding indicator bars with blue and gold"

# That's it. Final animations land in public/animations/final/ directly.
# If the quality gate passes (score >= 60/100), it auto-promotes.
# If not, the system retries up to 3 times with refined prompts.
# Best result is always saved, even if it doesn't reach threshold.
```

**Quality gate checks:**
1. Valid Lottie JSON structure (zod schema + auto-fix)
2. Duration within 0.25–10s bounds
3. Minimum 2 shape layers
4. Uses brand colors from tokens
5. Has animated keyframes (not static)
6. Transform-based animation (no shape geometry hacks)

**Motion design baked into the AI prompt:**
- Exponential easings only (ease-out-quart, ease-out-expo)
- Stagger between layers (2–4 frames)
- Transforms + opacity only (Impeccable rule)
- No bounce/elastic — that's AI slop

**Files in `public/animations/final/` are confirmed assets.**
Never delete without asking the user.

### CLI (Direct)
```bash
# Motion presets
npm run gen -- hero "page slide" premium
npm run gen -- cta "button pulse" energetic
npm run gen -- idle "ambient breathing" subtle
npm run gen -- chart "bar chart animate" technical
```

### Browser Generation
1. Start the dev server: `npm run dev`
2. Open http://localhost:3300
3. Type a prompt in the right panel (e.g. "pulsing circle")
4. Click **"✨ Generate from Prompt"**
5. Animation appears in your list and auto-plays

### Batch Generation (manifest-driven)
```bash
npm run generate:batch                        # all of animations/manifest.json (cached)
npm run generate:batch -- --id pulse-ring-01  # one animation by id
npm run generate:batch -- --force             # ignore cache
npm run generate:batch -- --dry-run           # preview prompts only
```
Reports land in `reports/generation-<timestamp>.json`.

### Validate Animations
```bash
npm run validate                    # Strict schema check, recursive (exits 1 on invalid)
npm run validate -- path/to/dir     # Check specific directory
npm run validate:render             # Headless-browser render test + screenshots
```

### Export to a Project
```bash
npm run export -- --to /path/to/project/public/animations
```
Copies only strictly-valid JSON plus an `animations-manifest.json` index.

**Full agent-facing docs: [LOTTIE_PIPELINE_GUIDE.md](LOTTIE_PIPELINE_GUIDE.md)**

### Drop Zone
Drag any `.json` Lottie file into the Animations panel for instant preview with timeline scrubbing.

## Architecture

```
lottie-animation-pipeline/
├── src/
│   ├── components/         # React preview components
│   │   ├── LottiePreview   # Player with playback controls
│   │   ├── Timeline        # Scrubbable frame timeline
│   │   └── AnimationList   # File list + drag-and-drop
│   ├── generator/          # Text-to-Lottie pipeline
│   │   ├── client          # Multi-provider fallback client
│   │   ├── system-prompt   # AI generation prompt + cheatsheet
│   │   ├── schema          # Zod validation for Lottie JSON
│   │   └── index           # Pipeline exports
│   ├── brand/              # Design tokens
│   │   └── design-tokens   # Colors, motion presets, helpers
│   ├── App.tsx             # Main app with generate button
│   └── styles.css          # Dark theme UI
├── public/animations/      # Generated + imported animations
├── scripts/
│   ├── validate.ts         # Validate Lottie JSON files
│   └── generate.ts         # CLI generation entry point
├── vite-plugin-api.ts      # /api/generate middleware
└── LOTTIE_PIPELINE_GUIDE.md # Agent-facing pipeline docs
```

## Cost Model 💰

| Provider | Cost | Model | Speed | Use When |
|----------|------|-------|-------|----------|
| **Antigravity CLI** | **$0** | `gemini-3.5-flash` | ~10s | Default — Google AI Pro sub quota via `agy -p` |
| Gemini API | $0 | `gemini-3.5-flash` | ~5s | Separate AI Studio key quota bucket |
| Gemini CLI (legacy) | $0 | `gemini-3.5-flash` | fast-fail | Sunset for AI Pro accounts 2026-06-18 |
| Local Ollama (fast) | $0 | `qwen2.5:7b` | ~30s | Cloud quota exhausted |
| Local Ollama (smart) | $0 | `gemma3:27b` | ~90s | Complex animations with many layers |
| OpenRouter free | $0 | `qwen3-coder:free` | ~5s | Fallback when Ollama is busy/offline |
| OpenRouter cheap | ~$0.01 | `deepseek-chat` | ~3s | Last resort cloud fallback |

**Typical cost: $0.00 per generation.** Gemini quota buckets first, then local Ollama, cloud paid last.

### Configuration (environment variables)

- Antigravity: `agy` OAuth session (run `agy` interactively once) or `ANTIGRAVITY_API_KEY`; `ANTIGRAVITY_MODEL` default `gemini-3.5-flash`
- OpenRouter key: keyring `secret-tool lookup service openrouter`, fallback `OPENROUTER_API_KEY`
- Gemini API key: keyring `secret-tool lookup service gemini`, fallback `GEMINI_API_KEY`
- `LOTTIE_NO_GEMINI=1` skips all three Google providers

## Brand Presets

| Preset | Duration | Style | Use Case |
|--------|----------|-------|----------|
| **premium** | 1.2s | Smooth, confident | Executive polish, page transitions |
| **energetic** | 0.6s | Snappy, bouncy | CTAs, notifications |
| **subtle** | 2.0s | Gentle, ambient | Loading states, idle animations |
| **technical** | 1.5s | Precise, data-forward | Dashboards, metrics, charts |

## Brand Colors

```typescript
navy: #121F47 → [0.07, 0.13, 0.28, 1]
electricBlue: #408FF5 → [0.25, 0.56, 0.96, 1]
gold: #FFC240 → [1.0, 0.76, 0.25, 1]
mint: #40D6AB → [0.25, 0.84, 0.67, 1]
coral: #F56161 → [0.96, 0.38, 0.38, 1]
charcoal: #333844 → [0.20, 0.22, 0.27, 1]
```

## Next Steps

- [ ] Add export pipeline (MP4/WebM/GIF via headless Chrome + FFmpeg)
- [ ] Integrate LottieFiles marketplace search
- [ ] Add interactive state machine support (`.lottie` format)
- [ ] Deploy preview as a shareable tool
- [ ] Add ComfyUI/OmniLottie integration for VLM-based generation
- [ ] Build animation library with tagging and search

## References

- [diffusionstudio/text-to-lottie](https://github.com/diffusionstudio/lottie) — Claude Code Lottie generation
- [kin3o](https://github.com/affromero/kin3o) — CLI Lottie generator
- [OmniLottie](https://github.com/openvglab/omnilottie) — CVPR 2026 VLM-based generator
- [LottieGPT](https://github.com/yisuanwang/LottieGPT) — CVPR 2026 + 660K dataset
- [lottie-react](https://www.npmjs.com/package/lottie-react) — React renderer
