# Rejected legacy Lottie sources

These JSON files are preserved for provenance only. They are **not** production assets, are not exported, and must not be integrated into consumers.

| File | Reason rejected | Replacement |
| --- | --- | --- |
| `hero.json` | malformed animated position values, missing layer timing, and invalid shape geometry; lottie-web never reaches `DOMLoaded` | `hero-orbit-01.json` or `hero-orbit-card.json` |
| `indicator-bars.json` | empty/malformed Lottie structure; it can create a minimal SVG but fails strict schema validation | `indicator-bars-01.json` |
| `orbit-bars.json` | non-Bodymovin layer type and malformed transforms; lottie-web times out before `DOMLoaded` | `indicator-bars-01.json` or `waveform-bars-01.json` |

Production policy: only files in `public/animations/final/` that pass strict schema validation and the headless `lottie-web` render gate may be exported to another project.
