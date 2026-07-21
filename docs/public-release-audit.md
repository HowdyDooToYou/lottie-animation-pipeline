# Public release audit

Audit date: 2026-07-21

This document records the evidence used to approve the first public source-available release. It is operational evidence, not legal advice.

## Ownership and licensing

- Repository owner and initial licensor: `HowdyDooToYou`.
- Commit attribution resolves to the same GitHub account email across the repository history.
- Project license: PolyForm Noncommercial 1.0.0.
- Commercial use is reserved for separately executed paid licenses.
- Unsolicited code contributions are not currently accepted, preventing ambiguous relicensing rights.

## Security

- Gitleaks 8.30.1 scanned all 26 pre-release commits with redaction enabled: zero findings.
- The release gate scans the current public tree for credential patterns and private absolute paths.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `npm audit --audit-level=high`: zero vulnerabilities.
- `.env` is ignored; `.env.example` contains placeholders only.
- Vulnerability reports route to GitHub private security advisories.

## Dependency licensing

- 174 resolved packages inspected from `package-lock.json`.
- License inventory: 156 MIT, 9 ISC, 6 Apache-2.0, 2 BSD-3-Clause, and 1 CC-BY-4.0.
- The CC-BY-4.0 item is the transitive `caniuse-lite` browser-compatibility dataset and is acknowledged in `THIRD_PARTY_NOTICES.md`.

## Product validation

The release is approved only when `npm run check:release` passes. That command verifies public-release files and metadata, rebuilds deterministic production assets, runs the complete test and TypeScript/Vite build lanes, strictly validates every production Lottie file, and renders every production animation in Chromium.

## Known commercial boundary

The repository provides source, deterministic builders, validation, and runtime components. It does not yet include automated checkout, license-key enforcement, hosted infrastructure, or a service-level agreement. Commercial rights are granted only through a separately accepted order or license agreement.
