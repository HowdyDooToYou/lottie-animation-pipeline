# Motion Design Skill Integration Plan

## Goal

Absorb LottieFiles' motion design expertise into MotionProof's certification pipeline without compromising its provider-neutral, evidence-first philosophy. MotionProof remains the certification authority; the motion design skill becomes its default knowledge layer for evaluating animation quality.

**Target model:** GPT-5.6 Terra (OpenAI)

---

## Context

MotionProof currently certifies Lottie animations through structural validation and rendering proof, but lacks deep motion design expertise. LottieFiles released their [motion design skill](https://github.com/LottieFiles/motion-design-skill) (MIT licensed) — a comprehensive knowledge base covering:

- **Philosophy**: Disney's 12 principles adapted for UI, emotion-to-motion mapping, choreography
- **Patterns**: Entrance/exit recipes, state feedback, ambient motion, multi-element coordination
- **Reference**: Timing/easing tables, property selection, quality checklists

This integration makes MotionProof's certification gates motion-literate, not just structurally valid.

---

## Success Criteria

1. **Motion knowledge layer exists** at `src/motionproof/motion-knowledge/`
2. **Certification gates reference motion principles** — not just structural validity
3. **Quality scoring incorporates motion design heuristics** — easing appropriateness, timing, choreography
4. **Recipes align with motion patterns** — built-in recipes follow established motion design principles
5. **No external dependencies** — all knowledge is local and provider-neutral
6. **Tests validate motion-aware certification** — new test cases for motion quality evaluation
7. **Documentation updated** — AGENTS.md, motionproof-contract.md, and skill docs reflect the integration

---

## Implementation Phases

### Phase 1: Extract and Structure Motion Knowledge

**Objective:** Ingest LottieFiles' motion design skill and adapt it to MotionProof's architecture.

**Tasks:**

1. Clone `LottieFiles/motion-design-skill` to a temporary location
2. Extract the following into `src/motionproof/motion-knowledge/`:
   - `philosophy.md` — Core principles (Disney's 12 principles for UI, three pillars)
   - `emotion-mapping.md` — Emotion-to-motion translation table
   - `timing-easing.md` — Duration and easing lookup tables
   - `property-selection.md` — What properties communicate what
   - `choreography.md` — Multi-element coordination principles
   - `quality-heuristics.md` — Motion quality evaluation criteria
   - `patterns/` — Entrance/exit, state feedback, ambient, multi-element recipes
3. Adapt the content:
   - Remove agent-specific instructions (MotionProof is not an agent skill)
   - Reframe as **evaluation criteria** rather than **creation instructions**
   - Add MotionProof-specific context (certification gates, quality scoring)
4. Create `src/motionproof/motion-knowledge/index.ts` — typed exports for all knowledge modules
5. Add `src/motionproof/motion-knowledge/README.md` — attribution, license, usage

**Acceptance:**
- All motion design knowledge is locally available as TypeScript modules
- Knowledge is structured for programmatic access (not just prose)
- Attribution and MIT license are preserved

---

### Phase 2: Integrate Motion Knowledge into Certification

**Objective:** Make the certification pipeline motion-literate.

**Tasks:**

1. Update `src/motionproof/certify.ts`:
   - Import motion knowledge modules
   - Add motion quality evaluation step after structural validation
   - Score animations against motion design heuristics:
     - **Easing appropriateness** — Does the easing match the emotional intent?
     - **Timing** — Are durations within recommended ranges for the animation type?
     - **Choreography** — Do multi-element animations follow stagger/sequence principles?
     - **Property communication** — Do the animated properties convey the intended meaning?
2. Update `src/motionproof/types.ts`:
   - Add `MotionQualityScore` interface
   - Extend `CertificationResult` to include motion quality breakdown
3. Update `src/motionproof/quality-gate.ts`:
   - Incorporate motion quality into the overall quality score (currently structural only)
   - Define minimum motion quality threshold (e.g., 70/100)
4. Add motion-aware validation:
   - Check for common motion anti-patterns (linear easing on entrances, excessive duration, missing choreography)
   - Warn if animation lacks emotional intent (e.g., generic bounce without context)

**Acceptance:**
- Certification results include motion quality scores
- Animations with poor motion quality fail certification (or warn, depending on threshold)
- Motion quality is visible in `certification.json`

---

### Phase 3: Align Recipes with Motion Patterns

**Objective:** Ensure built-in recipes follow established motion design principles.

**Tasks:**

1. Review `src/motionproof/recipes.ts`:
   - Compare existing recipes against `motion-knowledge/patterns/`
   - Identify gaps (e.g., missing state feedback animations, entrance/exit patterns)
2. Update recipes to align with motion principles:
   - Use appropriate easing curves (not just `easeInOut`)
   - Follow recommended timing ranges
   - Apply choreography principles for multi-element animations
3. Add new recipes based on motion patterns:
   - **Entrance/exit** — Fade-in, slide-up, scale-in with proper easing
   - **State feedback** — Success (checkmark), error (shake), loading (pulse)
   - **Ambient** — Breathing, subtle rotation, parallax
4. Document recipe rationale:
   - Each recipe should reference the motion principle it follows
   - Explain why specific easing/timing/properties were chosen

**Acceptance:**
- All recipes follow motion design principles
- Recipe documentation references motion knowledge
- New recipes cover common UI animation patterns

---

### Phase 4: Update Quality Scoring

**Objective:** Make the structural quality gate motion-aware.

**Tasks:**

1. Update `src/motionproof/quality-gate.ts`:
   - Add motion quality evaluation function
   - Score animations on:
     - **Easing diversity** — Are multiple easing curves used appropriately?
     - **Timing appropriateness** — Do durations match animation type?
     - **Choreography quality** — Are multi-element animations well-coordinated?
     - **Property communication** — Do animated properties convey intent?
2. Define motion quality thresholds:
   - **Pass:** ≥ 70/100 (acceptable motion quality)
   - **Warn:** 50-69/100 (needs improvement)
   - **Fail:** < 50/100 (poor motion quality)
3. Update quality score calculation:
   - Current: structural quality (100%)
   - New: structural quality (60%) + motion quality (40%)
   - Or: structural quality (70%) + motion quality (30%) — TBD based on testing
4. Add motion quality breakdown to certification results:
   - Easing score
   - Timing score
   - Choreography score
   - Property communication score
   - Overall motion quality score

**Acceptance:**
- Quality scores reflect both structural and motion quality
- Certification results include detailed motion quality breakdown
- Thresholds are configurable (for future tuning)

---

### Phase 5: Add Tests

**Objective:** Validate motion-aware certification with comprehensive tests.

**Tasks:**

1. Add unit tests for motion knowledge modules:
   - Test timing/easing lookups
   - Test emotion-to-motion mapping
   - Test property selection guide
2. Add integration tests for motion-aware certification:
   - Test animations with good motion quality pass certification
   - Test animations with poor motion quality fail or warn
   - Test motion quality scoring accuracy
3. Add recipe tests:
   - Test all recipes follow motion principles
   - Test recipes produce animations that pass motion quality gates
4. Add regression tests:
   - Ensure existing certified animations still pass (backward compatibility)
   - Ensure motion knowledge doesn't break structural validation

**Acceptance:**
- All tests pass
- Motion quality evaluation is tested
- Recipes are tested against motion principles
- No regressions in existing certification

---

### Phase 6: Update Documentation

**Objective:** Document the motion design integration for users and contributors.

**Tasks:**

1. Update `AGENTS.md`:
   - Add motion knowledge to "Start here" section
   - Document motion-aware certification in "Definition of done"
   - Add motion quality to certification criteria
2. Update `docs/motionproof-contract.md`:
   - Add motion quality to certification gates
   - Document motion quality scoring
   - Add examples of motion-aware certification results
3. Update `README.md`:
   - Mention motion design integration
   - Add example of motion quality in certification results
4. Update `src/motionproof/README.md`:
   - Document motion knowledge modules
   - Explain how motion quality is evaluated
   - Provide examples of good vs. poor motion quality

**Acceptance:**
- All documentation reflects motion-aware certification
- Users understand how motion quality is evaluated
- Contributors know where to find motion knowledge

---

## Goal Prompt for Terra

```
You are GPT-5.6 Terra, executing the Motion Design Skill Integration for MotionProof.

## Context

MotionProof is a provider-neutral Lottie animation certification pipeline at /home/tempest/lottie-animation-pipeline/. It certifies animations through structural validation and rendering proof. The goal is to absorb LottieFiles' motion design expertise (MIT licensed, https://github.com/LottieFiles/motion-design-skill) into MotionProof's certification pipeline, making it motion-literate without compromising its evidence-first philosophy.

## Your Task

Execute the 6-phase plan in docs/motion-design-integration-plan.md:

1. **Extract and Structure Motion Knowledge** — Ingest LottieFiles' motion design skill into src/motionproof/motion-knowledge/
2. **Integrate Motion Knowledge into Certification** — Make certification motion-literate
3. **Align Recipes with Motion Patterns** — Ensure recipes follow motion principles
4. **Update Quality Scoring** — Make quality gate motion-aware
5. **Add Tests** — Validate motion-aware certification
6. **Update Documentation** — Document the integration

## Constraints

- MotionProof remains provider-neutral and certification-first
- No external dependencies — all knowledge must be local
- Preserve backward compatibility — existing certified animations must still pass
- Follow MotionProof's AGENTS.md contract: "The provider proposes. The verifier decides."
- Keep built-in recipes deterministic and zero-key
- Update CLI, SDK, MCP schemas, Agent Skill, and docs together when the public contract changes

## Definition of Done

- All 6 phases complete
- All tests pass: npm test, npm run build, npm run check:package, npm run check:release
- Motion quality scoring is visible in certification.json
- Documentation updated
- No regressions

## Success Criteria

- Motion knowledge layer exists at src/motionproof/motion-knowledge/
- Certification gates reference motion principles
- Quality scoring incorporates motion design heuristics
- Recipes align with motion patterns
- Tests validate motion-aware certification
- Documentation reflects the integration

## Starting Point

You are on branch feat/absorb-motion-design-skill. The plan is at docs/motion-design-integration-plan.md.

Begin with Phase 1: Extract and Structure Motion Knowledge.

Clone LottieFiles/motion-design-skill, extract the relevant content, adapt it for MotionProof's evaluation-focused architecture, and create typed TypeScript modules at src/motionproof/motion-knowledge/.

Work through each phase sequentially. Run tests after each phase to catch regressions early.

When complete, commit all changes with a conventional commit message:

feat(motionproof): integrate motion design knowledge into certification pipeline

Then open a PR with a summary of what changed and how motion quality is now evaluated.
```

---

## Attribution

This integration uses the [LottieFiles Motion Design Skill](https://github.com/LottieFiles/motion-design-skill), licensed under MIT. The original work is Copyright (c) LottieFiles.

MotionProof's motion knowledge layer is adapted from this work to serve as evaluation criteria rather than creation instructions.

---

## Next Steps

1. Review this plan
2. Execute the Goal Prompt with Terra
3. Review the PR
4. Merge and deploy

---

## Questions for John

1. **Motion quality threshold:** Should poor motion quality fail certification (hard gate) or warn (soft gate)? I recommend starting with a soft gate (warn) and making it a hard gate after we tune the thresholds.

2. **Quality score weighting:** How much should motion quality weigh relative to structural quality? I suggested 30-40% motion / 60-70% structural, but this is TBD based on testing.

3. **Recipe expansion:** Should we add new recipes based on motion patterns, or only update existing recipes to align with motion principles? I recommend both — update existing recipes and add 3-5 new recipes covering common UI patterns (entrance, state feedback, ambient).

4. **Backward compatibility:** Should existing certified animations be re-evaluated with motion quality scoring? I recommend no — only new certifications use motion quality. Existing certifications remain valid.
