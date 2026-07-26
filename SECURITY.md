# Security policy

## Supported versions

Security fixes are applied to the latest release on the default branch.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or exposed credential. Use [GitHub private vulnerability reporting](https://github.com/HowdyDooToYou/lottie-animation-pipeline/security/advisories/new).

Include the affected version or commit, impact, reproduction steps, and any suggested mitigation. Please allow reasonable time for investigation and remediation before public disclosure.

## Candidate isolation

Soliddd treats provider and imported Lottie JSON as untrusted input. The
certified subset excludes executable expressions, image/audio layers, embedded
or remote media, and external font paths. Certification runs the
expression-free light player in Chromium with page network requests blocked.
Chromium's process sandbox remains enabled except when the process runs as root
or the operator explicitly sets `SOLIDDD_CHROMIUM_NO_SANDBOX=1`.

Do not disable those controls to make a candidate pass. A candidate that
depends on executable or external content is outside the Soliddd contract.
