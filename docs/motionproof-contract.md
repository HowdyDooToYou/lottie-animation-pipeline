# The MotionProof contract

MotionProof is a fail-closed compiler boundary for production motion. Providers
propose candidates. Certification decides whether a complete artifact bundle
may exist.

## Request contract

The public request contains only portable product intent:

- `prompt`
- optional kebab-case `id`
- optional built-in `recipe`
- `preset`: `calm`, `snappy`, `technical`, or `ambient`
- optional accessible `description`
- optional theme colors
- optional poster frame
- one to three attempts
- string metadata

Provider credentials, SDK clients, billing configuration, and vendor-specific
model parameters do not belong in the request.

## Provider contract

A provider receives:

- the validated request;
- a strict Lottie system prompt;
- the current attempt number; and
- structured issues from the previous attempt.

It may return a Lottie object, parseable JSON text, or an object containing an
`animation` plus optional provenance.

Provider output is untrusted. Automatic repair is intentionally excluded from
the promotion path.

## Certification stages

1. **Request** — reject unknown fields, unsafe identifiers, invalid colors, and
   unsupported values.
2. **Provider** — normalize a candidate or return a redacted provider failure.
3. **Schema** — require strict renderable, expression-free vector Lottie JSON
   without repair; reject image/audio layers, external assets, and external
   fonts.
4. **Quality** — require an 85/100 structural score, visible shapes, real
   keyframes, bounded duration, and restrained complexity. MotionProof also
   records local, provider-neutral motion evidence for easing, timing,
   choreography, and property communication. Under `soft-report-v1`, that
   evidence contributes 30% of the displayed quality score but the 85-point
   structural score remains the mandatory promotion floor.
5. **Render** — load the candidate through the expression-free
   `lottie_light` player in a network-blocked Chromium page, rasterize nine
   timeline samples, count visible pixels, and measure changed pixels.
6. **Poster** — capture a PNG from the certified render for reduced motion.
7. **Write** — stage all artifacts in a private sibling directory, hash them,
   then atomically rename the complete directory into place.

If an existing target is present, MotionProof fails unless the caller explicitly
opts into overwrite. Overwrite first moves the old bundle to a sibling backup,
promotes the new bundle, and restores the backup if promotion fails.

## Artifact contract

`animation.json`
: Strict Lottie source with `meta.motionproof` and accessibility provenance.

`poster.png`
: Raster frame captured from the same browser render that passed the gate.

`preview.html`
: Self-contained Lottie review page with play/pause and reduced-motion support.

`certification.json`
: Request, provider, attempts, check results, structural and motion-quality
  evidence, and raster sample evidence. Motion evidence includes score,
  per-dimension breakdown, policy, strengths, and actionable warnings.

`manifest.json`
: Bundle format, certification label, prompt hash, provider provenance, score,
  byte sizes, media types, and SHA-256 hashes.

## Failure contract

Failures return:

```json
{
  "ok": false,
  "stage": "render",
  "issues": [
    {
      "code": "certification.visibility",
      "message": "Only 7/9 representative frames paint visible pixels.",
      "stage": "render",
      "retryable": true
    }
  ],
  "attempts": []
}
```

No production bundle is promoted. Agents should revise the source using the
issues and retry; they must not copy a rejected candidate around the gate.

## Certification semantics

`MOTIONPROOF` means:

- **Designed** — intentional recipe, easing, hierarchy, and semantics;
- **Deployable** — portable artifacts, fallback, performance budget, and atomic
  release;
- **Defensible** — strict validation, browser evidence, provenance, and hashes.

Certification is evidence about the artifact and current gate implementation.
It is not a warranty, security certification, or substitute for target-product
review.
