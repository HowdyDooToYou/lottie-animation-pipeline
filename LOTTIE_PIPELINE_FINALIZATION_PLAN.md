# Lottie Animation Pipeline Finalization Plan

## Executive Summary

Transform the current working prototype into a production-grade, agent-accessible Lottie animation generation pipeline. This system will enable Hermes and OpenClaw agents to generate high-quality, spec-compliant Lottie animations for use across websites, proposals, presentations, and other deliverables.

**Current State:** Gemini-authenticated prototype generating 8/9 valid animations, manual CLI usage, no integration with actual codebase.

**Target State:** Fully automated, tested, documented pipeline with Gemini integration, quality gates, batch generation, and production deployment in moreproof.dev.

---

## Phase 1: Gemini Provider Integration (Week 1)

### Objective
Wire Gemini 3.5 Flash (Medium) into the generator as a proper provider with automated authentication, retry logic, and rate limiting.

### Tasks

#### 1.1 Create Gemini Provider Module
- **File:** `src/generator/providers/GeminiProvider.ts`
- **Requirements:**
  - Authenticate via Google AI Pro OAuth (reuse existing Antigravity CLI auth)
  - Model selection: `gemini-3.5-flash-medium`
  - Implement structured prompting system for Lottie JSON generation
  - Handle rate limits (quota tracking, backoff strategies)
  - Error handling for malformed responses
  - Timeout management (30s default, configurable)

#### 1.2 Structured Prompt Templates
- **Files:** `src/generator/prompts/*.ts`
- **Requirements:**
  - Create templated prompts for each animation archetype:
    - `pulse-ring` (loading states)
    - `hero-orbit` (background motion)
    - `indicator-bars` (data visualization)
    - `metric-rise` (growth/progress)
    - `spinning-dots` (multi-stage loading)
    - `check-mark` (success/completion)
    - `progress-ring` (completion states)
    - `waveform-bars` (audio/signal)
    - `gradient-flow` (transitions)
  - Each template must specify:
    - Exact Lottie spec requirements (v5.7.4, fr=60, dimension constraints)
    - Required properties: `ip`, `op`, `w`, `h`, `nm`, `layers`
    - Transform structure: `ks` with `p`, `a`, `s`, `r`, `o` properties
    - Shape group structure: `ty: "gr"`, `it` array with `el/rc/sh` + `fl/st` + `tr`
    - Animation keyframe format with easing handles

#### 1.3 Retry and Validation Logic
- **File:** `src/generator/generation-engine.ts`
- **Requirements:**
  - Implement 3-attempt retry with prompt refinement
  - Each failed attempt feeds back into next prompt ("Previous output failed validation: [error]. Fix these issues...")
  - Validate against Zod schema immediately after generation
  - Track generation costs (quota usage per generation)
  - Fallback to local models if Gemini quota exhausted

### Success Criteria
- [ ] Gemini provider authenticates automatically using existing CLI session
- [ ] Generator produces valid Lottie JSON 9/10 times on first attempt
- [ ] Automatic retry recovers 99% of failures
- [ ] Quota usage tracked and logged per generation
- [ ] Unit tests cover all provider methods (mock API responses)

### Estimated Effort
- **Time:** 3-4 days
- **Token Cost:** ~$2-5 in Gemini API calls for development/testing

---

## Phase 2: Quality Gate Hardening (Week 1-2)

### Objective
Ensure zero invalid Lottie JSON reaches `public/animations/final/`.

### Tasks

#### 2.1 Enhance Zod Schema
- **File:** `src/generator/schema/lottie.schema.ts`
- **Current Issues:**
  - Missing validation for animated property keyframe structure
  - No validation for shape group transform requirements
  - Doesn't catch missing `ix` (property index) fields
  - Allows invalid layer types

