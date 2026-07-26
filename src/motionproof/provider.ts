import type {
  MotionCandidate,
  MotionProvider,
  MotionProviderInput,
} from './contracts.ts';

export type MotionProviderFunction = (input: MotionProviderInput) => Promise<unknown> | unknown;

export function defineMotionProvider(
  id: string,
  generate: MotionProviderFunction,
): MotionProvider {
  if (!id.trim()) throw new Error('Motion provider id must not be empty');
  return { id, generate: async (input) => generate(input) };
}

export function createCandidateProvider(
  animation: Record<string, unknown>,
  options: { id?: string; model?: string; recipe?: string } = {},
): MotionProvider {
  return defineMotionProvider(options.id ?? 'motionproof/candidate', async () => ({
    animation,
    model: options.model ?? 'provided-candidate',
    recipe: options.recipe,
  }));
}

export function normalizeMotionCandidate(value: unknown): MotionCandidate {
  const parsed = typeof value === 'string' ? parseJsonCandidate(value) : value;

  if (isRecord(parsed) && isRecord(parsed.animation)) {
    return {
      animation: parsed.animation,
      recipe: typeof parsed.recipe === 'string' ? parsed.recipe : undefined,
      model: typeof parsed.model === 'string' ? parsed.model : undefined,
      notes: Array.isArray(parsed.notes)
        ? parsed.notes.filter((note): note is string => typeof note === 'string')
        : undefined,
    };
  }

  if (isLottieLike(parsed)) {
    return { animation: parsed };
  }

  throw new Error(
    'Provider must return Lottie JSON, a JSON string, or { animation, model?, recipe?, notes? }',
  );
}

function parseJsonCandidate(value: string): unknown {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [trimmed, fenced].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next representation.
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      // Fall through to the structured error below.
    }
  }

  throw new Error('Provider returned text without parseable JSON');
}

function isLottieLike(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
    && Array.isArray(value.layers)
    && typeof value.w === 'number'
    && typeof value.h === 'number';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
