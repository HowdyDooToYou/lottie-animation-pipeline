export type MotionPreset = 'premium' | 'energetic' | 'subtle' | 'technical';

export interface LottieArchetype {
  slug: string;
  label: string;
  preset: MotionPreset;
  intent: string;
  motionNotes: string[];
  features?: string[];
  colors?: string[];
}

export const ARCHETYPES: LottieArchetype[] = [
  // Data Visualization
  {
    slug: 'indicator-bars',
    label: 'Indicator Bars',
    preset: 'technical',
    intent: 'Create stacked indicator bars with staggered slide timing and a dashboard feel.',
    motionNotes: ['Use electric blue as the primary color.', 'Add a gold accent bar.', 'Keep the layout compact and metrics-oriented.'],
    features: ['staggered-animation', 'color-coded', 'metric-display'],
    colors: ['#408ff5', '#ffc240'],
  },
  {
    slug: 'pulse-ring',
    label: 'Pulse Ring',
    preset: 'premium',
    intent: 'Create a centered pulse ring with smooth breathing scale changes.',
    motionNotes: ['Lead with gold for emphasis.', 'Use subtle opacity easing.', 'Keep the canvas balanced and calm.'],
    features: ['breathing-effect', 'concentric', 'status-indicator'],
    colors: ['#ffc240'],
  },
  {
    slug: 'waveform-bars',
    label: 'Waveform Bars',
    preset: 'technical',
    intent: 'Create multiple bars with staggered bounce timing for audio/process visualization.',
    motionNotes: ['Use electric blue, gold, and mint for variety.', 'Each bar should peak at different times.', 'Show rhythmic processing.'],
    features: ['staggered-bounce', 'multi-color', 'rhythmic'],
    colors: ['#408ff5', '#ffc240', '#40d6ab'],
  },

  {
    slug: 'metric-rise',
    label: 'Metric Rise',
    preset: 'technical',
    intent: 'Create bars rising from the baseline to show growth or progress.',
    motionNotes: ['Stagger each bar rise by 2-4 frames.', 'Ease out as values settle at their peaks.', 'Use electric blue with a gold accent on the tallest bar.'],
    features: ['growth', 'staggered-rise', 'metric-display'],
    colors: ['#408ff5', '#ffc240'],
  },
  {
    slug: 'signal-convergence',
    label: 'Signal Convergence',
    preset: 'technical',
    intent: 'Create a structured routing panel where visible signal packets travel along persistent rails into a processing hub.',
    motionNotes: ['Keep the routing scaffold visible throughout.', 'Stagger packets by 2-4 frames.', 'Use a restrained gold confirmation arc at the hub.'],
    features: ['data-routing', 'persistent-scaffold', 'staggered-arrival'],
    colors: ['#408ff5', '#40d6ab', '#ffc240'],
  },

  // Micro-Interactions
  {
    slug: 'check-mark',
    label: 'Check Mark',
    preset: 'premium',
    intent: 'Create a smooth check mark draw effect with scale pop for success states.',
    motionNotes: ['Draw from left to right.', 'Add subtle scale bounce at end.', 'Fill with success green.'],
    features: ['draw-effect', 'scale-pop', 'celebration'],
    colors: ['#4ade80'],
  },
  {
    slug: 'error-shake',
    label: 'Error Shake',
    preset: 'energetic',
    intent: 'Create a horizontal shake with red glow for error/warning states.',
    motionNotes: ['3 quick shakes left/right.', 'Flash red glow at start.', 'Return to neutral position.'],
    features: ['shake-animation', 'urgent', 'warning'],
    colors: ['#f85149'],
  },
  {
    slug: 'button-pulse',
    label: 'Button Pulse',
    preset: 'subtle',
    intent: 'Create a gentle pulse glow for hover states on buttons.',
    motionNotes: ['Scale from 100% to 105%.', 'Fade border glow in/out.', 'Loop smoothly.'],
    features: ['hover-state', 'gentle', 'interactive'],
    colors: ['#408ff5'],
  },

  // Branding & Hero
  {
    slug: 'hero-orbit',
    label: 'Hero Orbit',
    preset: 'premium',
    intent: 'Create orbiting elements with gradient trails for hero sections.',
    motionNotes: ['Center focus with orbiting elements.', 'Add subtle gradient trails.', 'Keep motion smooth and premium.'],
    features: ['orbiting', 'gradient-trail', 'futuristic'],
    colors: ['#408ff5', '#ffc240'],
  },
  {
    slug: 'sparkle-field',
    label: 'Sparkle Field',
    preset: 'premium',
    intent: 'Create random sparkle particles for celebration or brand moments.',
    motionNotes: ['Random positions across canvas.', 'Fade in/out with scale.', 'Gold sparkles with white highlights.'],
    features: ['particle-effect', 'celebration', 'magical'],
    colors: ['#ffc240', '#ffffff'],
  },
  {
    slug: 'gradient-flow',
    label: 'Gradient Flow',
    preset: 'energetic',
    intent: 'Create smooth flowing gradient waves for background patterns.',
    motionNotes: ['Organic wave movement.', 'Subtle opacity changes.', 'Use brand gradient colors.'],
    features: ['organic-flow', 'background-pattern', 'subtle'],
    colors: ['#408ff5', '#7aa2f7'],
  },

  // Loading & Progress
  {
    slug: 'spinning-dots',
    label: 'Spinning Dots',
    preset: 'subtle',
    intent: 'Create three dots that travel in a circular path for compact loading.',
    motionNotes: ['Stagger each dot by 1/3 rotation.', 'Use muted blue color.', 'Smooth circular motion.'],
    features: ['circular-motion', 'sequential', 'minimal'],
    colors: ['#7aa2f7'],
  },
  {
    slug: 'progress-ring',
    label: 'Progress Ring',
    preset: 'technical',
    intent: 'Create an animated stroke ring for progress tracking.',
    motionNotes: ['Animate stroke-dashoffset.', 'Smooth easing at start/end.', 'Match brand blue for stroke.'],
    features: ['stroke-animation', 'progress-tracking', 'circular'],
    colors: ['#408ff5'],
  },
  {
    slug: 'milestone-bloom',
    label: 'Milestone Bloom',
    preset: 'premium',
    intent: 'Create a milestone seal with a persistent track, three status dots, a gold progress sweep, and a mint check reveal.',
    motionNotes: ['Keep the baseline ring and dots visible throughout.', 'Bound scale between 90% and 115%.', 'Return cleanly to the baseline state for looping.'],
    features: ['completion-seal', 'trim-path', 'persistent-scaffold'],
    colors: ['#408ff5', '#40d6ab', '#ffc240'],
  },
  {
    slug: 'skeleton-loader',
    label: 'Skeleton Loader',
    preset: 'subtle',
    intent: 'Create shimmer effect for content loading placeholders.',
    motionNotes: ['Gradient sweep left to right.', 'Multiple variants for text/content.', 'Subtle animation.'],
    features: ['shimmer-effect', 'content-placeholder', 'multiple-sizes'],
    colors: ['#414868', '#505a7a'],
  },

  // Social & Collaboration
  {
    slug: 'notification-bell',
    label: 'Notification Bell',
    preset: 'technical',
    intent: 'Create a bell with subtle bounce and optional badge counter.',
    motionNotes: ['Single gentle bounce on load.', 'Badge pulses if unread.', 'Clean icon style.'],
    features: ['bounce-animation', 'badge-support', 'recognizable'],
    colors: ['#408ff5', '#f85149'],
  },
  {
    slug: 'share-arrows',
    label: 'Share Arrows',
    preset: 'energetic',
    intent: 'Create flying arrows for share/export actions.',
    motionNotes: ['Two arrows in sequence.', 'Flight path to corners.', 'Return animation.'],
    features: ['flight-path', 'sequence', 'action-feedback'],
    colors: ['#408ff5'],
  },
  {
    slug: 'user-presence',
    label: 'User Presence',
    preset: 'subtle',
    intent: 'Create a circular user avatar with pulsing online/offline indicator.',
    motionNotes: ['Dot pulses when online.', 'Static ring when offline.', 'Smooth transition.'],
    features: ['presence-indicator', 'status-change', 'avatar-friendly'],
    colors: ['#4ade80', '#9aa8c7'],
  },

  // E-commerce & Commerce
  {
    slug: 'price-ticker',
    label: 'Price Ticker',
    preset: 'energetic',
    intent: 'Create number roll with color flash for price changes.',
    motionNotes: ['Numbers roll up/down.', 'Red flash for decrease.', 'Green flash for increase.'],
    features: ['number-animation', 'price-change', 'attention-grabbing'],
    colors: ['#f85149', '#94ce25'],
  },
  {
    slug: 'cart-add',
    label: 'Cart Add',
    preset: 'energetic',
    intent: 'Create item flying to cart with checkmark success.',
    motionNotes: ['Item flies from button to cart.', 'Checkmark pops at destination.', 'Smooth transition.'],
    features: ['fly-animation', 'success-feedback', 'commerce-action'],
    colors: ['#408ff5', '#4ade80'],
  },
  {
    slug: 'rating-stars',
    label: 'Rating Stars',
    preset: 'premium',
    intent: 'Create star fill animation with glow effect.',
    motionNotes: ['Fill from left to right.', 'Add glow on completion.', 'Support half-stars.'],
    features: ['fill-animation', 'star-rating', 'visual-feedback'],
    colors: ['#ffc240'],
  },
];

export interface VariantPlanItem {
  slug: string;
  label: string;
  preset: MotionPreset;
  prompt: string;
}

export function buildArchetypePrompt(archetype: LottieArchetype, theme: string): string {
  return [
    `${theme}.`,
    archetype.intent,
    ...archetype.motionNotes,
    'Use valid Lottie shape layers and transform-based animation only.',
  ].join(' ');
}

export function buildVariantPlan(theme: string): VariantPlanItem[] {
  return ARCHETYPES.map((archetype) => ({
    slug: archetype.slug,
    label: archetype.label,
    preset: archetype.preset,
    prompt: buildArchetypePrompt(archetype, theme),
  }));
}
