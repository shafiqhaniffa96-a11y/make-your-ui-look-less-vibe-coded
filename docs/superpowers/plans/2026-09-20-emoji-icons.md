# Build-time emoji icons implementation plan

Approved design: replace supported UI emoji with semantic SVG icons during build, inherit the project theme, allow custom mappings, and report ambiguous emoji. Preserve existing CSS cleaning.

**Goal:** Add a source transform and CLI for HTML, JSX and TSX UI emoji.

**Architecture:** Parse source with parse5 or Babel and edit only renderable text locations. Original SVG paths inherit currentColor and font size. Unknown emoji remain visible and are reported, rather than assigned misleading icons. No browser runtime, arbitrary JavaScript execution, or whole-project rewrite.

**Tech stack:** Node 20+, parse5, @babel/parser, node:test.

## Implementation

- [ ] Add `js/emoji.js`, `js/icons.js` and `test-js/emoji.test.js`: parser-based replacement, full grapheme detection, SVG accessibility, custom mappings, exclusions, dry run and idempotence.
- [ ] Add `js/emoji-cli.js` and `test-js/emoji-cli.test.js`: explicit input/output, format inference, JSON configuration and report, check mode, path-alias protection, actionable errors.
- [ ] Update `package.json` and lockfile: retain default PostCSS export and CSS bin, add `/emoji` export and `less-vibe-icons` bin.
- [ ] Add build example and README instructions covering supported placement, theme configuration and limitations.
- [ ] Run `npm test`, production examples, JSX/TSX reparse, and `npm pack --dry-run`. Inspect integrated diff, commit only intended files, push and verify remote HEAD.

## Acceptance

`<button>🔍 Search</button>` gains an inline search SVG with currentColor and an accessible label. HTML entities and JSX direct string expressions are supported. Code/script/style/textarea/SVG, attributes, and explicitly kept subtrees are not rewritten. Whole emoji sequences remain atomic. Unmapped emoji are reported. Check mode writes nothing and exits 1 for any reported emoji; clean input exits 0; invalid source/options exit 2. Repeated processing is stable. Dynamic runtime values cannot be resolved statically and this limitation is documented.
