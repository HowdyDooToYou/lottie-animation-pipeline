import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  inspectCandidate,
  certifyCandidate,
  qualityIssues,
} from './certification.ts';
import {
  SOLIDDD_SCHEMA_VERSION,
  SolidddRequestSchema,
  type CreateMotionOptions,
  type MotionCandidate,
  type SolidddArtifact,
  type SolidddAttempt,
  type SolidddFailure,
  type SolidddFailureStage,
  type SolidddIssue,
  type SolidddRequest,
  type SolidddRequestInput,
  type SolidddResult,
  type SolidddSuccess,
} from './contracts.ts';
import { createPortablePreviewHtml } from './preview.ts';
import { buildProviderPrompt } from './provider-prompt.ts';
import { normalizeMotionCandidate } from './provider.ts';
import { createRecipeProvider } from './recipes.ts';
import { renderSolidddCandidate } from './render.ts';

export async function createMotion(
  input: SolidddRequestInput,
  options: CreateMotionOptions = {},
): Promise<SolidddResult> {
  const parsed = SolidddRequestSchema.safeParse(input);
  if (!parsed.success) return requestFailure(parsed.error);

  const request = parsed.data;
  const id = request.id ?? buildRequestId(request);
  const provider = options.provider ?? createRecipeProvider();
  const attempts: SolidddAttempt[] = [];
  const outputRoot = path.resolve(
    options.outputDirectory ?? path.join(process.cwd(), 'soliddd-output'),
  );
  const targetDirectory = path.join(outputRoot, id);

  if (!options.overwrite && await exists(targetDirectory)) {
    return {
      ok: false,
      id,
      stage: 'write',
      issues: [{
        code: 'write.output-exists',
        message: `Output bundle already exists: ${targetDirectory}. Choose a new id or opt into overwrite.`,
        stage: 'write',
        retryable: false,
        path: targetDirectory,
      }],
      attempts,
    };
  }

  let previousIssues: SolidddIssue[] = [];

  for (let attempt = 1; attempt <= request.maxAttempts; attempt += 1) {
    let candidate: MotionCandidate;

    try {
      const generated = await provider.generate({
        request,
        systemPrompt: buildProviderPrompt(request),
        attempt,
        previousIssues,
      });
      candidate = normalizeMotionCandidate(generated);
    } catch (error) {
      previousIssues = [issueFromError('provider.generation-failed', error, 'provider', true)];
      attempts.push({
        attempt,
        provider: provider.id,
        stage: 'provider',
        issues: previousIssues,
      });
      continue;
    }

    const animation = addSolidddMetadata(candidate.animation, {
      id,
      request,
      provider: provider.id,
      recipe: candidate.recipe,
    });

    let inspection;
    try {
      inspection = inspectCandidate(animation);
    } catch (error) {
      previousIssues = schemaIssues(error);
      attempts.push({
        attempt,
        provider: provider.id,
        recipe: candidate.recipe,
        stage: 'schema',
        issues: previousIssues,
      });
      continue;
    }

    if (!inspection.quality.passed) {
      previousIssues = qualityIssues(inspection.quality);
      if (previousIssues.length === 0) {
        previousIssues = [{
          code: 'quality.below-threshold',
          message: `Candidate scored ${inspection.quality.score}/100; 85/100 is required.`,
          stage: 'quality',
          retryable: true,
        }];
      }
      attempts.push({
        attempt,
        provider: provider.id,
        recipe: candidate.recipe,
        stage: 'quality',
        issues: previousIssues,
      });
      continue;
    }

    const posterFrame = resolvePosterFrame(request, animation);
    let render;
    try {
      render = await renderSolidddCandidate(animation, {
        chromiumPath: options.chromiumPath,
        posterFrame,
      });
    } catch (error) {
      previousIssues = [issueFromError('render.browser-failed', error, 'render', true)];
      attempts.push({
        attempt,
        provider: provider.id,
        recipe: candidate.recipe,
        stage: 'render',
        issues: previousIssues,
      });
      continue;
    }

    const certified = certifyCandidate(inspection, render.probe, render.poster.byteLength);
    if (!certified.certification) {
      previousIssues = certified.issues;
      attempts.push({
        attempt,
        provider: provider.id,
        recipe: candidate.recipe,
        stage: previousIssues[0]?.stage ?? 'render',
        issues: previousIssues,
      });
      continue;
    }

    attempts.push({
      attempt,
      provider: provider.id,
      recipe: candidate.recipe,
      stage: 'certified',
      issues: [],
    });

    try {
      const artifacts = await writeCertifiedBundle({
        id,
        animation,
        request,
        provider: {
          id: provider.id,
          model: candidate.model,
          recipe: candidate.recipe,
        },
        certification: certified.certification,
        attempts,
        poster: render.poster,
        playerSource: render.playerSource,
        posterFrame,
        outputRoot,
        targetDirectory,
        overwrite: options.overwrite ?? false,
      });

      return {
        ok: true,
        id,
        outputDirectory: targetDirectory,
        provider: {
          id: provider.id,
          model: candidate.model,
          recipe: candidate.recipe,
        },
        certification: certified.certification,
        artifacts,
        attempts,
      } satisfies SolidddSuccess;
    } catch (error) {
      return {
        ok: false,
        id,
        stage: 'write',
        issues: [issueFromError('write.bundle-failed', error, 'write', false)],
        attempts,
      };
    }
  }

  return {
    ok: false,
    id,
    stage: previousIssues[0]?.stage ?? 'provider',
    issues: previousIssues.length > 0
      ? previousIssues
      : [{
        code: 'provider.no-candidate',
        message: 'The provider exhausted its attempts without returning a candidate.',
        stage: 'provider',
        retryable: true,
      }],
    attempts,
  } satisfies SolidddFailure;
}

