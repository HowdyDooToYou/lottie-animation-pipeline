# Agent integration

MotionProof supports four integration levels. Choose the smallest surface the host
can use.

Install the current public release into the host project first:

```bash
npm install https://github.com/HowdyDooToYou/lottie-animation-pipeline/releases/download/v2.0.0/motionproof-2.0.0.tgz
```

The commands below then resolve the project-local MotionProof binary. Registry
publication is a separate future distribution step.

## 1. JSON CLI

Every coding agent can execute the CLI:

```bash
npx motionproof create "A calm save confirmation" --json
```

Use exit code `0` and `ok: true` as the promotion condition. Exit code `1`
means the request or candidate failed. Exit code `2` means invalid CLI usage.

To certify a candidate generated elsewhere:

```bash
npx motionproof certify ./candidate.json \
  --prompt "A calm save confirmation" \
  --out ./public/motion \
  --json
```

Standard output is JSON in `--json` mode. Human diagnostics use standard error.

## 2. Typed provider

Keep the model client in the host:

```ts
import { createMotion, defineMotionProvider } from "motionproof";

const provider = defineMotionProvider("studio-model", async (input) => {
  return studio.generate({
    system: input.systemPrompt,
    prompt: input.request.prompt,
    attempt: input.attempt,
    feedback: input.previousIssues,
  });
});

const result = await createMotion(
  {
    id: "save-confirmation",
    prompt: "A calm save confirmation",
    maxAttempts: 3,
  },
  {
    provider,
    outputDirectory: "./public/motion",
  },
);
```

This is the preferred integration when an application already owns provider
credentials, telemetry, rate limits, and billing.

## 3. MCP

Run the local stdio server:

```bash
npx motionproof mcp
```

Example configuration:

```json
{
  "mcpServers": {
    "motionproof": {
      "command": "npx",
      "args": ["motionproof", "mcp"]
    }
  }
}
```

Available tools:

- `create_motion`
- `certify_motion`
- `list_motion_recipes`

The server returns both text content and structured content. Errors are marked
with `isError: true`. It negotiates the current stable MCP protocol and
advertises read, write, destructive, idempotency, and open-world hints so hosts
can apply an appropriate approval policy.

## 4. Agent Skill and plugins

The distributable bundle is:

```text
plugins/motionproof/
├── .claude-plugin/plugin.json
├── .codex-plugin/plugin.json
├── .mcp.json
├── bin/motionproof-mcp.cjs
└── skills/create-motion/
    ├── SKILL.md
    └── agents/openai.yaml
```

Claude Code development:

```bash
claude --plugin-dir ./plugins/motionproof
```

Invoke:

```text
/motionproof:create-motion Create a restrained onboarding success state.
```

Codex and ChatGPT use the same skill through the OpenAI plugin manifest. The
skill follows the open Agent Skills format and can also be copied into a host's
supported repo or user skill directory.

For a skills-only Codex project install:

```bash
mkdir -p .agents/skills
cp -R ./plugins/motionproof/skills/create-motion .agents/skills/
```

For a skills-only Claude Code project install:

```bash
mkdir -p .claude/skills
cp -R ./plugins/motionproof/skills/create-motion .claude/skills/
```

The plugin MCP launcher first resolves the CLI bundled with the repository or
npm package. A standalone plugin installation uses the exact plugin version
through npm rather than floating to `latest`.

## Agent rules

Agents integrating MotionProof must:

1. require `ok: true`;
2. verify `certification.certified: true`;
3. use `poster.png` when reduced motion is requested;
4. preserve the manifest and certification evidence;
5. report structured failures instead of moving rejected JSON into production;
6. respect target surfaces that explicitly prohibit motion;
7. keep provider credentials outside MotionProof requests and artifacts; and
8. keep candidates expression-free, vector-only, and independent of external
   media or font assets.

## CI example

```bash
npm ci
npm run build:sdk
node dist/cli.js certify ./candidate.json \
  --prompt "Release motion candidate" \
  --id release-candidate \
  --out ./ci-artifacts \
  --json > ./ci-result.json
jq -e '.ok and .certification.certified' ./ci-result.json
```

Set `CHROMIUM_BIN` in containers where Chrome cannot be auto-detected.