- **Required Validations:**
  ```typescript
  // Property index tracking
  layers[*].ks[*].ix: number()
  layers[*].shapes[*].it[*].ix: number()
  
  // Transform completeness
  layers[*].ks: object({
    p: AnimatedValue,  // position
    a: AnimatedValue,  // anchor
    s: AnimatedValue,  // scale
    r: AnimatedValue,  // rotation
    o: AnimatedValue   // opacity
  })
  
  // Shape group structure
  layers[*].shapes[*]: oneOf([
    { ty: "gr", it: ShapeItem[], nm: string() },
    { ty: "el" | "rc" | "sh", ... },  // raw shapes only in groups
  ])
  
  // Keyframe structure
  keyframes[*]: {
    t: number(),           // time
    s: array(number()),    // start value (dimension-matched)
    i?: { x: array(), y: array() },  // ease in
    o?: { x: array(), y: array() },  // ease out
    ix?: number()          // property index
  }
  
  // Animated vs static values
  AnimatedValue: oneOf([
    { a: 0, k: primitive | array() },  // static
    { a: 1, k: keyframes[] }           // animated
  ])
  ```

#### 2.2 Add Rendering Validation
- **File:** `scripts/validate-render.ts`
- **Requirements:**
  - Load each generated JSON with lottie-web in headless browser (Puppeteer)
  - Verify no runtime errors thrown
  - Check that SVG renders (non-empty DOM)
  - Sample 5 random frames for visual consistency
  - Generate screenshot for manual review

#### 2.3 Integration Tests
- **File:** `tests/integration/generation-pipeline.test.ts`
- **Scenarios:**
  - Generate all 9 archetypes → all pass validation
  - Generate with corrupt prompt → retry succeeds
  - Generate with quota exhausted → fallback to local
  - Batch generation (10 animations) → all valid, under quota
  - Invalid JSON input → graceful failure with clear error

### Success Criteria
- [ ] Zod schema catches 100% of structural violations
- [ ] Render validation catches 100% of runtime errors
- [ ] Integration tests pass with 0 flaky failures
- [ ] Quality gate blocks invalid output from reaching `final/`

### Estimated Effort
- **Time:** 2-3 days
- **Token Cost:** ~$1-3 for test generations

---

## Phase 3: Batch Generation System (Week 2)

### Objective
Enable generation of multiple animations from a manifest file.

### Tasks

#### 3.1 Manifest Format
- **File:** `animations/manifest.json`
- **Structure:**
  ```json
  {
    "version": "1.0",
    "generated": "2026-07-06",
    "animations": [
      {
        "id": "hero-orbit-01",
        "archetype": "hero-orbit",
        "name": "Site Header Orbit",
        "params": {
          "width": 400,
          "height": 100,
          "color": "#408ff5",
          "duration": 120
        },
        "usage": "moreproof.dev hero section background"
      },
      {
        "id": "loading-pulse-02",
        "archetype": "pulse-ring",
        "name": "Form Submit Loading",
        "params": {
          "width": 200,
          "height": 200,
          "color": "#408ff5"
        },
        "usage": "moreproof.dev contact form"
      }
    ]
  }
  ```

#### 3.2 Batch Generator CLI
- **File:** `src/cli/generate-batch.ts`
- **Commands:**
  ```bash
  # Generate all animations in manifest
  npm run generate:batch -- animations/manifest.json
  
  # Generate specific animation
  npm run generate -- --id hero-orbit-01
  
  # Validate all generated animations
  npm run validate -- --all
  
  # Export for production (copy to moreproof/public)
  npm run export -- --to /path/to/moreproof/public/animations
  ```

#### 3.3 Generation Report
- **File:** `reports/generation-{timestamp}.json`
- **Contents:**
  - Animation ID, archetype, filename
  - Generation time, retry count
  - Validation result (pass/fail)
  - Render test result (pass/fail)
  - Quota usage
  - Screenshot path (if render tested)
  - Error details (if failed)

#### 3.4 Caching and Deduplication
- **File:** `src/generator/cache.ts`
- **Requirements:**
  - Hash animation params (archetype + dimensions + color)
  - Skip generation if identical animation exists
  - Store cache in `.cache/lottie-generations.json`
  - Allow force regeneration with `--force` flag

