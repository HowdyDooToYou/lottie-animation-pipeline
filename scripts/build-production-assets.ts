#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { buildAttributionFlowAnimation } from '../src/generator/attribution-flow.ts';
import { ATTRIBUTION_FLOW_MOTION_SPEC } from '../src/generator/archetypes.ts';
import { productionQualityGate } from '../src/generator/production-quality.ts';
import { validateLottie } from '../src/generator/schema.ts';

const outputDirectory = path.resolve(process.cwd(), 'public/animations/final');
const outputs = [
  { id: 'attribution-flow-01', variant: 'desktop' as const },
  { id: 'attribution-flow-mobile-01', variant: 'mobile' as const },
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const output of outputs) {
  const animation = buildAttributionFlowAnimation(output.variant);
  validateLottie(animation);
  const report = productionQualityGate(animation, ATTRIBUTION_FLOW_MOTION_SPEC, output.variant);
  if (!report.passed) {
    throw new Error(`${output.id} failed production quality: ${report.issues.join('; ')}`);
  }
  const outputPath = path.join(outputDirectory, `${output.id}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(animation, null, 2)}\n`);
  console.log(`✅ ${output.id} — production ${output.variant} (${report.score}/100)`);
}
