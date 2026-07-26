import { z } from 'zod';

export const MOTIONPROOF_SCHEMA_VERSION = '1.0' as const;
export const MOTIONPROOF_CERTIFICATION = 'MOTIONPROOF' as const;

const HexColorSchema = z.string().regex(
  /^#[0-9a-f]{6}$/i,
  'Expected a six-digit hex color such as #2f70ff',
);

export const MotionProofThemeSchema = z.object({
  primary: HexColorSchema.optional(),
  accent: HexColorSchema.optional(),
  success: HexColorSchema.optional(),
  background: HexColorSchema.optional(),
  foreground: HexColorSchema.optional(),
}).strict();

export const MotionProofRequestSchema = z.object({
  id: z.string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case id')
    .optional(),
  prompt: z.string().trim().min(3).max(2_000),
  recipe: z.string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case recipe id')
    .optional(),
  preset: z.enum(['calm', 'snappy', 'technical', 'ambient']).default('calm'),
  theme: MotionProofThemeSchema.optional(),
  description: z.string().trim().min(3).max(500).optional(),
  posterFrame: z.number().min(0).max(1).optional(),
  maxAttempts: z.number().int().min(1).max(3).default(2),
  metadata: z.record(z.string().max(500)).optional(),
}).strict();

export type MotionProofRequestInput = z.input<typeof MotionProofRequestSchema>;
export type MotionProofRequest = z.infer<typeof MotionProofRequestSchema>;
export type MotionProofTheme = z.infer<typeof MotionProofThemeSchema>;

export interface MotionProviderInput {
  request: MotionProofRequest;
  systemPrompt: string;
  attempt: number;
  previousIssues: MotionProofIssue[];
}

export interface MotionCandidate {
  animation: Record<string, unknown>;
  recipe?: string;
  model?: string;
  notes?: string[];
}

export interface MotionProvider {
  id: string;
  generate(input: MotionProviderInput): Promise<unknown>;
}

export type MotionProofFailureStage =
  | 'request'
  | 'provider'
  | 'schema'
  | 'quality'
  | 'render'
  | 'write';

export interface MotionProofIssue {
  code: string;
  message: string;
  stage: MotionProofFailureStage;
  retryable: boolean;
  path?: string;
}

export interface MotionProofCheck {
  id: 'schema' | 'quality' | 'visibility' | 'motion' | 'complexity' | 'poster';
  label: string;
  passed: boolean;
  detail: string;
}

export interface MotionProofCertification {
  name: typeof MOTIONPROOF_CERTIFICATION;
  certified: true;
  schemaVersion: typeof MOTIONPROOF_SCHEMA_VERSION;
  score: number;
  checks: MotionProofCheck[];
  quality: {
    score: number;
    strengths: string[];
    warnings: string[];
  };
  render: {
    sampledFrames: number[];
    paintedPixels: number[];
    changedPixelsFromPrevious: number[];
    meaningfulMotionSampleCount: number;
  };
}

export type MotionProofArtifactKind =
  | 'animation'
  | 'poster'
  | 'preview'
  | 'report'
  | 'manifest';

export interface MotionProofArtifact {
  kind: MotionProofArtifactKind;
  path: string;
  relativePath: string;
  mediaType: string;
  bytes: number;
  sha256?: string;
}

export interface MotionProofAttempt {
  attempt: number;
  provider: string;
  recipe?: string;
  stage: MotionProofFailureStage | 'certified';
  issues: MotionProofIssue[];
}

export interface MotionProofSuccess {
  ok: true;
  id: string;
  outputDirectory: string;
  provider: {
    id: string;
    model?: string;
    recipe?: string;
  };
  certification: MotionProofCertification;
  artifacts: MotionProofArtifact[];
  attempts: MotionProofAttempt[];
}

export interface MotionProofFailure {
  ok: false;
  id?: string;
  stage: MotionProofFailureStage;
  issues: MotionProofIssue[];
  attempts: MotionProofAttempt[];
}

export type MotionProofResult = MotionProofSuccess | MotionProofFailure;

export interface CreateMotionOptions {
  provider?: MotionProvider;
  outputDirectory?: string;
  chromiumPath?: string;
  overwrite?: boolean;
}
