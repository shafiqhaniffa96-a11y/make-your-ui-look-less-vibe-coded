# Production CSS Cleaner — Approved Design

The user approved replacing the primary screenshot workflow with a build-time PostCSS cleaner on 2026-09-20.

The npm entry point is a PostCSS plugin. A CLI enables build pipelines without a PostCSS configuration. The plugin runs on generated CSS before minification and is enabled for production in the documented integration. No runtime browser script is shipped.

Conservative candidates: literal thin solid left/right borders and explicitly empty narrow/tall absolutely positioned pseudo-elements with solid backgrounds. Preserve ambiguous or functional-looking rules by default. Provide vibe-keep and explicit vibe-remove directives. A dry-run returns change diagnostics without editing CSS.

The CLI reads input and emits distinct output plus an optional JSON report. Check mode does not write files. Input and report/output collisions must be rejected. CSS parsing errors must fail the build.

The old Python image utility remains available under legacy documentation, with no Python dependency for the new main workflow. MIT licensing remains unchanged. Update README and repository references to the new GitHub name.

Verification: candidate transformations, colours, keep/override directives, repeated declarations, nested CSS, cascade preservation, idempotence, invalid input and CLI path protections; package inspection and executable production fixture.
