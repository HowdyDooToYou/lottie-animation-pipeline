# Lottie Pipeline Guide (for Agents)

Generate brand-compliant, validated Lottie animations from text prompts. This guide is written for automated agents and humans driving the pipeline programmatically.

Run all commands from the repo root. (See README "Fresh machine / CI setup" for env configuration on a new host.)

## TL;DR

```bash
# One animation from the manifest
npm run generate:batch -- --id pulse-ring-01

# Everything in the manifest (cached entries are skipped)
npm run generate:batch

# Free-form one-off (name + prompt + optional preset)
npm run gen -- my-loader "three dots orbiting in electric blue" subtle

# Verify: strict schema, then real headless-browser render
npm run validate
npm run validate:render

# Ship to a consuming project (only strictly-valid files are copied)
npm run export -- --to /path/to/project/public/animations
```

Outputs land in `public/animations/final/<id>.json`. Every batch run writes a machine-readable report to `reports/generation-<timestamp>.json`.

## How generation works

```
prompt → provider chain → JSON extraction → auto-fix → quality gate (score ≥ 85)
       ↺ up to 3 refined retries                    → promote to final/
```

Provider chain, tried in order (first success wins):

| # | Provider lane | Requirement |
|---|---|---|
| 1 | `antigravity-cli` | Optional compatible CLI installed and authenticated by the operator |
| 2 | `gemini-api` | Operator-supplied Google AI Studio key and supported model ID |
| 3 | `gemini-cli` | Optional legacy CLI installation |
| 4 | `ollama-fast` | Reachable local OpenAI-compatible endpoint |
| 5 | `ollama-smart` | Reachable local OpenAI-compatible endpoint |
| 6 | `openrouter-free` | Operator-supplied OpenRouter key and available model |
| 7 | `openrouter-cheap` | Operator-supplied OpenRouter key and available model |
| 8 | `anthropic` | Operator-supplied Anthropic key and supported model ID |

Environment knobs:

- `ANTIGRAVITY_MODEL` — model identifier accepted by the configured CLI; `AGY_BIN`, `AGY_TIMEOUT_MS`
- `ANTIGRAVITY_API_KEY` — alternative to agy browser OAuth (agy reads it natively)
- `GEMINI_MODEL` — legacy gemini providers' model (default `gemini-3.5-flash`)
- `GEMINI_API_KEY` — or keyring: `secret-tool store --label gemini service gemini`
- `LOTTIE_NO_GEMINI=1` — skip all three Google providers
- `OLLAMA_BASE`, `OPENROUTER_API_KEY` — as before

## Quality gate (what "passing" means)

Promotion to `final/` requires **strict** zod validity — auto-fixed output never
promotes, it is only kept as best-effort when all retries fail (`passed: false`
in the result/report; treat those as drafts needing regeneration).

Scored checks (pass ≥ 85/100): strict Lottie schema, required layer start timing, duration 0.25–10 s,
sane layer count, brand colors, animated keyframes (not static), shape layers.

Two extra verification layers, run them after any batch:

- `npm run validate` — strict schema over `public/animations/final/` (recursive); exits 1 on invalid files
- `npm run validate:render` — loads each JSON with lottie-web in headless Chromium, rasterizes representative frames, rejects non-painting or nearly-always-blank output, and writes screenshots to `reports/screenshots/`

## Manifest format (`animations/manifest.json`)

```json
{
  "version": "1.0",
  "animations": [
    {
      "id": "pulse-ring-01",
      "archetype": "pulse-ring",
      "name": "Form Submit Loading",
      "params": { "width": 200, "height": 200, "color": "#ffc240", "duration": 60 },
      "usage": "form submit / loading state"
    }
  ]
}
```

- `archetype` must match a slug in `src/generator/archetypes.ts`; use that source as the authoritative catalog because production archetypes evolve with the motion contract.
- `params` are folded into the prompt as hard constraints (canvas size, color, frame count)
- Caching: params are hashed; rerunning the batch skips unchanged entries. `--force` regenerates, `--dry-run` previews prompts without generating.

To add a new archetype: add an entry to `ARCHETYPES` in `src/generator/archetypes.ts` (slug, preset, intent, motionNotes), then reference it from the manifest.

## Reports

`reports/generation-<timestamp>.json` — one row per animation: status
(`generated` / `cached` / `failed`), score, iterations, provider, model,
duration. Use it to verify a batch without parsing console output.

## Exporting to a project

```bash
npm run export -- --to /path/to/project/public/animations
npm run export -- --to <dir> --only pulse-ring-01,check-mark-01
```

Copies only strictly-valid JSON and writes `animations-manifest.json`
(id, dimensions, frame count) alongside — consume that from the target app.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Antigravity CLI: auth required` | agy needs interactive sign-in | Run `agy` once in a real terminal, or set `ANTIGRAVITY_API_KEY` |
| `Antigravity CLI not found` | agy not installed | `curl -fsSL https://antigravity.google/cli/install.sh \| bash` |
| `Gemini CLI: auth required` | Legacy CLI sunset for AI Pro accounts | Ignore — antigravity-cli is the real path; this lane fails fast by design |
| `Gemini API key not set` | No AI Studio key configured | Create one at aistudio.google.com/apikey, store via `secret-tool store --label gemini service gemini` or `GEMINI_API_KEY` |
| All providers fail | Ollama bridge down + no cloud keys | Check `curl 127.0.0.1:21434/v1/models`; see reference_ollama_gpu_routing |
| `passed: false` in result | Best-effort save below threshold | Regenerate with `--force`, or refine the archetype's motionNotes |
| Render validation timeout | Animation invalid at runtime | Regenerate; check `npm run validate` output for schema issues |
| Generation loops/retries > 3× | Never — orchestrator hard-caps attempts | If you observe this, stop and report; do not re-invoke in a loop |

## Rules for agents

1. **Never delete files in `public/animations/final/` casually** — they are confirmed release assets; obtain maintainer approval.
2. Always run `npm run validate` (and ideally `validate:render`) after generating, before exporting.
3. Prefer `generate:batch` with a manifest entry over ad-hoc `gen` — it's cached, reported, and reproducible.
4. Deterministic builders do not call a model. All model-provider terms, quotas, and charges remain the operator's responsibility, and commercial product licensing still applies. Do not hammer retries; the orchestrator already retries with refined prompts.