### Success Criteria
- [ ] Batch command generates all animations in manifest
- [ ] Individual generation command works with animation ID
- [ ] Validation command checks all `public/animations/final/*.json`
- [ ] Export command copies to target directory with manifest
- [ ] Generation reports created for each batch run
- [ ] Cache prevents redundant generations

### Estimated Effort
- **Time:** 3-4 days
- **Token Cost:** ~$5-10 for initial batch generation

---

## Phase 4: Production Deployment in moreproof.dev (Week 2-3)

### Objective
Integrate generated Lottie animations into the live portfolio site.

### Tasks

#### 4.1 Asset Integration
- **Source:** `lottie-animation-pipeline/public/animations/final/`
- **Destination:** `moreproof/public/animations/`
- **Method:**
  ```bash
  # Automated export
  cd /home/tempest/lottie-animation-pipeline
  npm run export -- --to /mnt/c/Users/John/OpenClaw/workspace/moreproof/public/animations
  ```

#### 4.2 Lottie React Components
- **Files:** `moreproof/src/components/animations/`
- **Components:**
  - `LottieAnimation.tsx` — Base component with loading states
  - `PulseRingLoader.tsx` — Form submit loading
  - `HeroOrbitBackground.tsx` — Hero section background
  - `IndicatorBarsMeter.tsx` — Data visualization
  - `MetricRiseChart.tsx` — Growth metrics
  - `SpinningDotsLoader.tsx` — Multi-stage loading
  - `CheckMarkSuccess.tsx` — Success indicators
  - `ProgressRingMeter.tsx` — Progress tracking
  - `WaveformBarsVisualizer.tsx` — Audio/signal animation

#### 4.3 Component Implementation
- **Requirements:**
  ```typescript
  interface LottieAnimationProps {
    animation: AnimationType
    loop?: boolean
    autoplay?: boolean
    className?: string
    style?: React.CSSProperties
    onError?: (error: Error) => void
  }
  
  const LottieAnimation: React.FC<LottieAnimationProps> = ({
    animation,
    loop = true,
    autoplay = true,
    ...
  }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    
    useEffect(() => {
      const loadAnimation = async () => {
        try {
          const resp = await fetch(`/animations/${animation}.json`)
          const data = await resp.json()
          lottie.loadAnimation({
            container: containerRef.current!,
            renderer: 'svg',
            loop,
            autoplay,
            animationData: data,
          })
          setStatus('ready')
        } catch (err) {
          setStatus('error')
          onError?.(err as Error)
        }
      }
      loadAnimation()
    }, [animation])
    
    return (
      <div ref={containerRef} className={className} style={style}>
        {status === 'loading' && <div>Loading animation...</div>}
        {status === 'error' && <div>Failed to load animation</div>}
      </div>
    )
  }
  ```

#### 4.4 Integration Points

##### 4.4.1 Hero Section
- **File:** `moreproof/src/components/Hero.tsx`
- **Usage:**
  ```tsx
  <div className="hero-background">
    <HeroOrbitBackground />
  </div>
  ```

##### 4.4.2 Project Cards
- **File:** `moreproof/src/components/ProjectCard.tsx`
- **Usage:**
  ```tsx
  <div className="project-preview">
    <LottieAnimation animation="hero-orbit-01" loop={false} />
  </div>
  ```

##### 4.4.3 Contact Form
- **File:** `moreproof/src/components/ContactForm.tsx`
- **Usage:**
  ```tsx
  <button type="submit" disabled={isSubmitting}>
    {isSubmitting ? (
      <PulseRingLoader size="small" />
    ) : (
      'Send Message'
    )}
  </button>
  ```

##### 4.4.4 Success States
- **File:** `moreproof/src/components/SuccessMessage.tsx`
- **Usage:**
  ```tsx
  {success && (
    <div className="success-banner">
      <CheckMarkSuccess />
      <p>Message sent successfully!</p>
    </div>
  )}
  ```

