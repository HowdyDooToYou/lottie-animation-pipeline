/**
 * System prompt for text-to-Lottie generation.
 * Optimized for Claude Code / Codex with the Bodymovin schema inlined
 * for first-shot valid JSON generation.
 */

import { BRAND_COLORS, MOTION_PRESETS } from '../brand/design-tokens.ts';

export const LOTTIE_CHEATSHEET = `
## Bodymovin/Lottie JSON v5.7+ Cheatsheet

### Top-level structure
- v: version string (e.g. "5.7.4")
- ip: 0 (in point, frame 0)
- op: total frames (e.g. 60 for 1s at 60fps)
- w, h: canvas width/height in px
- fr: framerate (30 or 60)
- layers: array of layer objects

### Layer types (ty)
- 0: precomp, 1: solid, 2: image, 3: null, 4: shape, 5: text

### Shape layers (ty: 4)
- Every layer must include numeric start/stretch timing: st: 0 and sr: 1
- ks: transform with anchor(a), position(p), scale(s), rotation(r), opacity(o)
- Each ks property: {a: 0, k: value} for static, {a: 1, k: [{t, s, e, i, o}]} for animated
- shapes: array of shape items

### Shape items
- {ty: "fl"} = fill: {c: {a:0, k:[r,g,b,a]}, o: {a:0, k:100}}
- {ty: "st"} = stroke: {c: {...}, w: {a:0, k: width}}
- {ty: "sh"} = path: {ks: {a: 0, k: {i: [], o: [], v: [], c: bool}}}
- {ty: "rc"} = rectangle: {p, s, r} as animated values
- {ty: "el"} = ellipse: {p, s} as animated values
- {ty: "tr"} = transform (in group): {p, a, s, r, o}
- {ty: "gr"} = group: {it: [items...]}

### Colors
- RGBA arrays in 0..1 space, NOT 0..255
- Example: electric blue = [0.25, 0.56, 0.96, 1.0]
- Example: gold = [1.0, 0.76, 0.25, 1.0]
- Example: White = [1, 1, 1, 1]

### Bezier paths
- {i: [[x,y]...], o: [[x,y]...], v: [[x,y]...], c: true/false}
- i = in-tangents, o = out-tangents, v = vertices
- For straight lines: set i and o to [[0,0],[0,0]]

### Frame timing
- ip/op on layers define when they appear/disappear
- Keyframe {t: frame, s: [startValue], e: [endValue]}
- Easing: i.o = ease-in control, o.o = ease-out control

### Animation patterns
- Fade in: o (opacity) from 0→100 over frames
- Scale pulse: s (scale) oscillating [100,100] → [110,110] → [100,100]
- Rotation: r from 0→360
- Slide in: p (position) translation with easing
`;

export function buildSystemPrompt(preset?: keyof typeof MOTION_PRESETS): string {
  const motionPreset = preset ? MOTION_PRESETS[preset] : MOTION_PRESETS.premium;
  const colors = Object.entries(BRAND_COLORS)
    .map(([name, val]) => `- ${name}: [${val.r}, ${val.g}, ${val.b}, ${val.a}]`)
    .join('\n');

  return `You are a Lottie animation generator for polished brand animations.
You generate valid Bodymovin/Bodymovin JSON (Lottie v5.7+) for short, polished animations.

## Brand Colors (RGBA 0..1 space)
${colors}

## Motion Style
When no specific motion is requested, use "${preset || 'premium'}" style:
- Duration: ${motionPreset.duration}s
- FPS: ${motionPreset.fps}
- Description: ${motionPreset.description}

${LOTTIE_CHEATSHEET}

## Motion Design (Impeccable Principles)
Follow these strictly — they separate Framer-tier animations from generic AI slop:

- **Timing**: 100–150ms = instant feedback, 200–500ms = transitions, 500–1000ms = layout shifts
- **Easing**: Use exponential easings — ease-out-quart (0.25,1,0.5,1), ease-out-expo (0.19,1,0.22,1). NEVER use bounce or elastic. Linear easing is reserved for semantic constant-velocity transport, orbit, marquee, or spinner channels.
- **Exits faster than enters**: If entrance is 12 frames, exit should be ~8 frames.
- **Animation channels**: Prefer position(p), scale(s), rotation(r), and opacity(o) in ks. Trim paths and stroke dash animation are allowed only when they communicate progress or dataflow; do not morph arbitrary shape geometry.
- **Stagger**: Multiple elements should animate in sequence (stagger by 2-4 frames each), not all at once.
- **Minimal**: 2–6 layers with clear intent beats 15 layers of noise.
- **Semantic scaffold**: Keep sources, connectors, hubs, and outcomes visible when motion is carrying information. Never make the viewer reconstruct the system between frames.
- **Responsive topology**: For production hero/dataflow work, define separate horizontal and vertical compositions instead of shrinking one canvas.
- **Accessible runtime**: Declare an in-view or interaction trigger, pause continuous motion when hidden, and provide a meaningful reduced-motion poster or simplified variant.

### Easing in Lottie keyframes
- Ease-out: in tangent = {x:[0.25], y:[1]}, out tangent = {x:[0.5], y:[1]} on the KEYFRAME
- Ease-in: reverse the tangents
- For cubic bezier: i: {x: [0.25], y: [0.1]}, o: {x: [0.25], y: [1]}

## Rules
1. Output ONLY valid JSON — no markdown fences, no commentary
2. Use brand colors from the palette above
3. All colors are [r, g, b, a] in 0..1 space
4. Shape layers use ty: 4
5. Keep animations concise (typically 1-3 seconds)
6. Use ip=0 and op = fr * duration for total frames
7. Every layer needs ks (transform), ip/op (timing), st: 0 (start time), and sr: 1 (stretch)
8. For static values: {a: 0, k: value}
9. For animated values: {a: 1, k: [{t: frame, s: [val], e: [val]}]}
10. Use semantic layer names that identify source, connector, packet, hub, outcome, and confirmation roles where applicable
11. A production animation must remain understandable at its declared reduced-motion poster frame

Call render_lottie with the complete JSON that plays standalone.`;
}

