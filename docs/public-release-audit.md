# Public release audit

Audit date: 2026-07-26

This document records the evidence used to approve the first public source-available release. It is operational evidence, not legal advice.

## Ownership and licensing

- Repository owner and initial licensor: `HowdyDooToYou`.
- Commit attribution resolves to the same GitHub account email across the repository history.
- Project license: PolyForm Noncommercial 1.0.0.
- Commercial use is reserved for separately executed paid licenses.
- Unsolicited code contributions are not currently accepted, preventing ambiguous relicensing rights.

## Security

- An earlier Gitleaks 8.30.1 history scan covered the first 26 pre-release
  commits with redaction enabled and returned zero findings.
- The current release gate scanned 147 public-tree files for credential
  patterns and private absolute paths.
- `npm audit --omit=dev --audit-level=low`: zero vulnerabilities.
- `npm audit --audit-level=low`: zero vulnerabilities.
- `.env` is ignored; `.env.example` contains placeholders only.
- Vulnerability reports route to GitHub private security advisories.

## Dependency licensing

- 206 resolved package records inspected from `package-lock.json`.
- License inventory: 186 MIT, 9 ISC, 7 Apache-2.0, 3 BSD-3-Clause, and 1
  CC-BY-4.0.
- The CC-BY-4.0 item is the transitive `caniuse-lite` browser-compatibility dataset and is acknowledged in `THIRD_PARTY_NOTICES.md`.

## Product validation

The release is approved only when `npm run check:release` passes. That command
verifies public-release files and metadata, rebuilds deterministic production
assets, runs 52 automated tests plus the complete TypeScript/Vite build lanes,
strictly validates every production Lottie file, renders every production
animation in Chromium, packs the npm tarball, installs it in a clean consumer project,
imports the SDK, invokes the npm binary, creates a certified five-file bundle,
and completes an MCP handshake through the packaged plugin launcher.

The browser product was also exercised at 1440 px and 390 px with zero console,
page, or failed-request errors. Both animation surfaces rendered, recipe
selection and clipboard feedback worked, the document had no horizontal
overflow, and reduced-motion mode stopped on a poster frame with an explicit
play control. The Impeccable source audit returned zero interface
anti-patterns.

## Known commercial boundary

The repository provides source, deterministic recipes, a typed SDK and CLI,
local agent integrations, validation, and artifact packaging. It does not yet
include automated checkout, license-key enforcement, hosted infrastructure, or
a service-level agreement. Commercial rights are granted only through a
separately accepted order or license agreement.