#### 4.5 Performance Optimization
- **Lazy Loading:** Wrap animation components in `React.lazy()`
  ```typescript
  const HeroOrbitBackground = lazy(() =>
    import('./animations/HeroOrbitBackground')
  )
  ```
- **Suspense Boundaries:** Add loading fallbacks
  ```typescript
  <Suspense fallback={<div>Loading animation...</div>}>
    <HeroOrbitBackground />
  </Suspense>
  ```
- **Image Optimization:** Set `rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }`
- **Bundle Size:** Tree-shake unused animations, keep only those used in components

#### 4.6 Reduced Motion Support
- **File:** `moreproof/src/hooks/useReducedMotion.ts`
- **Implementation:**
  ```typescript
  const useReducedMotion = () => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
    
    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
      
      const handler = (e: MediaQueryListEvent) => 
        setPrefersReducedMotion(e.matches)
      
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }, [])
    
    return prefersReducedMotion
  }
  ```

- **Usage in Components:**
  ```typescript
  const reducedMotion = useReducedMotion()
  
  <LottieAnimation
    animation="hero-orbit-01"
    autoplay={!reducedMotion}
  />
  ```

### Success Criteria
- [ ] All 8 working animations integrated into moreproof.dev
- [ ] Components render without console errors
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] Reduced motion preference respected
- [ ] No performance degradation (Lighthouse score ≥ 90)
- [ ] Animations visible in production build

### Estimated Effort
- **Time:** 4-5 days
- **Token Cost:** $0 (no generation required)

---

## Phase 5: CSS Animation Fallback Track (Week 3-4)

### Objective
Create CSS-based equivalents of all Lottie animations for browsers with limited SVG support or reduced motion preferences.

### Tasks

#### 5.1 CSS Animation Library
- **File:** `moreproof/src/styles/animations.css`
- **Animations:**
  ```css
  /* Pulse Ring */
  @keyframes pulse-ring {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.3); opacity: 0.3; }
  }
  
  /* Hero Orbit */
  @keyframes orbit {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Indicator Bars */
  @keyframes bar-pulse {
    0%, 100% { transform: scaleY(0.3); }
    50% { transform: scaleY(1); }
  }
  
  /* Metric Rise */
  @keyframes rise {
    0% { transform: scaleY(0.1); }
    100% { transform: scaleY(1); }
  }
  
  /* Spinning Dots */
  @keyframes dot-bounce {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-10px) scale(1.1); }
  }
  ```

#### 5.2 CSS Components
- **Files:** `moreproof/src/components/animations/CSS/`
- **Components:**
  - `CSSPulseRing.tsx` — Pure CSS equivalent
  - `CSSHeroOrbit.tsx` — Rotating gradient borders
  - `CSSIndicatorBars.tsx` — Animated bar heights
  - `CSSMetricRise.tsx` — Growing bars
  - `CSSSpinningDots.tsx` — Bouncing dots
  - `CSSCheckMark.tsx` — SVG path animation
  - `CSSProgressRing.tsx` — Rotating arc
  - `CSSWaveformBars.tsx` — Wave animation
  - `CSSGradientFlow.tsx` — Gradient movement

#### 5.3 Auto-Fallback System
- **File:** `moreproof/src/components/animations/SmartAnimation.tsx`
- **Logic:**
  ```typescript
  const SmartAnimation: React.FC<{
    lottieComponent: React.ReactNode
    cssComponent: React.ReactNode
  }> = ({ lottieComponent, cssComponent }) => {
    const reducedMotion = useReducedMotion()
    const [supportsLottie, setSupportsLottie] = useState(false)
    
    useEffect(() => {
      // Test SVG support
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      setSupportsLottie(typeof svg.createSVGRect === 'function')
    }, [])
    
    const useCSS = reducedMotion || !supportsLottie
    return useCSS ? <>{cssComponent}</> : <>{lottieComponent}</>
  }
  ```

