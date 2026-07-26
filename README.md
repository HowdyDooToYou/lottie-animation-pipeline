<p align="center">
  <strong>SOLIDDD</strong>
</p>

<h1 align="center">Motion that ships.</h1>

<p align="center">
  Prompt or recipe in. Certified Lottie, poster, preview, and proof out.<br />
  Built for humans, Claude Code, Codex, and any agent that can call a CLI or MCP tool.
</p>

<p align="center">
  <a href="https://github.com/HowdyDooToYou/lottie-animation-pipeline/actions/workflows/ci.yml"><img alt="Production validation" src="https://github.com/HowdyDooToYou/lottie-animation-pipeline/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE.md"><img alt="License: PolyForm Noncommercial" src="https://img.shields.io/badge/license-PolyForm%20Noncommercial-e95524" /></a>
  <img alt="Node 20+" src="https://img.shields.io/badge/node-%3E%3D20-11151b" />
</p>

<p align="center">
  <img src="docs/assets/production-motion-showcase.gif" width="960" alt="A responsive Lottie evidence flow rendered in desktop and mobile compositions." />
</p>

Soliddd is a provider-neutral motion compiler. A model, coding agent, human, or
deterministic recipe may propose an animation. Soliddd decides whether it is
safe to ship.

It strictly validates the Lottie structure, renders nine representative frames
in Chromium, measures visible pixels and meaningful motion, captures a
reduced-motion poster, hashes every artifact, and atomically promotes the bundle.
Anything below the bar returns a structured failure instead of production files.

## Try it

From this repository:

```bash
npm install
npm run soliddd -- create \
  "A calm checkout success state" \
  --id checkout-success
```

After the npm package is published:

```bash
npx soliddd-motion create \
  "A calm checkout success state" \
  --id checkout-success
```

The zero-key path uses a deterministic production recipe:

```text
soliddd-output/checkout-success/
├── animation.json       editable Lottie
├── poster.png           reduced-motion fallback
├── preview.html         portable offline review
├── certification.json   checks and raster evidence
└── manifest.json        hashes and provenance
```

Open `preview.html`. It contains its own player, respects
`prefers-reduced-motion`, and needs no server.

## Use it in code

```ts
import { createMotion } from "soliddd-motion";

const result = await createMotion({
  prompt: "Show three agents routing evidence into one verified decision",
  preset: "technical",
}, {
  outputDirectory: "./public/motion",
});

if (!result.ok) {
  throw new Error(result.issues.map((issue) => issue.message).join("\n"));
}

console.log(result.artifacts);
```

The default provider requires no model and no API key. Bring any model through
one small interface:

```ts
import { createMotion, defineMotionProvider } from "soliddd-motion";

const provider = defineMotionProvider(
  "my-studio-agent",
  async ({ systemPrompt, request, previousIssues }) => {
    return callMyModel({
      system: systemPrompt,
      prompt: request.prompt,
      feedback: previousIssues,
    });
  },
);

const result = await createMotion(
  { prompt: "A restrained save confirmation", maxAttempts: 3 },
  { provider },
);
```

Providers may return:

- a Lottie object;
- JSON text, including a fenced JSON block; or
- `{ animation, model?, recipe?, notes? }`.

Credentials, billing, and model SDKs stay in the host application. Soliddd owns
the stable request, certification, and artifact contracts.

## Use it from any agent

Machine-readable CLI:

```bash
npm run soliddd -- create "A system routing data into a decision" --json
```

Certify Lottie created by another agent:

```bash
npm run soliddd -- certify ./candidate.json \
  --prompt "A compact completion confirmation" \
  --json
```

Local MCP server:

```bash
npm run soliddd -- mcp
```

It exposes:

- `create_motion`
- `certify_motion`
- `list_motion_recipes`

The shared Agent Skill and both plugin manifests live in
[`plugins/soliddd-motion`](plugins/soliddd-motion):

```text
plugins/soliddd-motion/
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── .mcp.json
├── bin/soliddd-mcp.cjs
└── skills/create-motion/SKILL.md
```

Claude Code can load the bundle directly during development:

```bash
claude --plugin-dir ./plugins/soliddd-motion
```

The plugin launcher uses the repository or installed package locally when it is
available. A standalone marketplace installation falls back to the exact plugin
version of `soliddd-motion` through npm—never an unpinned latest release.

