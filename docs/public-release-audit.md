# Public release audit

Audit date: 2026-07-26

This document records the evidence used to approve the first public open-source
release. It is operational evidence, not legal advice.

## Ownership and licensing

- Repository owner and initial licensor: `HowdyDooToYou`.
- Commit attribution resolves to the same GitHub account email across the repository history.
- Project license expression: `MIT OR Apache-2.0`.
- Recipients may select either license, including for commercial use.
- Canonical terms ship as `LICENSE-MIT` and `LICENSE-APACHE`, with the choice
  and scope summarized in `LICENSE.md`.
- Contributions are accepted under the same dual-license choice; the inbound
  terms are explicit in `CONTRIBUTING.md`.
- Future paid packs, hosted capabilities, support, and OEM services are
  separate offerings and do not narrow rights in released core versions.

## Security

- An earlier Gitleaks 8.30.1 history scan covered the first 26 pre-release
  commits with redaction enabled and returned zero findings.
- The current release gate scanned 163 public-tree files for credential
  patterns and private absolute paths.
- `npm audit --omit=dev --audit-level=low`: zero vulnerabilities.
- `npm audit --audit-level=low`: zero vulnerabilities.
- `.env` is ignored; `.env.example` contains placeholders only.
- Vulnerability reports route to GitHub private security advisories.

## Dependency licensing

- 207 resolved package records inspected from `package-lock.json`.
- License inventory: 186 MIT, 9 ISC, 7 Apache-2.0, 3 BSD-3-Clause, 1
  CC-BY-4.0, and 1 MPL-2.0.
- The CC-BY-4.0 item is the transitive `caniuse-lite` browser-compatibility dataset and is acknowledged in `THIRD_PARTY_NOTICES.md`.
- The MPL-2.0 item is the development-only `axe-core` accessibility auditor;
  it is not included in the published package.

## Product validation

The release is approved only when `npm run check:release` passes. That command
verifies public-release files and metadata, rebuilds deterministic production
assets, runs 52 automated tests plus the complete TypeScript/Vite build lanes,
audits the built studio against WCAG A/AA at desktop and mobile reduced-motion
profiles, strictly validates every production Lottie file, renders every
production animation in Chromium, packs the npm tarball, installs it in a clean
consumer project, imports the SDK, invokes the npm binary, creates a certified
five-file bundle, and completes an MCP handshake through the packaged plugin
launcher.

The browser product was also exercised at 1440 px and 390 px with zero console,
page, or failed-request errors. Both animation surfaces rendered, recipe
selection and clipboard feedback worked, the document had no horizontal
overflow, and reduced-motion mode stopped on a poster frame with an explicit
play control. The Impeccable source audit returned zero interface
anti-patterns.

## Open-core boundary

The repository provides the complete local core: source, deterministic recipes,
a typed SDK and CLI, local agent integrations, validation, artifact packaging,
and the product studio. Commercial use of that core does not require a separate
agreement.

No premium pack, hosted service, enterprise control plane, warranty, or
service-level agreement is included or currently offered. If introduced, those
separate products and services may use separate terms. The planned boundary is
documented in `OPEN_CORE.md`.
