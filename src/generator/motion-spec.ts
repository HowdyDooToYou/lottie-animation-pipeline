import { z } from 'zod';

export const MOTION_SPEC_VERSION = '1.0' as const;

export const MotionRoleSchema = z.enum([
  'feedback',
  'transition',
  'transport',
  'ambient',
  'narrative',
]);

export const MotionTriggerSchema = z.enum([
  'autoplay',
  'in-view',
  'hover',
  'scroll-step',
  'scroll-progress',
  'manual',
]);

export const LoopStrategySchema = z.enum(['none', 'seamless', 'hold-reset', 'continuous']);
export const SemanticRoleKindSchema = z.enum([
  'source',
  'connector',
  'packet',
  'hub',
  'outcome',
  'confirmation',
  'ambient',
]);

export const MotionSpecSchema = z.object({
  version: z.literal(MOTION_SPEC_VERSION),
  role: MotionRoleSchema,
  trigger: MotionTriggerSchema,
  loopStrategy: LoopStrategySchema,
  semanticRoles: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    kind: SemanticRoleKindSchema,
    persistent: z.boolean(),
  })).min(2).superRefine((roles, ctx) => {
    const ids = roles.map((role) => role.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'semantic role ids must be unique' });
    }
  }),
  responsiveVariants: z.array(z.object({
    id: z.string().min(1),
    aspectRatio: z.string().regex(/^\d+:\d+$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    topology: z.enum(['horizontal', 'vertical', 'compact']),
    required: z.boolean(),
  })).min(1).superRefine((variants, ctx) => {
    const ids = variants.map((variant) => variant.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'responsive variant ids must be unique' });
    }
  }),
  reducedMotion: z.object({
    strategy: z.enum(['poster', 'simplified', 'shortened']),
    posterFrame: z.number().min(0).max(1),
    preserveRoles: z.array(z.string().min(1)).min(1),
  }),
  timelineStages: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    start: z.number().min(0).max(1),
    end: z.number().min(0).max(1),
  }).refine((stage) => stage.end > stage.start, 'timeline stage end must be greater than start')).optional(),
  allowLinearContinuousMotion: z.boolean().default(false),
  maxAnimatedChannels: z.number().int().positive().max(64).default(24),
}).superRefine((spec, ctx) => {
  const roleIds = new Set(spec.semanticRoles.map((role) => role.id));
  for (const role of spec.reducedMotion.preserveRoles) {
    if (!roleIds.has(role)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reducedMotion', 'preserveRoles'],
        message: `reduced-motion role "${role}" is not declared in semanticRoles`,
      });
    }
  }

  const stages = spec.timelineStages ?? [];
  for (let index = 1; index < stages.length; index++) {
    if (stages[index].start < stages[index - 1].end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timelineStages', index],
        message: 'timeline stages must be ordered and non-overlapping',
      });
    }
  }

  if (spec.allowLinearContinuousMotion && !['transport', 'ambient'].includes(spec.role)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowLinearContinuousMotion'],
      message: 'linear continuous motion is only valid for transport or ambient roles',
    });
  }
});

export type MotionSpec = z.infer<typeof MotionSpecSchema>;
export type MotionRole = z.infer<typeof MotionRoleSchema>;
export type MotionTrigger = z.infer<typeof MotionTriggerSchema>;

export function validateMotionSpec(value: unknown): MotionSpec {
  return MotionSpecSchema.parse(value);
}

export function describeMotionSpec(spec: MotionSpec): string {
  const variants = spec.responsiveVariants
    .map((variant) => `${variant.id} ${variant.aspectRatio} ${variant.topology}`)
    .join(', ');
  const roles = spec.semanticRoles.map((role) => `${role.id}:${role.kind}`).join(', ');
  const stages = spec.timelineStages?.map((stage) => `${stage.label} ${stage.start}-${stage.end}`).join(', ');

  return [
    `Motion contract v${spec.version}: ${spec.role}, trigger ${spec.trigger}, loop ${spec.loopStrategy}.`,
    `Semantic roles: ${roles}.`,
    `Responsive deliverables: ${variants}.`,
    `Reduced motion: ${spec.reducedMotion.strategy} at ${Math.round(spec.reducedMotion.posterFrame * 100)}% preserving ${spec.reducedMotion.preserveRoles.join(', ')}.`,
    stages ? `Timeline stages: ${stages}.` : '',
    spec.allowLinearContinuousMotion
      ? 'Constant-velocity linear easing is permitted only on continuous transport or ambient channels.'
      : 'Use exponential easing; do not use bounce, elastic, or linear easing.',
    `Keep animated channels at or below ${spec.maxAnimatedChannels}.`,
  ].filter(Boolean).join(' ');
}
