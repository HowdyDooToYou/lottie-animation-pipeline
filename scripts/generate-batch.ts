#!/usr/bin/env tsx
/**
 * Manifest-driven batch generation.
 *
 * Usage:
 *   npm run generate:batch                          # all animations in animations/manifest.json
 *   npm run generate:batch -- path/to/manifest.json
 *   npm run generate:batch -- --id hero-orbit-01    # single animation by id
 *   npm run generate:batch -- --force               # ignore cache, regenerate
 *   npm run generate:batch -- --dry-run             # show what would generate
 *
 * Caching: params are hashed; unchanged entries whose output exists are skipped.
 * Reports: every run writes reports/generation-<timestamp>.json.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generateWithQualityGate } from '../src/generator/quality-gated-generate.ts';
import { ARCHETYPES, buildArchetypePrompt, type LottieArchetype } from '../src/generator/archetypes.ts';

interface ManifestEntry {
  id: string;
  archetype: string;
  name: string;
  params?: { width?: number; height?: number; color?: string; duration?: number };
  usage?: string;
}

interface Manifest {
  version: string;
  animations: ManifestEntry[];
}

interface CacheEntry {
  hash: string;
  path: string;
  score: number;
  generatedAt: string;
}

interface ReportRow {
  id: string;
  archetype: string;
  file: string | null;
  status: 'generated' | 'cached' | 'planned' | 'failed';
  passed?: boolean;
  score?: number;
  iterations?: number;
  provider?: string;
  model?: string;
  durationMs?: number;
  error?: string;
}

const PROMPT_VERSION = 1; // bump to invalidate all cache entries after prompt changes

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const idIndex = args.indexOf('--id');
const onlyId = idIndex >= 0 ? args[idIndex + 1] : null;
const manifestPath = args.find(a => a.endsWith('.json') && !a.startsWith('--'))
  || path.join(process.cwd(), 'animations/manifest.json');

const CACHE_PATH = path.join(process.cwd(), '.cache/lottie-generations.json');
const OUTPUT_DIR = path.join(process.cwd(), 'public/animations/final');
const REPORTS_DIR = path.join(process.cwd(), 'reports');

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function entryHash(entry: ManifestEntry): string {
  return crypto.createHash('sha256')
    .update(JSON.stringify({ archetype: entry.archetype, params: entry.params ?? {}, v: PROMPT_VERSION }))
    .digest('hex')
    .slice(0, 16);
}

function buildPrompt(entry: ManifestEntry, archetype: LottieArchetype): string {
  const p = entry.params ?? {};
  const constraints: string[] = [];
  if (p.width && p.height) constraints.push(`Canvas exactly ${p.width}x${p.height} pixels (w=${p.width}, h=${p.height}).`);
  if (p.color) constraints.push(`Primary color ${p.color}.`);
  if (p.duration) constraints.push(`Duration exactly ${p.duration} frames at 60fps (ip=0, op=${p.duration}).`);
  return [buildArchetypePrompt(archetype, entry.name), ...constraints].join(' ');
}

(async () => {
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  let entries = manifest.animations;
  if (onlyId) {
    entries = entries.filter(e => e.id === onlyId);
    if (entries.length === 0) {
      console.error(`❌ No manifest entry with id "${onlyId}" in ${manifestPath}`);
      process.exit(1);
    }
  }

  const cache = loadCache();
  const rows: ReportRow[] = [];
  const startedAt = new Date();

  console.log(`🎬 Batch generation: ${entries.length} animation(s) from ${path.relative(process.cwd(), manifestPath)}`);
  if (dryRun) console.log('   (dry run — no generation)');
  if (force) console.log('   (force — cache ignored)');

  for (const entry of entries) {
    const archetype = ARCHETYPES.find(a => a.slug === entry.archetype);
    if (!archetype) {
      console.error(`❌ ${entry.id}: unknown archetype "${entry.archetype}" — add it to src/generator/archetypes.ts`);
      rows.push({ id: entry.id, archetype: entry.archetype, file: null, status: 'failed', error: 'unknown archetype' });
      continue;
    }

    const hash = entryHash(entry);
    const outPath = path.join(OUTPUT_DIR, `${entry.id}.json`);
    const cached = cache[entry.id];

    if (!force && cached?.hash === hash && fs.existsSync(outPath)) {
      console.log(`⏭️  ${entry.id}: unchanged since ${cached.generatedAt} (score ${cached.score}) — skipping`);
      rows.push({ id: entry.id, archetype: entry.archetype, file: outPath, status: 'cached', score: cached.score });
      continue;
    }

    const prompt = buildPrompt(entry, archetype);

    if (dryRun) {
      console.log(`📝 ${entry.id} [${archetype.preset}]: ${prompt.slice(0, 120)}…`);
      rows.push({ id: entry.id, archetype: entry.archetype, file: outPath, status: 'planned' });
      continue;
    }

    const t0 = Date.now();
    try {
      const result = await generateWithQualityGate({
        name: entry.id,
        prompt,
        preset: archetype.preset,
        outputDir: OUTPUT_DIR,
      });

      rows.push({
        id: entry.id,
        archetype: entry.archetype,
        file: result.path,
        status: 'generated',
        passed: result.passed,
        score: result.score,
        iterations: result.iterations,
        provider: result.provider,
        model: result.model,
        durationMs: Date.now() - t0,
      });

      cache[entry.id] = { hash, path: result.path, score: result.score, generatedAt: new Date().toISOString() };
      saveCache(cache);
    } catch (err) {
      console.error(`❌ ${entry.id}: ${(err as Error).message}`);
      rows.push({
        id: entry.id,
        archetype: entry.archetype,
        file: null,
        status: 'failed',
        durationMs: Date.now() - t0,
        error: (err as Error).message,
      });
    }
  }

  // Write report
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORTS_DIR, `generation-${stamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    manifest: path.relative(process.cwd(), manifestPath),
    dryRun,
    force,
    results: rows,
  }, null, 2));

  // Summary
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\n' + '─'.repeat(50));
  console.log(`Summary: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
  console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);

  process.exit(counts.failed ? 1 : 0);
})().catch((err) => {
  console.error('❌', (err as Error).message);
  process.exit(1);
});
