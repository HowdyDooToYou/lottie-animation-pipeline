# Lottie Animation Pipeline

[![Production validation](https://github.com/HowdyDooToYou/lottie-animation-pipeline/actions/workflows/ci.yml/badge.svg)](https://github.com/HowdyDooToYou/lottie-animation-pipeline/actions/workflows/ci.yml)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue)](LICENSE.md)

Production motion infrastructure for semantic, responsive, accessible, and verifiably renderable Lottie animations.

> **Source available:** noncommercial use is permitted under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). Commercial production, client delivery, product embedding, hosted generation, and redistribution require a [paid commercial license](COMMERCIAL-LICENSING.md).

The pipeline combines deterministic production builders, model-assisted generation, reusable motion contracts, responsive composition, reduced-motion delivery, and browser-level promotion gates. It is built for teams that need animation assets they can defend in production—not merely JSON that happens to parse.

## See it in motion

<p align="center">
  <img src="docs/assets/production-motion-showcase.gif" width="960" alt="The same attribution-flow animation rendered simultaneously as a horizontal desktop composition and a recomposed vertical mobile composition. Evidence packets travel through persistent connectors into a decision hub and resolve as an attributed outcome." />
</p>

<p align="center"><sub>Real deterministic Lottie assets rendered in Chromium. Both responsive variants pass the production gate at 100/100.</sub></p>

[Inspect the desktop asset](public/animations/final/attribution-flow-01.json) · [Inspect the mobile asset](public/animations/final/attribution-flow-mobile-01.json) · [Read the production motion contract](docs/production-motion-system.md)

## Quick Start

```bash
npm install
npm run dev          # Start preview + API on :3300
```

Open `http://localhost:3300/quality-review.html` for a live, pauseable production review.

For the production motion contract, responsive attribution-flow assets, and promotion model, see [docs/production-motion-system.md](docs/production-motion-system.md).

## Commercial use

Launch plans begin at **$249/year for individual commercial creators**, **$999/year for studios**, and **$4,800/year for product/OEM use**. Paying customers can receive production-use rights and commercial rights to generated animation assets; embedding or offering the pipeline itself requires an explicit Product/OEM grant.

[Review plans and request a license →](COMMERCIAL-LICENSING.md)

## Fresh machine / CI setup

The pipeline runs anywhere Node 20+ runs; the defaults just assume the original
dev box. On a new machine or in CI, copy `.env.example` and set what you need:

1. **API keys** — set `OPENROUTER_API_KEY` (and/or `GEMINI_API_KEY`) as plain
   env vars. The Linux-keyring (`secret-tool`) lookups are optional fallbacks
   and silently skipped where unavailable.
2. **Skip local-only providers** — set `LOTTIE_NO_GEMINI=1` unless the `agy` /
   `gemini` CLIs are installed and authenticated. The Ollama lanes are skipped
   automatically when nothing listens on `OLLAMA_BASE` (default is a
   host-specific bridge on `:21434`; stock Ollama is `:11434`).
3. **Render validation needs a browser** — `puppeteer-core` ships no Chromium.
   Autodetection only checks Linux paths, so set `CHROMIUM_BIN` to a
   Chrome/Chromium executable on macOS/Windows/containers.

Minimal CI profile:

```bash
export OPENROUTER_API_KEY=...    # or GEMINI_API_KEY
export LOTTIE_NO_GEMINI=1
export CHROMIUM_BIN=/usr/bin/chromium   # container's browser
npm ci && npm run check:production
```

## Usage

### Iteration Workflow

Generate → Quality Gate → Auto-Promote (like proposal-operator)

```bash
# Generate (quality-gated loop, up to 3 iterations)
npm run gen -- hero "sliding indicator bars with blue and gold"

# That's it. Final animations land in public/animations/final/ directly.
# If the quality gate passes (score >= 85/100), it auto-promotes.
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
7. Required layer start timing (`st`) so lottie-web cannot silently hide generated layers
8. Chromium raster probe confirms representative frames paint visible pixels

High-value production assets add a second gate for semantic layer mapping, responsive companion variants, reduced-motion poster integrity, animated-channel budgets, meaningful motion across nine raster samples, and loop-seam continuity.

**Motion design baked into the AI prompt:**
- Exponential easings for transitions (ease-out-quart, ease-out-expo)
- Stagger between layers (2–4 frames)
- Transforms + opacity by default; trim paths only for progress/dataflow semantics
- No bounce/elastic — that's AI slop
- Linear easing only for declared constant-velocity transport, orbit, marquee, or spinner channels

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
npm run build:production-assets               # deterministic responsive flagship pair
```
Reports land in `reports/generation-<timestamp>.json`.

### Validate Animations
```bash
npm run validate                    # Strict schema check, recursive (exits 1 on invalid)
npm run validate -- path/to/dir     # Check specific directory
npm run validate:render             # Headless-browser render test + screenshots
npm run check:production            # Tests + build + strict validation + render gate
npm run check:public                # Licensing, secret, path, and dependency-license checks
npm run check:release               # Complete public production release gate
```

The default validators inspect only `public/animations/final/`, the supported export set. Rejected legacy inputs live in `public/animations/rejected/` for provenance and are never exported.

### Export to a Project
```bash
npm run export -- --to /path/to/project/public/animations
# Default: exports the manifest-backed release set only.
# Use --all only for library maintenance; use --only id1,id2 for a smaller release.
```
Copies only manifest-backed, strictly-valid JSON plus an `animations-manifest.json` index.

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

## Generation runtime cost

Provider and infrastructure costs below are operational estimates only. They do not include the commercial license required for business use of this software.

| Provider lane | Billing owner | Use when |
|---|---|---|
| Deterministic builders | None | Production-critical supported patterns |
| Local OpenAI-compatible endpoint | Operator | Private/local model generation |
| Gemini API | Operator's Google account | Model-assisted generation with an explicit API key |
| OpenRouter | Operator's OpenRouter account | Hosted multi-model fallback |
| Anthropic | Operator's Anthropic account | Explicitly configured high-capability fallback |
| Optional local CLIs | Operator | A supported CLI is installed and authenticated locally |

Deterministic production builders require no model call. Model-provider terms, quotas, supported model IDs, and pricing remain the operator's responsibility and can change independently of this project.

### Configuration (environment variables)

- Optional Antigravity-compatible CLI: configure `AGY_BIN`, authentication, and `ANTIGRAVITY_MODEL` for your installation
- OpenRouter key: keyring `secret-tool lookup service openrouter`, fallback `OPENROUTER_API_KEY`
- Gemini API key: keyring `secret-tool lookup service gemini`, fallback `GEMINI_API_KEY`
- `LOTTIE_NO_GEMINI=1` skips all three Google providers

## Brand Presets

| Preset | Duration | Style | Use Case |
|--------|----------|-------|----------|
| **premium** | 1.2s | Smooth, confident | Executive polish, page transitions |
| **energetic** | 0.6s | Snappy, expressive | CTAs, notifications |
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

## License

Copyright 2026 HowdyDooToYou. Noncommercial use is available under [PolyForm Noncommercial 1.0.0](LICENSE.md). See [commercial licensing](COMMERCIAL-LICENSING.md) for business, client, hosted, embedded, OEM, or redistribution rights. Third-party components remain under their respective licenses as listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
