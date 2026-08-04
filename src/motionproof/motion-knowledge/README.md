# MotionProof motion knowledge corpus

MotionProof evaluates production evidence, not a provider's taste. This local
corpus adapts the MIT-licensed [LottieFiles Motion Design Skill](https://github.com/LottieFiles/motion-design-skill)
(Copyright LottieFiles) for **evaluation** of portable Lottie JSON.

## What is evaluated

`evaluateMotionQuality()` produces provider-neutral evidence for four dimensions:

| Dimension | Evidence available from Lottie | Intended principle |
| --- | --- | --- |
| Easing | Keyframe Bezier handles (`i` / `o`) | Spatial motion should not default to linear timing. |
| Timing | `ip`, `op`, and `fr` | UI feedback needs legible, bounded duration. |
| Choreography | Animated layer start frames | Multi-element UI motion should use a bounded stagger. |
| Property communication | Animated transform properties | Important state changes should not rely on opacity alone. |

The corpus intentionally does **not** infer a creator's emotion, brand
personality, or user intent from pixels. Those claims would not be defensible
from a portable Lottie candidate alone.

## Certification policy

Current policy: `soft-report-v1` (contract schema `1.1`).

- Motion quality contributes 30% of the displayed quality score.
- The existing structural score remains the fail-closed promotion floor: **85/100**.
- A weak motion score is recorded in `certification.json` with actionable
  warnings; it does not retroactively invalidate previously certified motion.
- Render, visibility, payload, poster, and atomic-promotion gates remain
  unchanged and mandatory.

This lets MotionProof collect real evidence and tune thresholds before motion
quality itself becomes a hard certification boundary.

## Local principles and references

- `index.ts` is the machine-readable evaluation layer.
- Easing and duration heuristics are adapted from LottieFiles' timing/easing
  tables: use eased entrances/exits and keep feedback readable.
- Choreography follows the bounded-stagger principle: multi-element UI motion
  should complete its stagger within 500ms.
- Property selection follows the transform-plus-opacity principle: position or
  scale carries state meaning; opacity supplements it.
- Built-in recipe rationales live in `../recipes.ts` as `motionPrinciples`.

No provider SDK, credentials, remote asset, model call, or runtime dependency
is introduced by this corpus.

## Attribution and license

Adapted concepts are from the LottieFiles Motion Design Skill, distributed
under the MIT License. MotionProof does not copy the original agent workflow;
it expresses a small, deterministic, evidence-focused subset as TypeScript
heuristics. Keep this attribution when extending the corpus.