interface BundleInput {
  id: string;
  animation: Record<string, unknown>;
  request: SolidddRequest;
  provider: { id: string; model?: string; recipe?: string };
  certification: SolidddSuccess['certification'];
  attempts: SolidddAttempt[];
  poster: Buffer;
  playerSource: string;
  posterFrame: number;
  outputRoot: string;
  targetDirectory: string;
  overwrite: boolean;
}

async function writeCertifiedBundle(input: BundleInput): Promise<SolidddArtifact[]> {
  await fs.mkdir(input.outputRoot, { recursive: true });
  const stagingDirectory = path.join(
    input.outputRoot,
    `.soliddd-${input.id}-${randomUUID()}`,
  );
  await fs.mkdir(stagingDirectory);

  const animationContent = `${JSON.stringify(input.animation, null, 2)}\n`;
  const reportContent = `${JSON.stringify({
    schemaVersion: SOLIDDD_SCHEMA_VERSION,
    id: input.id,
    request: input.request,
    provider: input.provider,
    certification: input.certification,
    attempts: input.attempts,
  }, null, 2)}\n`;
  const previewContent = createPortablePreviewHtml({
    animation: input.animation,
    certification: input.certification,
    title: String(input.animation.nm ?? input.id),
    description: input.request.description ?? input.request.prompt,
    posterFrame: input.posterFrame,
    playerSource: input.playerSource,
  });

  const files = [
    {
      kind: 'animation' as const,
      relativePath: 'animation.json',
      mediaType: 'application/vnd.lottie+json',
      content: Buffer.from(animationContent),
    },
    {
      kind: 'poster' as const,
      relativePath: 'poster.png',
      mediaType: 'image/png',
      content: input.poster,
    },
    {
      kind: 'preview' as const,
      relativePath: 'preview.html',
      mediaType: 'text/html',
      content: Buffer.from(previewContent),
    },
    {
      kind: 'report' as const,
      relativePath: 'certification.json',
      mediaType: 'application/json',
      content: Buffer.from(reportContent),
    },
  ];

  try {
    for (const file of files) {
      await fs.writeFile(path.join(stagingDirectory, file.relativePath), file.content, {
        flag: 'wx',
      });
    }

    const manifestArtifacts = files.map((file) => ({
      kind: file.kind,
      path: file.relativePath,
      mediaType: file.mediaType,
      bytes: file.content.byteLength,
      sha256: sha256(file.content),
    }));
    const manifestContent = `${JSON.stringify({
      schemaVersion: SOLIDDD_SCHEMA_VERSION,
      certification: 'SOLIDDD',
      id: input.id,
      createdAt: new Date().toISOString(),
      promptHash: sha256(Buffer.from(input.request.prompt)),
      provider: input.provider,
      score: input.certification.score,
      artifacts: manifestArtifacts,
    }, null, 2)}\n`;
    await fs.writeFile(path.join(stagingDirectory, 'manifest.json'), manifestContent, {
      flag: 'wx',
    });

    await promoteStagingDirectory(
      stagingDirectory,
      input.targetDirectory,
      input.overwrite,
    );

    return [
      ...manifestArtifacts.map((artifact) => ({
        kind: artifact.kind,
        path: path.join(input.targetDirectory, artifact.path),
        relativePath: artifact.path,
        mediaType: artifact.mediaType,
        bytes: artifact.bytes,
        sha256: artifact.sha256,
      })),
      {
        kind: 'manifest',
        path: path.join(input.targetDirectory, 'manifest.json'),
        relativePath: 'manifest.json',
        mediaType: 'application/json',
        bytes: Buffer.byteLength(manifestContent),
        sha256: sha256(Buffer.from(manifestContent)),
      },
    ] satisfies SolidddArtifact[];
  } catch (error) {
    await fs.rm(stagingDirectory, { recursive: true, force: true });
    throw error;
  }
}

