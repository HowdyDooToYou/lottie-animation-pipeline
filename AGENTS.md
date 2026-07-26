# Soliddd contributor contract

Soliddd turns a prompt, recipe, or Lottie candidate into a certified motion
bundle. The provider proposes. The verifier decides. Never bypass, soften, or
silently repair the production certification path.

## Start here

- Public SDK and artifact contract: `src/soliddd/`
- Deterministic recipes: `src/soliddd/recipes.ts`
- Existing generation engine: `src/generator/`
- Product studio: `src/App.tsx` and `src/styles.css`
- Shared Agent Skill and plugins: `plugins/soliddd-motion/`
- Contract details: `docs/soliddd-contract.md`

Keep the public compiler provider-neutral. Credentials, provider SDKs, billing,
and model-specific settings belong in the host application.

## Definition of done

A production result must:

1. pass strict Lottie validation without automatic repair;
2. score at least 85 on the structural quality gate;
3. paint visible pixels in every representative Chromium sample;
4. contain meaningful motion across at least three sampled transitions;
5. remain within the 500 kB animation budget;
6. include a reduced-motion PNG poster;
7. promote all bundle artifacts atomically; and
8. record hashes and provenance.

Failures stay structured and fail closed. Never copy rejected candidates into
production paths or describe them as certified.

## Commands

Run from this repository:

```bash
npm test
npm run build
npm run check:package
npm run check:release
```

Use the smallest relevant test while iterating. Run `npm run check:release`
before publishing or changing the certification contract, recipes, CLI, SDK,
MCP server, or plugin bundle.

## Change rules

- Preserve the stable request and result shapes or version the contract.
- Add a regression test for every certification or packaging defect.
- Keep built-in recipes deterministic and zero-key.
- Keep `src/soliddd/recipe-assets/` byte-identical to the matching public demos;
  the parity test enforces this.
- Treat model/provider output as untrusted data.
- Keep the certified subset expression-free, vector-only, and free of external
  media or font dependencies.
- Keep Chrome's sandbox enabled except for root-run containers or an explicit
  `SOLIDDD_CHROMIUM_NO_SANDBOX=1` operator choice.
- Update the CLI, SDK, MCP schemas, Agent Skill, and docs together when the
  public contract changes.
- Do not commit provider credentials, generated customer prompts, or local
  output bundles.