#### 5.4 Documentation
- **File:** `moreproof/src/components/animations/README.md`
- **Contents:**
  - Component API documentation
  - When to use Lottie vs CSS
  - Performance considerations
  - Accessibility notes
  - Browser compatibility matrix

### Success Criteria
- [ ] All 9 animations have CSS equivalents
- [ ] Smart animation component auto-selects based on capabilities
- [ ] CSS animations respect reduced motion preference
- [ ] CSS animations perform at 60fps (no jank)
- [ ] Both Lottie and CSS paths tested and documented

### Estimated Effort
- **Time:** 3-4 days
- **Token Cost:** $0 (no generation required)

---

## Phase 6: Documentation and Agent Integration (Week 4)

### Objective
Document the pipeline for Hermes and OpenClaw agent usage.

### Tasks

#### 6.1 Pipeline Documentation
- **File:** `LOTTIE_PIPELINE_GUIDE.md`
- **Sections:**
  - **Overview:** What the pipeline does, when to use it
  - **Quick Start:** Generate one animation, generate batch
  - **Archetypes:** List of 9 animation types with use cases
  - **Custom Animations:** How to create new archetypes
  - **Quality Standards:** What makes a "good" Lottie animation
  - **Troubleshooting:** Common errors and fixes
  - **Cost Tracking:** How to monitor Gemini quota usage
  - **Integration Guide:** Using animations in websites/docs

#### 6.2 Agent Usage Examples
- **File:** `EXAMPLES.md`
- **Examples:**
  ```markdown
  ## Example 1: Generate Loading Animation for Website
  
  Use case: Need a pulse ring for a form submit button.
  
  Command:
  ```bash
  npm run generate -- --id loading-pulse-01
  ```
  
  Result: `public/animations/final/loading-pulse-01.json`
  
  Integration:
  ```tsx
  import PulseRingLoader from './animations/PulseRingLoader'
  
  <button type="submit">
    <PulseRingLoader size="small" />
    Submit
  </button>
  ```
  
  ## Example 2: Batch Generate for Portfolio Site
  
  Use case: Generate all animations for moreproof.dev.
  
  Command:
  ```bash
  npm run generate:batch -- animations/manifest.json
  ```
  
  Result: 9 animations generated, validated, exported to moreproof/public/
  
  ## Example 3: Create Custom Animation
  
  Use case: Need a unique "data flowing" animation for a dashboard.
  
  Steps:
  1. Define archetype in `src/generator/prompts/data-flow.ts`
  2. Add to manifest: `{ "id": "data-flow-01", "archetype": "data-flow", ... }`
  3. Generate: `npm run generate -- --id data-flow-01`
  4. Validate: `npm run validate -- --all`
  5. Use in component: `<DataFlowAnimation />`
  ```

#### 6.3 Hermes Integration Guide
- **File:** `HERMES_INTEGRATION.md`
- **Contents:**
  - How Hermes can invoke the generator
  - Example prompts for different use cases
  - Quality verification steps Hermes should take
  - Cost monitoring and quota management
  - Error handling and retry strategies

#### 6.4 OpenClaw Integration Guide
- **File:** `OPENCLAW_INTEGRATION.md`
- **Contents:**
  - Integration into proposal generation workflow
  - Integration into slide deck generation
  - Integration into website generation
  - API examples for programmatic usage
  - Asset management across projects

#### 6.5 Architecture Diagram
- **File:** `ARCHITECTURE.md`
- **Diagram:**
  ```
  User Request (Hermes/OpenClaw)
         ↓
  ┌─────────────────┐
  │ Manifest Parser │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Prompt Template │
  │    (Gemini)     │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Quality Gate    │
  │  (Zod Schema)   │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Retry Engine    │
  │  (3 attempts)   │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Render Test     │
  │  (lottie-web)   │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ Export to       │
  │ Project Public/ │
  └────────┬────────┘
           ↓
  ┌─────────────────┐
  │ React Component │
  │  Integration    │
  └─────────────────┘
  ```