async function promoteStagingDirectory(
  stagingDirectory: string,
  targetDirectory: string,
  overwrite: boolean,
): Promise<void> {
  if (!await exists(targetDirectory)) {
    await fs.rename(stagingDirectory, targetDirectory);
    return;
  }

  if (!overwrite) {
    throw new Error(`Output bundle already exists: ${targetDirectory}`);
  }

  const backupDirectory = `${targetDirectory}.backup-${randomUUID()}`;
  await fs.rename(targetDirectory, backupDirectory);
  try {
    await fs.rename(stagingDirectory, targetDirectory);
    await fs.rm(backupDirectory, { recursive: true, force: true });
  } catch (error) {
    if (!await exists(targetDirectory) && await exists(backupDirectory)) {
      await fs.rename(backupDirectory, targetDirectory);
    }
    throw error;
  }
}

function addSolidddMetadata(
  source: Record<string, unknown>,
  input: {
    id: string;
    request: SolidddRequest;
    provider: string;
    recipe?: string;
  },
): Record<string, unknown> {
  const animation = JSON.parse(JSON.stringify(source)) as Record<string, unknown>;
  const meta = isRecord(animation.meta) ? animation.meta : {};
  const existingSoliddd = isRecord(meta.soliddd) ? meta.soliddd : {};
  const accessibility = isRecord(meta.accessibility) ? meta.accessibility : {};
  animation.meta = {
    ...meta,
    soliddd: {
      ...existingSoliddd,
      schemaVersion: SOLIDDD_SCHEMA_VERSION,
      id: input.id,
      provider: input.provider,
      recipe: input.recipe ?? existingSoliddd.recipe,
      preset: input.request.preset,
      promptHash: sha256(Buffer.from(input.request.prompt)),
    },
    accessibility: {
      ...accessibility,
      description: input.request.description
        ?? (typeof accessibility.description === 'string'
          ? accessibility.description
          : input.request.prompt),
    },
  };
  return animation;
}

function resolvePosterFrame(
  request: SolidddRequest,
  animation: Record<string, unknown>,
): number {
  if (request.posterFrame !== undefined) return request.posterFrame;
  if (
    isRecord(animation.meta)
    && isRecord(animation.meta.soliddd)
    && typeof animation.meta.soliddd.posterFrame === 'number'
  ) return animation.meta.soliddd.posterFrame;
  return 0.52;
}

function requestFailure(error: z.ZodError): SolidddFailure {
  const issues = error.issues.map((item) => ({
    code: `request.${item.code}`,
    message: item.message,
    stage: 'request' as const,
    retryable: false,
    path: item.path.join('.'),
  }));
  return { ok: false, stage: 'request', issues, attempts: [] };
}

function schemaIssues(error: unknown): SolidddIssue[] {
  if (error instanceof z.ZodError) {
    return error.issues.slice(0, 8).map((item) => ({
      code: `schema.${item.code}`,
      message: item.message,
      stage: 'schema',
      retryable: true,
      path: item.path.join('.'),
    }));
  }
  return [issueFromError('schema.invalid', error, 'schema', true)];
}

function issueFromError(
  code: string,
  error: unknown,
  stage: SolidddFailureStage,
  retryable: boolean,
): SolidddIssue {
  return {
    code,
    message: sanitizeError(error instanceof Error ? error.message : String(error)),
    stage,
    retryable,
  };
}

function sanitizeError(message: string): string {
  return message
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/AIza[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
}

function buildRequestId(request: SolidddRequest): string {
  const words = request.prompt.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .split('-')
    .filter(Boolean)
    .slice(0, 6)
    .join('-') || 'motion';
  const digest = sha256(Buffer.from(JSON.stringify({
    prompt: request.prompt,
    recipe: request.recipe,
    preset: request.preset,
    theme: request.theme,
  }))).slice(0, 8);
  return `${words.slice(0, 56)}-${digest}`.replace(/-+/g, '-');
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