The same open Agent Skill works in Codex, ChatGPT, Claude Code, and other hosts
that implement the Agent Skills standard. See
[`docs/agent-integration.md`](docs/agent-integration.md) for SDK, CLI, MCP, and
plugin details.

## The SOLIDDD contract

Designed. Deployable. Defensible.

| Gate | Required evidence |
| --- | --- |
| Strict structure | Lottie schema passes without automatic repair |
| Motion quality | Quality score is at least 85/100 |
| Visible rendering | Every representative sample paints pixels |
| Meaningful motion | At least three sampled transitions materially change |
| Delivery budget | Animation JSON is at most 500 kB |
| Reduced motion | A PNG poster is captured from the certified render |
| Atomic release | The complete bundle is promoted together or not at all |
| Provenance | SHA-256 hashes, provider, recipe, attempts, and prompt hash |

The model is a collaborator, never the quality authority.

Read the full contract in
[`docs/soliddd-contract.md`](docs/soliddd-contract.md).

## Built-in recipes

```bash
npm run soliddd -- recipes
```

| Recipe | Best for |
| --- | --- |
| `signal-flow` | Agents, data routing, pipelines, integrations |
| `success-seal` | Checkout, save, completion, confirmation |
| `milestone-bloom` | Launches, goals, progress, achievement |
| `executive-orbit` | Hero sections, platforms, ecosystems, ambient intelligence |

Recipes are deterministic, editable, themeable, and browser-certified. They
make the first run instant while custom model providers remain completely open.

## Product architecture

```text
prompt, recipe, or candidate JSON
                 │
                 ▼
          stable motion request
                 │
       ┌─────────┴─────────┐
       │ any provider      │ deterministic recipes
       └─────────┬─────────┘
                 ▼
       untrusted Lottie candidate
                 │
        strict + browser gates
                 │
       ┌─────────┴─────────┐
       │                   │
  structured failure   SOLIDDD bundle
```

The existing semantic motion specifications, responsive topology contracts,
runtime playback policy, and production Lottie builders remain available under
[`src/generator`](https://github.com/HowdyDooToYou/lottie-animation-pipeline/tree/master/src/generator).
Soliddd is the simpler public compiler surface over that proven engine.

## Development

```bash
npm run dev              # Product studio on http://localhost:3300
npm test                 # Unit + real Chromium tests
npm run build            # Studio + typed SDK + CLI
npm run check:production # Assets, tests, build, schema, browser rendering
npm run check:release    # Complete public release gate
```

Production builds write the npm SDK/CLI to `dist/` and the deployable product
studio to `studio-dist/`.

Coding agents entering the repository receive the same non-negotiable verifier
rules through [`AGENTS.md`](AGENTS.md) and [`CLAUDE.md`](CLAUDE.md).

Chrome or Chromium is required for certification. Soliddd auto-detects common
Linux, macOS, and Windows installations. Set `CHROMIUM_BIN` or pass
`--chromium <path>` when needed.

Chromium's sandbox remains enabled by default. Root-run containers automatically
receive the required no-sandbox flags; other containerized environments can set
`SOLIDDD_CHROMIUM_NO_SANDBOX=1` explicitly.

Node 20+ is supported.

## Source and commercial use

The source is publicly inspectable. Noncommercial use is permitted under the
[PolyForm Noncommercial License 1.0.0](LICENSE.md).

Commercial production, client delivery, product embedding, hosted generation,
and redistribution require a [commercial license](COMMERCIAL-LICENSING.md).
Indicative launch plans begin at **$249/year for creators**, **$999/year for
studios**, and **$4,800/year for Product/OEM use**.

Provider/API charges and terms remain the operator's responsibility.

## Security and release integrity

- No provider credentials are required by the core package.
- The library does not inspect consumer CLI credentials.
- Provider errors are redacted before they enter structured results.
- Executable expressions, image/audio layers, external assets, and remote fonts
  are rejected before rendering.
- Certification uses the expression-free light player in a network-blocked
  Chromium page.
- Failed candidates never enter the output bundle.
- Dependency licensing, secrets, private paths, schema validity, and Chromium
  rendering are checked by `npm run check:release`.

See [SECURITY.md](SECURITY.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
and [the public release audit](docs/public-release-audit.md).