### Success Criteria
- [ ] Complete documentation covering all pipeline aspects
- [ ] Working examples for Hermes and OpenClaw
- [ ] Architecture diagram clear and accurate
- [ ] Agent integration guides step-by-step
- [ ] Cost monitoring documented
- [ ] Troubleshooting covers 90% of common issues

### Estimated Effort
- **Time:** 2-3 days
- **Token Cost:** $0

---

## Phase 7: Testing and Validation (Week 4-5)

### Objective
Comprehensive testing across all use cases and integration scenarios.

### Tasks

#### 7.1 Unit Tests
- **Directory:** `tests/unit/`
- **Test Files:**
  - `GeminiProvider.test.ts` — Mock API responses, retry logic
  - `quality-gate.test.ts` — Zod schema validation scenarios
  - `prompt-templates.test.ts` — Template rendering
  - `batch-generator.test.ts` — Manifest parsing, orchestration
  - `cache.test.ts` — Deduplication logic

#### 7.2 Integration Tests
- **Directory:** `tests/integration/`
- **Test Files:**
  - `pipeline.test.ts` — End-to-end: manifest → generation → validation → export
  - `render-validation.test.ts` — Headless browser render tests
  - `quota-management.test.ts` — Rate limiting, fallback logic

#### 7.3 Visual Regression Tests
- **Directory:** `tests/visual/`
- **Test Files:**
  - `screenshot-comparison.test.ts` — Compare generated screenshots across runs
  - `color-accuracy.test.ts` — Verify color values match spec
  - `animation-smoothness.test.ts` — Frame consistency checks

#### 7.4 Real-World Scenarios
- **Directories:** `tests/scenarios/`
- **Scenario Files:**
  - `portfolio-site.test.ts` — Generate and integrate all animations for moreproof.dev
  - `proposal-generation.test.ts` — Generate animations for a client proposal
  - `slide-deck.test.ts` — Generate animations for a presentation
  - `high-volume.test.ts` — Batch generate 50 animations, verify quota tracking

#### 7.5 Performance Tests
- **Directory:** `tests/performance/`
- **Test Files:**
  - `generation-speed.test.ts` — Measure generation time per animation
  - `memory-usage.test.ts` — Verify no memory leaks in long-running batches
  - `lighthouse-audit.test.ts` — Ensure performance score ≥ 90 after integration

#### 7.6 Browser Compatibility
- **Directory:** `tests/compatibility/`
- **Test Files:**
  - `browser-matrix.test.ts` — Test in Chrome, Firefox, Safari, Edge
  - `reduced-motion.test.ts` — Verify CSS fallbacks activate correctly
  - `mobile-responsive.test.ts` — Test animations on mobile viewports

### Success Criteria
- [ ] 100% unit test coverage for critical paths
- [ ] All integration tests pass
- [ ] Visual regression tests show no significant deviations
- [ ] Real-world scenarios complete successfully
- [ ] Performance tests meet targets (< 5s generation, < 3MB memory)
- [ ] Browser compatibility matrix shows 95%+ support

### Estimated Effort
- **Time:** 3-4 days
- **Token Cost:** ~$10-20 for test generations

---

## Phase 8: Production Hardening (Week 5)

### Objective
Final polish, monitoring, and production deployment.

### Tasks

#### 8.1 Monitoring and Logging
- **File:** `src/monitoring/logger.ts`
- **Requirements:**
  - Log all generation attempts (success/failure)
  - Track quota usage over time
  - Log validation failures with detailed error context
  - Track generation time per animation
  - Export logs to JSON for analysis

- **File:** `src/monitoring/quota-tracker.ts`
- **Requirements:**
  - Real-time quota usage display
  - Warning at 50%, 75%, 90%
  - Block generation at 100%
  - Monthly usage reports

#### 8.2 Error Handling Improvements
- **File:** `src/errors/CustomErrors.ts`
- **Error Types:**
  ```typescript
  class GeminiQuotaExceededError extends Error
  class LottieValidationError extends Error
  class RenderTestFailedError extends Error
  class AnimationGenerationError extends Error
  class ManifestParseError extends Error
  ```

