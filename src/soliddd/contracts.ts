import { z } from 'zod';

export const SOLIDDD_SCHEMA_VERSION = '1.0' as const;
export const SOLIDDD_CERTIFICATION = 'SOLIDDD' as const;

const HexColorSchema = z.string().regex(
  /^#[0-9a-f]{6}$/i,
  'Expected a six-digit hex color such as #2f70ff',
);

export const SolidddThemeSchema = z.object({
  primary: HexColorSchema.optional(),
  accent: HexColorSchema.optional(),
  success: HexColorSchema.optional(),
  background: HexColorSchema.optional(),
  foreground: HexColorSchema.optional(),
}).strict();

export const SolidddRequestSchema = z.object({
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
  theme: SolidddThemeSchema.optional(),
  description: z.string().trim().min(3).max(500).optional(),
  posterFrame: z.number().min(0).max(1).optional(),
  maxAttempts: z.number().int().min(1).max(3).default(2),
  metadata: z.record(z.string().max(500)).optional(),
}).strict();

export type SolidddRequestInput = z.input<typeof SolidddRequestSchema>;
export type SolidddRequest = z.infer<typeof SolidddRequestSchema>;
export type SolidddTheme = z.infer<typeof SolidddThemeSchema>;

export interface MotionProviderInput {
  request: SolidddRequest;
  systemPrompt: string;
  attempt: number;
  previousIssues: SolidddIssue[];
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

export type SolidddFailureStage =
  | 'request'
  | 'provider'
  | 'schema'
  | 'quality'
  | 'render'
  | 'write';

export interface SolidddIssue {
  code: string;
  message: string;
  stage: SolidddFailureStage;
  retryable: boolean;
  path?: string;
}

export interface SolidddCheck {
  id: 'schema' | 'quality' | 'visibility' | 'motion' | 'complexity' | 'poster';
  label: string;
  passed: boolean;
  detail: string;
}

export interface SolidddCertification {
  name: typeof SOLIDDD_CERTIFICATION;
  certified: true;
  schemaVersion: typeof SOLIDDD_SCHEMA_VERSION;
  score: number;
  checks: SolidddCheck[];
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

export type SolidddArtifactKind =
  | 'animation'
  | 'poster'
  | 'preview'
  | 'report'
  | 'manifest';

export interface SolidddArtifact {
  kind: SolidddArtifactKind;
  path: string;
  relativePath: string;
  mediaType: string;
  bytes: number;
  sha256?: string;
}

export interface SolidddAttempt {
  attempt: number;
  provider: string;
  recipe?: string;
  stage: SolidddFailureStage | 'certified';
  issues: SolidddIssue[];
}

export interface SolidddSuccess {
  ok: true;
  id: string;
  outputDirectory: string;
  provider: {
    id: string;
    model?: string;
    recipe?: string;
  };
  certification: SolidddCertification;
  artifacts: SolidddArtifact[];
  attempts: SolidddAttempt[];
}

export interface SolidddFailure {
  ok: false;
  id?: string;
  stage: SolidddFailureStage;
  issues: SolidddIssue[];
  attempts: SolidddAttempt[];
}

export type SolidddResult = SolidddSuccess | SolidddFailure;

export interface CreateMotionOptions {
  provider?: MotionProvider;
  outputDirectory?: string;
  chromiumPath?: string;
  overwrite?: boolean;
}
