# Production Motion System

The pipeline now treats motion as a reusable product capability, not only a JSON generation task. A production animation ships with a machine-readable motion specification, deterministic or model-generated assets, responsive companions, reduced-motion behavior, and promotion evidence.

## Motion specification

`MotionSpec` is the portable contract shared with the animation layer. It declares:

- a semantic role: feedback, transition, transport, ambient, or narrative;
- a runtime trigger and loop strategy;
- named source, connector, packet, hub, outcome, confirmation, and ambient roles;
- required responsive canvases and topology changes;
- a reduced-motion poster, simplified treatment, or shortened treatment;
- optional normalized timeline stages; and
- explicit exceptions for constant-velocity transport plus an animated-channel budget.

The contract is validated with Zod in `src/generator/motion-spec.ts`. Archetype prompts include the contract verbatim, so model-generated work and deterministic builders receive the same direction.

## Production gate

`productionQualityGate()` layers delivery checks above the existing strict schema and design gate. Promotion requires:

1. the existing Lottie quality gate to pass;
2. a valid motion specification;
3. a canvas matching its named responsive variant;
4. every semantic role mapped to concrete Lottie layers;
5. all required companion variants declared;
6. a valid reduced-motion plan and poster frame;
7. an outcome role and, for transport, a persistent connector scaffold;
8. the animated-channel budget to hold; and
9. any linear easing to be explicitly justified by transport or ambient motion.

The Chromium probe now samples nine frames, compares rasterized frames for meaningful pixel change, and measures the first-to-last loop seam. Assets with valid JSON but blank intervals, inert motion, or a visible loop discontinuity fail production promotion.

## Flagship product pattern

The deterministic attribution-flow builder produces two companion assets:

| Asset | Topology | Intended surface |
| --- | --- | --- |
| `attribution-flow-01` | 960×540 horizontal | Desktop hero, product story, campaign page |
| `attribution-flow-mobile-01` | 540×960 vertical | Mobile story, portrait embed, social derivative |

Both use a persistent evidence scaffold, restrained constant-velocity packets, a decision hub, an attributed outcome, a representative 52% reduced-motion poster, and a seamless three-second loop. They are reproducible without a network or paid provider:

```bash
npm run build:production-assets
npm run validate:render -- public/animations/final/attribution-flow-01.json
```

Manifest entries with `"source": "deterministic"` route through the same builder when batch generation runs. This keeps production-critical assets reproducible while preserving model generation for exploratory variants.

## Marketable capability surface

- **Evidence-to-outcome storytelling:** semantic roles make the animation explain a product system, not merely decorate it.
- **Responsive by composition:** desktop and mobile use different routing topologies rather than a scaled-down canvas.
- **Accessible by contract:** reduced motion is defined before delivery and points at a verified, meaningful poster frame.
- **Auditable promotion:** schema, design, metadata, motion budget, raster visibility, motion presence, and loop continuity produce testable evidence.
- **Reusable across orchestration:** the animation layer carries the same contract in the design brief and Lottie handoff without taking ownership of or overwriting the Lottie pipeline.

## Runtime integration

Consumers should start `in-view` motion when the asset enters the viewport, pause it while hidden, and replace it with the declared poster frame when `prefers-reduced-motion: reduce` is active. Continuous transport may be linear; entrances, exits, state changes, and narrative transitions use exponential easing without bounce or elastic overshoot.

`src/components/ProductionLottie.tsx` provides this behavior as a drop-in React player. Its playback policy also supports explicitly activated hover, manual, and scroll-driven compositions while keeping them paused offscreen.