- **Error Messages:**
  - Clear, actionable error messages
  - Include suggested fix when possible
  - Log full context for debugging

#### 8.3 Configuration Management
- **File:** `config/default.json`
- **Settings:**
  ```json
  {
    "gemini": {
      "model": "gemini-3.5-flash-medium",
      "timeout": 30000,
      "maxRetries": 3,
      "quotaWarningThresholds": [50, 75, 90]
    },
    "validation": {
      "requireRenderTest": true,
      "screenshotComparison": false
    },
    "generation": {
      "defaultFramerate": 60,
      "defaultDuration": 2,
      "cacheEnabled": true,
      "exportOnGenerate": false
    }
  }
  ```

#### 8.4 CI/CD Integration
- **File:** `.github/workflows/lottie-pipeline.yml`
- **Workflow:**
  ```yaml
  name: Lottie Pipeline Validation
  
  on:
    push:
      paths:
        - 'animations/manifest.json'
        - 'src/generator/**'
  
  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '18'
        - run: npm ci
        - run: npm test
        - run: npm run validate -- --all
        - name: Generate Report
          run: npm run export-report
        - uses: actions/upload-artifact@v3
          with:
            name: validation-report
            path: reports/
  ```

#### 8.5 Documentation Site
- **File:** `docs/index.html`
- **Content:**
  - Markdown rendered as HTML
  - Interactive examples
  - Search functionality
  - Navigation sidebar

#### 8.6 Production Deployment Checklist
- **File:** `DEPLOYMENT_CHECKLIST.md`
- **Items:**
  - [ ] All tests passing
  - [ ] Documentation complete
  - [ ] Performance benchmarks met
  - [ ] Error handling verified
  - [ ] Monitoring configured
  - [ ] Quota tracking active
  - [ ] Backup strategy in place
  - [ ] Rollback plan documented

### Success Criteria
- [ ] Monitoring captures all pipeline activity
- [ ] Quota tracking prevents overages
- [ ] Custom errors provide clear debugging info
- [ ] CI/CD validates on every push
- [ ] Documentation site accessible and searchable
- [ ] Production deployment checklist completed

### Estimated Effort
- **Time:** 2-3 days
- **Token Cost:** $0

---

## Deliverables

### Code Deliverables
1. **Gemini Provider** — `src/generator/providers/GeminiProvider.ts`
2. **Quality Gate** — Enhanced Zod schema + render validation
3. **Batch Generator** — CLI tools for manifest-driven generation
4. **React Components** — 9 Lottie components + CSS fallbacks
5. **Smart Animation** — Auto-selecting Lottie/CSS based on capabilities
6. **Tests** — Unit, integration, visual, performance, compatibility
7. **Monitoring** — Logging, quota tracking, error handling
8. **CI/CD** — GitHub Actions workflow for validation

