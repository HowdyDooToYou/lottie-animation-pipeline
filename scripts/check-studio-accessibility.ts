#!/usr/bin/env tsx

import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import puppeteer from 'puppeteer-core';

import { findChromium } from '../src/generator/render-validation.ts';
import { chromiumLaunchArguments } from '../src/motionproof/render.ts';

interface AxeNode {
  failureSummary?: string;
  html: string;
  target: string[];
}

interface AxeViolation {
  description: string;
  help: string;
  id: string;
  impact: string | null;
  nodes: AxeNode[];
}

interface AxeResult {
  violations: AxeViolation[];
}

interface AuditProfile {
  name: string;
  reducedMotion: boolean;
  viewport: {
    height: number;
    isMobile?: boolean;
    width: number;
  };
}

const buildDirectory = path.resolve(process.cwd(), 'studio-dist');
const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const profiles: AuditProfile[] = [
  {
    name: 'desktop',
    reducedMotion: false,
    viewport: { width: 1440, height: 1100 },
  },
  {
    name: 'mobile-reduced',
    reducedMotion: true,
    viewport: { width: 390, height: 844, isMobile: true },
  },
];

if (!fs.existsSync(path.join(buildDirectory, 'index.html'))) {
  throw new Error('Studio build is missing. Run npm run build before the accessibility gate.');
}

const server = await startStaticServer(buildDirectory);
const address = server.address();
if (!address || typeof address === 'string') {
  await closeServer(server);
  throw new Error('Accessibility server did not bind to a TCP port');
}

const browser = await puppeteer.launch({
  executablePath: findChromium(),
  headless: true,
  args: chromiumLaunchArguments(),
});

let runtimeErrorCount = 0;
let violationCount = 0;

try {
  for (const profile of profiles) {
    const page = await browser.newPage();
    const runtimeErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      runtimeErrors.push(error instanceof Error ? error.message : String(error));
    });

    try {
      await page.setViewport(profile.viewport);
      await page.emulateMediaFeatures([
        {
          name: 'prefers-reduced-motion',
          value: profile.reducedMotion ? 'reduce' : 'no-preference',
        },
      ]);
      await page.goto(`http://127.0.0.1:${address.port}/`, {
        waitUntil: 'networkidle0',
      });
      await page.waitForSelector('h1');
      await page.addScriptTag({ path: axePath });

      const result = await page.evaluate(async (): Promise<AxeResult> => {
        const browserAxe = (window as Window & {
          axe?: {
            run: (
              context: Document,
              options: Record<string, unknown>,
            ) => Promise<AxeResult>;
          };
        }).axe;
        if (!browserAxe) throw new Error('axe-core was not injected');
        return browserAxe.run(document, {
          resultTypes: ['violations'],
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });
      });

      if (runtimeErrors.length > 0) {
        runtimeErrorCount += runtimeErrors.length;
        console.error(
          `❌ ${profile.name}: ${runtimeErrors.length} browser error(s)\n`
          + runtimeErrors.map((error) => `  - ${error}`).join('\n'),
        );
      }

      if (result.violations.length === 0 && runtimeErrors.length === 0) {
        console.log(`✅ ${profile.name}: 0 WCAG A/AA violations`);
        continue;
      }

      violationCount += result.violations.length;
      for (const violation of result.violations) {
        console.error(
          `❌ ${profile.name}: ${violation.id} (${violation.impact ?? 'unknown'}) — `
          + `${violation.help} [${violation.nodes.length} node(s)]`,
        );
        for (const node of violation.nodes.slice(0, 5)) {
          console.error(`  - ${node.target.join(' ')}: ${node.failureSummary ?? node.html}`);
        }
      }
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await closeServer(server);
}

if (violationCount > 0 || runtimeErrorCount > 0) {
  throw new Error(
    'Studio accessibility gate failed: '
    + `${violationCount} WCAG violation(s), ${runtimeErrorCount} runtime browser error(s)`,
  );
}

console.log('✅ Studio accessibility: desktop + mobile reduced-motion profiles passed');

async function startStaticServer(root: string): Promise<Server> {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relativePath = decodeURIComponent(requestUrl.pathname) === '/'
      ? 'index.html'
      : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    const filePath = path.resolve(root, relativePath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
        return;
      }
      response.writeHead(200, {
        'content-type': contentType(filePath),
        'cache-control': 'no-store',
      });
      response.end(contents);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function contentType(filePath: string): string {
  switch (path.extname(filePath)) {
    case '.avif': return 'image/avif';
    case '.css': return 'text/css; charset=utf-8';
    case '.gif': return 'image/gif';
    case '.html': return 'text/html; charset=utf-8';
    case '.ico': return 'image/x-icon';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.jpeg':
    case '.jpg': return 'image/jpeg';
    case '.json': return 'application/json; charset=utf-8';
    case '.otf': return 'font/otf';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    case '.ttf': return 'font/ttf';
    case '.webp': return 'image/webp';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}
