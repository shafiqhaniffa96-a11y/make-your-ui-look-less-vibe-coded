# Production CSS Cleaner Implementation Plan

Goal: move the main workflow from screenshots to production CSS transformation.
Architecture: PostCSS AST plugin plus a Node CLI, conservative detection, per-rule exceptions, JSON diagnostics. Retain the original Python API as a legacy utility.
Tech stack: Node 20+, PostCSS 8, node:test.

- [ ] Implement and test one-sided solid accent detection and empty decorative pseudo-elements.
- [ ] Preserve ambiguous declarations, full borders, interactive selectors, cascade conflicts, and vibe-keep rules.
- [ ] Implement CLI output/report/check mode with input overwrite protection.
- [ ] Document production-only integration after CSS generation and before minification.
- [ ] Run npm test, npm pack --dry-run, and an end-to-end fixture build.
- [ ] Commit and publish to the renamed GitHub repository if authenticated access permits.

Acceptance: supported accents disappear from generated CSS; retained borders and other declarations stay intact; dry-run leaves source unchanged; repeat transformation is idempotent. No screenshot input is required for the main workflow.