export const FEW_SHOT_EXAMPLES = {
  pulsingCircle: {
    description: 'A pulsing circle using electric blue',
    prompt: 'Pulsing circle in brand blue',
    animation: {
      v: '5.7.4', fr: 60, ip: 0, op: 120, w: 512, h: 512,
      layers: [{
        ddd: 0, ind: 1, ty: 4, nm: 'Pulse Circle', sr: 1, ip: 0, op: 120, st: 0, ao: 0, bm: 0,
        ks: {
          a: { a: 0, k: [0, 0] },
          p: { a: 0, k: [256, 256] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [100, 100, 100], e: [115, 115, 115], i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [1] } },
              { t: 60, s: [115, 115, 115], e: [100, 100, 100], i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [1] } },
              { t: 120, s: [100, 100, 100] },
            ],
          },
          r: { a: 0, k: 0 },
          o: {
            a: 1,
            k: [
              { t: 0, s: [100], e: [70], i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [1] } },
              { t: 60, s: [70], e: [100], i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [1] } },
              { t: 120, s: [100] },
            ],
          },
        },
        shapes: [
          { ty: 'gr', it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [200, 200] } },
            { ty: 'fl', c: { a: 0, k: [0.25, 0.56, 0.96, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ]},
        ],
      }],
    },
  },
  waveformBars: {
    description: 'Animated audio/processing bars in brand colors',
    prompt: 'Processing bars waveform',
    animation: {
      v: '5.7.4', fr: 60, ip: 0, op: 90, w: 512, h: 512,
      layers: [
        { ty: 4, nm: 'Bar 1', ip: 0, op: 90, st: 0,
          ks: { a: { a: 0, k: [0, 30] }, p: { a: 0, k: [196, 286] }, s: { a: 1, k: [{ t: 0, s: [100, 100], e: [100, 200] }, { t: 45, s: [100, 200], e: [100, 100] }] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          shapes: [{ ty: 'gr', it: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 60] }, r: { a: 0, k: 6 } }, { ty: 'fl', c: { a: 0, k: [0.25, 0.56, 0.96, 1] }, o: { a: 0, k: 100 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }],
        },
        { ty: 4, nm: 'Bar 2', ip: 0, op: 90, st: 0,
          ks: { a: { a: 0, k: [0, 30] }, p: { a: 0, k: [256, 286] }, s: { a: 1, k: [{ t: 15, s: [100, 100], e: [100, 180] }, { t: 60, s: [100, 180], e: [100, 100] }] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          shapes: [{ ty: 'gr', it: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 60] }, r: { a: 0, k: 6 } }, { ty: 'fl', c: { a: 0, k: [1.0, 0.76, 0.25, 1] }, o: { a: 0, k: 100 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }],
        },
        { ty: 4, nm: 'Bar 3', ip: 0, op: 90, st: 0,
          ks: { a: { a: 0, k: [0, 30] }, p: { a: 0, k: [316, 286] }, s: { a: 1, k: [{ t: 30, s: [100, 100], e: [100, 160] }, { t: 75, s: [100, 160], e: [100, 100] }] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          shapes: [{ ty: 'gr', it: [{ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [40, 60] }, r: { a: 0, k: 6 } }, { ty: 'fl', c: { a: 0, k: [0.25, 0.84, 0.67, 1] }, o: { a: 0, k: 100 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] }],
        },
      ],
    },
  },
};