### Documentation Deliverables
1. **LOTTIE_PIPELINE_GUIDE.md** — Complete pipeline documentation
2. **EXAMPLES.md** — Usage examples for different scenarios
3. **HERMES_INTEGRATION.md** — Agent integration guide
4. **OPENCLAW_INTEGRATION.md** — OpenClaw workflow integration
5. **ARCHITECTURE.md** — System architecture diagram
6. **DEPLOYMENT_CHECKLIST.md** — Production deployment steps
7. **docs/** — HTML documentation site

### Asset Deliverables
1. **9 Lottie Animations** — Validated, render-tested JSON files
2. **Animation Manifest** — `animations/manifest.json`
3. **CSS Fallbacks** — 9 CSS animation equivalents
4. **Generation Reports** — Automated validation reports
5. **Screenshots** — Visual verification of rendered animations

---

## Timeline Summary

| Week | Focus | Key Milestones |
|------|-------|----------------|
| 1 | Gemini Integration | Provider working, quality gate hardened |
| 2 | Batch System | Manifest-driven generation, reports |
| 2-3 | Deployment | Animations live in moreproof.dev |
| 3-4 | CSS Fallbacks | All animations have CSS equivalents |
| 4 | Documentation | Complete docs for Hermes/OpenClaw |
| 4-5 | Testing | All test suites passing |
| 5 | Hardening | Production-ready with monitoring |

**Total Duration:** 5 weeks
**Estimated Token Cost:** $20-40 for Gemini generations
**Estimated Development Time:** 20-25 days

---

## Risk Mitigation

### Risk: Gemini API Quota Exhaustion
**Mitigation:**
- Track usage per generation
- Implement fallback to local models (qwen2.5-coder)
- Cache generation results
- Provide clear warnings at 50%, 75%, 90% thresholds

### Risk: Malformed Lottie Output
**Mitigation:**
- Strict Zod schema validation
- Render testing with lottie-web
- 3-attempt retry with prompt refinement
- Manual review for critical animations

### Risk: Performance Degradation
**Mitigation:**
- Lazy loading for all animation components
- Reduced motion support
- CSS fallbacks for slower devices
- Lighthouse audits

### Risk: Browser Compatibility Issues
**Mitigation:**
- CSS fallbacks for unsupported browsers
- Reduced motion preference support
- Cross-browser testing matrix
- Progressive enhancement approach

### Risk: Cost Overrun
**Mitigation:**
- Quota tracking and blocking at 100%
- Caching to prevent duplicate generations
- Efficient prompt engineering (minimal retries)
- Use free tier models when possible

---

## Success Metrics

### Quantitative Metrics
- **Generation Success Rate:** ≥ 95% (8/9 in prototype, target 9/9)
- **Retry Rate:** ≤ 10% (minimal retries needed)
- **Validation Pass Rate:** 100% (zero invalid output reaches production)
- **Render Success Rate:** 100% (all animations render without errors)
- **Performance Score:** ≥ 90 (Lighthouse audit)
- **Quota Usage:** ≤ $50/month (well within Pro plan limits)

### Qualitative Metrics
- **Ease of Use:** Agents can generate animations with single command
- **Documentation Quality:** Clear, complete, searchable
- **Integration Smoothness:** Drop-in components, no breaking changes
- **Error Clarity:** Descriptive error messages with suggested fixes
- **Scalability:** Can generate 100+ animations in batch without issues

---

## Next Steps

### Immediate Actions (This Week)
1. Review and approve this plan
2. Begin Phase 1: Gemini Provider Integration
3. Set up development environment with Gemini credentials
4. Create initial prompt templates for all 9 archetypes

### Short-term Goals (2 Weeks)
1. Complete Phase 1-2 (Gemini integration + quality gate)
2. Generate and validate all 9 archetypes automatically
3. Begin integration into moreproof.dev

### Medium-term Goals (4 Weeks)
1. Complete all integration and CSS fallback work
2. Deploy animations to production site
3. Complete documentation and testing

### Long-term Goals (5+ Weeks)
1. Production hardening and monitoring
2. Create agent integration examples
3. Establish pipeline as reusable tool across projects

---

## Conclusion

This plan transforms the working prototype into a production-grade Lottie animation pipeline that can be reliably used by Hermes and OpenClaw agents. The 5-week timeline balances speed with quality, ensuring we deliver a robust, documented, and tested system.

**Key Principles:**
- **Automation First:** Minimize manual intervention
- **Quality Over Speed:** Zero invalid output reaches production
- **Agent-Centric:** Designed for programmatic usage
- **Cost-Conscious:** Track and control Gemini quota usage
- **Future-Proof:** Extensible architecture for new animation types

Upon completion, this pipeline will enable rapid, high-quality animation generation for websites, proposals, presentations, and other deliverables across all projects.

---

**Plan Version:** 1
**Date:** 2026-07-06
**Author:** Hermes (Lottie Pipeline Finalization)
**Status:** Ready for Review
