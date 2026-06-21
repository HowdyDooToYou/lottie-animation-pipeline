# MoreProof Lottie Pipeline 🎬

Lottie animation rendering, generation, and asset management for [moreproof.dev](https://moreproof.dev).

## Quick Start

```bash
cd moreproof-lottie
npm install
npm run dev          # Start preview + API on :3300
```

## Usage

### Iteration Workflow

Generate → Iterate → Promote → Clean

```bash
# 1. Generate initial version
npm run gen -- hero "slide transition with brand colors"

# 2. Preview in public/animations/staging/hero-current.json, iterate prompts
npm run gen -- hero "smoother slide with gold accent"
# Previous version archived: staging/hero-2026-06-21T01-15-56.json

# 3. When confirmed, promote to final/
npm run promote hero

# 4. Clean up staging
npm run cleanup hero          # Clean specific animation's staging
npm run cleanup --all         # Clean all staging
```

**Directory structure:**
```
public/animations/
├── staging/          # Iteration sandbox (gitignored)
│   ├── <name>-current.json
│   └── <name>-<ts>.json    # Archived iterations
└── final/            # Production-ready (committed)
    └── <name>.json
```

### CLI Generation (Direct)
```bash
# Generate and save directly (useful for scripts/batch)
npm run gen -- "pulsing circle in brand blue" my-animation.json

# With motion preset
npm run gen -- "slide transition" slide.json premium
npm run gen -- "success checkmark" check.json energetic

# Presets: premium | energetic | subtle | technical
```

### Browser Generation
1. Start the dev server: `npm run dev`
2. Open http://localhost:3300
3. Type a prompt in the right panel (e.g. "pulsing circle")
4. Click **"✨ Generate from Prompt"**
5. Animation appears in your list and auto-plays

### Validate Animations
```bash
npm run validate                    # Check public/animations/
npm run validate path/to/dir        # Check specific directory
```

### Drop Zone
Drag any `.json` Lottie file into the Animations panel for instant preview with timeline scrubbing.

## Architecture

```
moreproof-lottie/
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
│   ├── brand/              # MoreProof design tokens
│   │   └── moreproof-tokens  # Colors, motion presets, helpers
│   ├── App.tsx             # Main app with generate button
│   └── styles.css          # Dark theme UI
├── public/animations/      # Generated + imported animations
├── scripts/
│   ├── validate.ts         # Validate Lottie JSON files
│   └── generate.ts         # CLI generation entry point
├── vite-plugin-api.ts      # /api/generate middleware
└── prompts/                # Motion design prompts (WIP)
```

## Cost Model 💰

| Provider | Cost | Model | Speed | Use When |
|----------|------|-------|-------|----------|
| **Local Ollama (fast)** | **$0** | `qwen2.5:7b` | ~30s | Default — handles 80% of animations |
| Local Ollama (smart) | $0 | `gemma3:27b` | ~90s | Complex animations with many layers |
| OpenRouter free | $0 | `qwen3-coder:free` | ~5s | Fallback when Ollama is busy/offline |
| OpenRouter cheap | ~$0.01 | `deepseek-chat` | ~3s | Last resort cloud fallback |

**Typical cost: $0.00 per generation.** Uses local Ollama first, only hits cloud if local fails.

### Configuration (environment variables)

OpenRouter key is auto-loaded from the Linux keyring (`secret-tool lookup service openrouter`). Falls back to `OPENROUTER_API_KEY` env var if keyring lookup fails.

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
- [ ] Deploy preview as a shareable tool at moreproof.dev/lottie
- [ ] Add ComfyUI/OmniLottie integration for VLM-based generation
- [ ] Build animation library with tagging and search

## References

- [diffusionstudio/text-to-lottie](https://github.com/diffusionstudio/lottie) — Claude Code Lottie generation
- [kin3o](https://github.com/affromero/kin3o) — CLI Lottie generator
- [OmniLottie](https://github.com/openvglab/omnilottie) — CVPR 2026 VLM-based generator
- [LottieGPT](https://github.com/yisuanwang/LottieGPT) — CVPR 2026 + 660K dataset
- [lottie-react](https://www.npmjs.com/package/lottie-react) — React renderer
