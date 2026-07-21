import { ATTRIBUTION_FLOW_MOTION_SPEC } from './archetypes.ts';

type Point = [number, number];
type Color = [number, number, number, number];

const BLUE: Color = [0.25, 0.56, 0.96, 1];
const MINT: Color = [0.25, 0.84, 0.67, 1];
const GOLD: Color = [1, 0.76, 0.25, 1];
const WHITE: Color = [0.92, 0.95, 1, 1];
const PANEL: Color = [0.08, 0.12, 0.2, 1];
const RAIL: Color = [0.24, 0.31, 0.45, 1];
const EASE_OUT = { i: { x: [0.25], y: [1] }, o: { x: [0.5], y: [1] } };
const LINEAR = { i: { x: [0.667], y: [0.667] }, o: { x: [0.333], y: [0.333] } };

export type AttributionFlowVariant = 'desktop' | 'mobile';

export function buildAttributionFlowAnimation(variant: AttributionFlowVariant): Record<string, unknown> {
  const desktop = variant === 'desktop';
  const width = desktop ? 960 : 540;
  const height = desktop ? 540 : 960;
  const sources: Point[] = desktop
    ? [[150, 150], [150, 270], [150, 390]]
    : [[140, 150], [270, 150], [400, 150]];
  const hub: Point = desktop ? [500, 270] : [270, 490];
  const outcome: Point = desktop ? [790, 270] : [270, 785];
  const sourceSize: Point = desktop ? [190, 82] : [112, 92];
  const outcomeSize: Point = desktop ? [210, 180] : [310, 164];
  const companion = desktop ? 'mobile' : 'desktop';

  const layers: Record<string, unknown>[] = [
    ...sources.map((position, index) => sourceCard(`Source ${index + 1}`, position, sourceSize, [BLUE, MINT, GOLD][index])),
    ...sources.map((position, index) => railLayer(`Rail ${index + 1}`, position, hub, outcome, desktop)),
    hubLayer('Decision Hub', hub),
    outcomeLayer('Attributed Outcome', outcome, outcomeSize, desktop),
    ...sources.map((position, index) => packetLayer(`Signal ${index + 1}`, position, hub, outcome, index * 16)),
    confirmationLayer('Confidence Confirmation', desktop ? [outcome[0], outcome[1] - 42] : [outcome[0] + 94, outcome[1] - 42]),
    rectangleLayer('Scene Background', [width / 2, height / 2], [width, height], 0, [0.035, 0.055, 0.095, 1]),
  ];

  return {
    v: '5.7.4',
    fr: 60,
    ip: 0,
    op: 180,
    w: width,
    h: height,
    nm: `Attribution Flow — ${variant}`,
    ddd: 0,
    meta: {
      production: {
        motionSpecVersion: ATTRIBUTION_FLOW_MOTION_SPEC.version,
        variant,
        posterFrame: ATTRIBUTION_FLOW_MOTION_SPEC.reducedMotion.posterFrame,
        companionVariants: [companion],
        semanticLayerMap: {
          sources: ['Source 1', 'Source 2', 'Source 3'],
          rails: ['Rail 1', 'Rail 2', 'Rail 3'],
          signals: ['Signal 1', 'Signal 2', 'Signal 3'],
          'decision-hub': ['Decision Hub'],
          outcome: ['Attributed Outcome'],
          confirmation: ['Confidence Confirmation'],
        },
      },
      accessibility: {
        description: 'Three evidence sources move through persistent attribution rails into a decision hub and resolve as one attributed outcome.',
        reducedMotion: 'Show the poster frame at 52 percent with sources, rails, hub, and outcome visible.',
      },
    },
    layers: layers.map((layer, index) => ({ ...layer, ind: index + 1 })),
  };
}

function sourceCard(name: string, position: Point, size: Point, accent: Color): Record<string, unknown> {
  const compact = size[0] < 150;
  return shapeLayer(name, position, [
    group('Source token', [
      rect([-(size[0] / 2) + (compact ? 18 : 24), 0], [compact ? 8 : 10, size[1] - 26], 5),
      fill(accent, 100),
    ]),
    group('Label line', [
      rect([compact ? 12 : 8, -12], [compact ? 52 : 96, 8], 4),
      fill(WHITE, 82),
    ]),
    group('Detail line', [
      rect([compact ? 5 : -8, 11], [compact ? 38 : 64, 6], 3),
      fill(accent, 58),
    ]),
    group('Card', [
      rect([0, 0], size, 16),
      stroke(RAIL, 2, 72),
      fill(PANEL, 100),
    ]),
  ]);
}

function railLayer(name: string, source: Point, hub: Point, outcome: Point, desktop: boolean): Record<string, unknown> {
  const middle: Point = desktop ? [hub[0] - 105, source[1]] : [source[0], hub[1] - 120];
  const vertices: Point[] = [source, middle, hub, outcome];
  return shapeLayer(name, [0, 0], [
    group('Persistent rail', [
      pathShape(vertices),
      stroke(RAIL, 3, 78),
    ]),
  ]);
}

function hubLayer(name: string, position: Point): Record<string, unknown> {
  return shapeLayer(name, position, [
    group('Hub glyph horizontal', [rect([0, -8], [34, 7], 4), fill(WHITE, 84)]),
    group('Hub glyph vertical', [rect([0, 9], [22, 7], 4), fill(MINT, 88)]),
    group('Inner hub', [ellipse([0, 0], [76, 76]), stroke(MINT, 2, 78), fill([0.09, 0.16, 0.25, 1], 100)]),
    group('Outer hub', [ellipse([0, 0], [128, 128]), stroke(BLUE, 3, 90), fill([0.055, 0.09, 0.16, 1], 100)]),
  ]);
}

