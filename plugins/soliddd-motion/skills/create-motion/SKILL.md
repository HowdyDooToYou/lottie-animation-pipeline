---
name: create-motion
description: Create, certify, or integrate production Lottie motion from a prompt, deterministic recipe, or existing JSON candidate. Use for animated UI states, loaders, success feedback, data flows, hero motion, reduced-motion posters, Lottie validation, or any request that must produce a shippable motion bundle. Do not use for generic photographic or raster-image generation.
---

# Create Motion

Produce a SOLIDDD bundle or return the structured failure. Never describe an
uncertified candidate as production-ready.

## Choose the route

- Start without a model or API key: use a built-in recipe.
- When another agent or model created Lottie JSON: certify that candidate.
- When application code owns model access: use the typed provider interface.
- When the host supports MCP: prefer the `create_motion`,
  `certify_motion`, and `list_motion_recipes` tools.

## Create from a prompt

Run:

```bash
npx soliddd-motion create "<motion intent>" --json
```

Add `--recipe <id>` only when the user selected a recipe. Add theme flags only
when real design tokens are available:

```bash
--primary '#2f70ff' --accent '#ef6545' --background '#11151b'
```

## Certify an existing candidate

Run:

```bash
npx soliddd-motion certify ./candidate.json \
  --prompt "<intended visual behavior>" \
  --json
```

Do not repair or silently promote a failed candidate. Use its structured
issues to revise the source, then certify again.

## Integrate the result

Require `ok: true` and `certification.certified: true`. Then:

1. Copy `animation.json` to the target app's supported asset location.
2. Use `poster.png` whenever reduced motion is requested or JavaScript motion
   is unavailable.
3. Keep `manifest.json` and `certification.json` with the release or CI
   evidence.
4. Use `preview.html` for offline review.
5. Respect the target repository's runtime, performance, and accessibility
   constraints. Do not introduce motion into a surface that explicitly
   excludes it.

## Typed provider

Keep credentials and model SDKs in the host application:

```ts
import { createMotion, defineMotionProvider } from "soliddd-motion";

const provider = defineMotionProvider("my-agent", async ({ systemPrompt, request }) => {
  const text = await callMyModel(systemPrompt, request.prompt);
  return text;
});

const result = await createMotion(
  { prompt: "A restrained save confirmation" },
  { provider, outputDirectory: "./public/motion" },
);
```

The provider may return Lottie JSON, JSON text, or
`{ animation, model?, recipe?, notes? }`. Soliddd owns validation,
browser rendering, poster capture, hashing, and atomic promotion.

The certified subset is expression-free and vector-only. Do not introduce
image/audio layers, remote assets, external fonts, or executable expressions.

## Definition of done

Accept only a bundle whose checks all pass:

- strict Lottie schema without auto-repair
- expression-free vector content with no external dependencies
- quality score of at least 85
- every representative frame paints pixels
- meaningful motion across sampled transitions
- payload within the delivery budget
- reduced-motion poster captured

If any check fails, report the failure stage and concrete issues. Do not copy a
candidate into production paths.
