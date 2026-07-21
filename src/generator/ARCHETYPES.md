# Lottie Animation Archetype Library

## Overview

A comprehensive library of production-ready Lottie animation archetypes for modern web design. Each archetype is designed for multi-purpose use across dashboards, marketing sites, and applications.

## Archetype Categories

### 1. Data Visualization (Dashboards, Analytics)

#### `indicator-bars`
- **Style:** Technical, Clean
- **Preset:** Technical
- **Use Cases:** Dashboard metrics, progress indicators, KPI displays
- **Features:** Staggered bar rise, color-coded segments, smooth easing
- **Colors:** Electric blue (#408ff5), Gold (#ffc240)

#### `pulse-ring`
- **Style:** Premium, Subtle
- **Preset:** Premium
- **Use Cases:** Loading states, connection indicators, status badges
- **Features:** Concentric breathing rings, opacity pulse, gold accent
- **Colors:** Gold (#ffc240), transparent

#### `waveform-bars`
- **Style:** Technical, Dynamic
- **Preset:** Technical
- **Use Cases:** Audio visualization, processing status, system health
- **Features:** Staggered bounce, multi-color bars, smooth oscillation
- **Colors:** Electric blue (#408ff5), Gold (#ffc240), Mint (#40d6ab)

### 2. Micro-Interactions (UI Polish)

#### `check-mark`
- **Style:** Premium, Celebratory
- **Preset:** Premium
- **Use Cases:** Form validation, success states, completion badges
- **Features:** Draw effect, scale pop, color fill
- **Colors:** Success green (#4ade80)

#### `error-shake`
- **Style:** Warning, Attention
- **Preset:** Energetic
- **Use Cases:** Form validation errors, alerts, warnings
- **Features:** Horizontal shake, red glow, urgency
- **Colors:** Error red (#f85149)

#### `button-pulse`
- **Style:** Subtle, Responsive
- **Preset:** Subtle
- **Use Cases:** Hover states, CTA buttons, interactive elements
- **Features:** Gentle scale pulse, border glow, smooth loop
- **Colors:** Accent blue (#408ff5)

### 3. Branding & Hero Sections

#### `hero-orbit`
- **Style:** Premium, Futuristic
- **Preset:** Premium
- **Use Cases:** Hero sections, brand identity, app showcases
- **Features:** Orbiting elements, gradient trails, center focus
- **Colors:** Gradient from electric blue to gold

#### `sparkle-field`
- **Style:** Premium, Magical
- **Preset:** Premium
- **Use Cases:** Hero backgrounds, celebration moments, awards
- **Features:** Random sparkle generation, fade in/out, particle effect
- **Colors:** Gold (#ffc240), White, Accent blue

#### `gradient-flow`
- **Style:** Modern, Abstract
- **Preset:** Energetic
- **Use Cases:** Background patterns, section dividers, visual interest
- **Features:** Smooth gradient flow, organic movement, subtle loops
- **Colors:** Brand gradient

### 4. Loading & Progress

#### `spinning-dots`
- **Style:** Minimal, Modern
- **Preset:** Subtle
- **Use Cases:** Loading spinners, async states, progress indicators
- **Features:** Sequential dot fade, smooth rotation, compact
- **Colors:** Muted blue (#7aa2f7)

#### `progress-ring`
- **Style:** Clean, Circular
- **Preset:** Technical
- **Use Cases:** File uploads, form progress, step indicators
- **Features:** Animated stroke, percentage tracking, smooth end
- **Colors:** Accent blue (#408ff5)

#### `skeleton-loader`
- **Style:** Subtle, Content-aware
- **Preset:** Subtle
- **Use Cases:** Content loading states, list placeholders, cards
- **Features:** Shimmer effect, gradient sweep, multiple variants
- **Colors:** Muted background (#414868), Shimmer white

### 5. Social & Collaboration

#### `notification-bell`
- **Style:** Professional, Recognizable
- **Preset:** Technical
- **Use Cases:** Notification systems, user menus, alerts
- **Features:** Subtle bounce, badge counter, clean icon
- **Colors:** Accent blue (#408ff5), Notification red (#f85149)

#### `share-arrows`
- **Style:** Dynamic, Friendly
- **Preset:** Energetic
- **Use Cases:** Share buttons, export actions, social features
- **Features:** Arrow flight path, rotation effect, return animation
- **Colors:** Accent blue (#408ff5)

#### `user-presence`
- **Style:** Social, Modern
- **Preset:** Subtle
- **Use Cases:** Online status, user lists, team indicators
- **Features:** Pulsing dot, ring animation, color states
- **Colors:** Online green (#4ade80), Offline gray (#9aa8c7)

### 6. E-commerce & Commerce

#### `price-ticker`
- **Style:** Dynamic, Attention-grabbing
- **Preset:** Energetic
- **Use Cases:** Price changes, sale badges, discount indicators
- **Features:** Number roll, color flash, bounce effect
- **Colors:** Sale red (#f85149), Price green (#94ce25)

#### `cart-add`
- **Style:** Friendly, Action-oriented
- **Preset:** Energetic
- **Use Cases:** Add to cart, wishlist, purchase actions
- **Features:** Item fly-to-cart, checkmark pop, smooth transition
- **Colors:** Cart blue (#408ff5), Success green (#4ade80)

#### `rating-stars`
- **Style:** Classic, Recognizable
- **Preset:** Premium
- **Use Cases:** Product ratings, reviews, feedback collection
- **Features:** Star fill animation, glow effect, half-star support
- **Colors:** Rating gold (#ffc240)

## Implementation Guidelines

### Prompt Structure

```
Create a Lottie animation for {archetype} that:
- Style: {style}
- Duration: {duration}
- Canvas: {width}x{height}
- Colors: {color palette}
- Features: {key features}
```

### Quality Gates

1. **Schema Validation** - Must be valid Bodymovin JSON
2. **Performance** - Under 50KB for web delivery
3. **Loop** - Smooth seamless loop (if applicable)
4. **Accessibility** - Respect reduced motion preference
5. **Fallback** - Provide static frame for slow connections

### Provider Chain

1. **ollama-fast(qwen2.5:7b)** - Primary for speed
2. **ollama-smart(gemma3:27b)** - Quality refinement
3. **openrouter-free** - Cost-effective fallback
4. **openrouter-cheap** - Budget tier

## Usage Examples

### React Integration

```jsx
import {Player} from '@lottiefiles/react-player';

<Player
  autoplay
  loop
  src="/animations/indicator-bars.json"
  style={{height: '100px', width: '300px'}}
/>
```

### HTML Integration

```html
<lottie-player
  src="https://assets.lottiefiles.com/packages/lf20_xxx.json"
  background="transparent"
  speed="1"
  loop
  autoplay>
</lottie-player>
```

### CSS Variables

```css
:root {
  --lottie-primary: #408ff5;
  --lottie-accent: #ffc240;
  --lottie-success: #4ade80;
  --lottie-error: #f85149;
}
```

## Next Steps

1. Map archetypes to product-specific needs
2. Generate initial assets for key surfaces
3. Review the HTML showcase with stakeholders
4. Implement in production with in-view playback and lazy-loading
5. Add accepted patterns to the consuming design system