function outcomeLayer(name: string, position: Point, size: Point, desktop: boolean): Record<string, unknown> {
  return shapeLayer(name, position, [
    group('Outcome eyebrow', [rect([desktop ? -42 : -58, -48], [desktop ? 84 : 116, 8], 4), fill(GOLD, 88)]),
    group('Outcome metric', [rect([desktop ? -16 : -22, -10], [desktop ? 126 : 170, 22], 8), fill(WHITE, 92)]),
    group('Outcome support', [rect([desktop ? -35 : -48, 26], [desktop ? 88 : 120, 7], 4), fill(BLUE, 65)]),
    group('Outcome confidence', [rect([desktop ? -47 : -62, 49], [desktop ? 64 : 88, 7], 4), fill(MINT, 74)]),
    group('Outcome card', [rect([0, 0], size, 22), stroke(GOLD, 3, 90), fill([0.07, 0.11, 0.18, 1], 100)]),
  ]);
}

function packetLayer(name: string, source: Point, hub: Point, outcome: Point, delay: number): Record<string, unknown> {
  const start = 12 + delay;
  const hubAt = 78 + delay;
  const outcomeAt = 122 + delay;
  const hiddenAt = Math.min(156 + delay, 166);
  const source3 = point3(source);
  const hub3 = point3(hub);
  const outcome3 = point3(outcome);
  return shapeLayer(name, source, [
    group('Signal packet', [ellipse([0, 0], [18, 18]), stroke(WHITE, 2, 90), fill(BLUE, 100)]),
  ], {
    p: {
      a: 1,
      k: [
        { t: 0, s: source3, e: source3, ...LINEAR },
        { t: start, s: source3, e: hub3, ...LINEAR },
        { t: hubAt, s: hub3, e: outcome3, ...LINEAR },
        { t: outcomeAt, s: outcome3, e: outcome3, ...LINEAR },
        { t: hiddenAt, s: source3, e: source3, ...LINEAR },
        { t: 180, s: source3 },
      ],
    },
    o: {
      a: 1,
      k: [
        { t: 0, s: [16], e: [16], ...EASE_OUT },
        { t: start, s: [16], e: [100], ...EASE_OUT },
        { t: start + 10, s: [100], e: [100], ...EASE_OUT },
        { t: outcomeAt, s: [100], e: [16], ...EASE_OUT },
        { t: Math.min(outcomeAt + 8, 174), s: [16], e: [16], ...EASE_OUT },
        { t: 180, s: [16] },
      ],
    },
  });
}

function confirmationLayer(name: string, position: Point): Record<string, unknown> {
  return shapeLayer(name, position, [
    group('Confirmation ring', [ellipse([0, 0], [38, 38]), stroke(GOLD, 3, 100)]),
    group('Confirmation core', [ellipse([0, 0], [12, 12]), fill(MINT, 100)]),
  ], {
    s: {
      a: 1,
      k: [
        { t: 0, s: [100, 100], e: [100, 100], ...EASE_OUT },
        { t: 118, s: [100, 100], e: [108, 108], ...EASE_OUT },
        { t: 138, s: [108, 108], e: [100, 100], ...EASE_OUT },
        { t: 154, s: [100, 100], e: [100, 100], ...EASE_OUT },
        { t: 180, s: [100, 100] },
      ],
    },
    o: {
      a: 1,
      k: [
        { t: 0, s: [38], e: [38], ...EASE_OUT },
        { t: 112, s: [38], e: [100], ...EASE_OUT },
        { t: 130, s: [100], e: [38], ...EASE_OUT },
        { t: 154, s: [38], e: [38], ...EASE_OUT },
        { t: 180, s: [38] },
      ],
    },
  });
}

function rectangleLayer(name: string, position: Point, size: Point, radius: number, color: Color): Record<string, unknown> {
  return shapeLayer(name, position, [group(name, [rect([0, 0], size, radius), fill(color, 100)])]);
}

function shapeLayer(
  name: string,
  position: Point,
  shapes: Record<string, unknown>[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ty: 4, nm: name, sr: 1, ip: 0, op: 180, st: 0, ao: 0, bm: 0,
    ks: {
      a: { a: 0, k: [0, 0] },
      p: overrides.p ?? { a: 0, k: position },
      s: overrides.s ?? { a: 0, k: [100, 100] },
      r: { a: 0, k: 0 },
      o: overrides.o ?? { a: 0, k: 100 },
    },
    shapes,
  };
}

function group(name: string, items: Record<string, unknown>[]): Record<string, unknown> {
  return {
    ty: 'gr', nm: name,
    it: [...items, {
      ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] },
      s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 },
    }],
  };
}

function rect(position: Point, size: Point, radius: number): Record<string, unknown> {
  return { ty: 'rc', p: { a: 0, k: position }, s: { a: 0, k: size }, r: { a: 0, k: radius } };
}

function ellipse(position: Point, size: Point): Record<string, unknown> {
  return { ty: 'el', p: { a: 0, k: position }, s: { a: 0, k: size } };
}

function fill(color: Color, opacity: number): Record<string, unknown> {
  return { ty: 'fl', c: { a: 0, k: color }, o: { a: 0, k: opacity } };
}

function stroke(color: Color, width: number, opacity: number): Record<string, unknown> {
  return { ty: 'st', c: { a: 0, k: color }, w: { a: 0, k: width }, o: { a: 0, k: opacity }, lc: 2, lj: 2 };
}

function pathShape(vertices: Point[]): Record<string, unknown> {
  return {
    ty: 'sh',
    ks: {
      a: 0,
      k: {
        i: vertices.map(() => [0, 0]),
        o: vertices.map(() => [0, 0]),
        v: vertices,
        c: false,
      },
    },
  };
}

function point3(point: Point): [number, number, number] {
  return [point[0], point[1], 0];
}
