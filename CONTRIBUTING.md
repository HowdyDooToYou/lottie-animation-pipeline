# Contributing

Bug reports, production-validation cases, documentation improvements, recipes,
and focused code contributions are welcome.

## Before opening a pull request

1. Open or reference an issue for substantial behavior or contract changes.
2. Keep the provider-neutral boundary: credentials, billing, and model-specific
   SDKs belong in host applications.
3. Add a regression test for every certification, rendering, or packaging fix.
4. Run the smallest relevant test, then `npm run check:release` when the public
   contract, SDK, CLI, recipes, MCP server, plugin bundle, or certification path
   changes.
5. Keep the pull request focused and explain the user-visible impact.

Never include API keys, credentials, proprietary animation assets, customer
information, or confidential material in an issue, test fixture, or pull
request.

## Contribution license

Unless you clearly state otherwise, every contribution intentionally submitted
for inclusion in MotionProof is offered under the recipient's choice of the MIT
License or the Apache License, Version 2.0, with no additional terms.

By submitting a contribution, you represent that you have the right to license
it that way. If your employer or another party owns the work, obtain permission
before submitting it. Mark material that is only discussion and is not intended
as a contribution with `Not a Contribution`.

This project does not require a contributor license agreement. Contributions
join the same dual-licensed open core and are not silently reassigned to a
proprietary product.

## Review standard

The verifier is the product boundary. A pull request must not weaken strict
schema checks, browser evidence, reduced-motion behavior, atomic promotion, or
provenance to make an animation pass. Rejected candidates stay rejected and
structured failures stay machine-readable.
