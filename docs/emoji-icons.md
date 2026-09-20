# Emoji to theme-aware SVG

`less-vibe-icons` is a build-time source transform, separate from the CSS accent cleaner. No image generation, icon CDN or browser runtime is used. Built-in icons are original SVG line drawings distributed under this repository's MIT license.

## CLI

```sh
node js/emoji-cli.js page.html -o cleaned.html --report icons-report.json
node js/emoji-cli.js App.tsx -o App.cleaned.tsx --config icons.json
node js/emoji-cli.js App.jsx --dry-run
node js/emoji-cli.js App.jsx --check
```

After installing the package in a project, the same executable is available as `less-vibe-icons`. Format is inferred from `.html`, `.htm`, `.jsx` or `.tsx`; use `--format` to specify one explicitly. Omitting `-o` writes transformed source to stdout. Input, output, configuration and report paths must be different.

`--dry-run` prints JSON without writing any files; its `replaced` entries describe planned replacements. `--check` also writes no files and exits 1 when emoji are reported, including unmapped and skipped emoji, or 0 when none are found. Both modes ignore output/report destinations. Invalid source, options or configuration exit 2. Normal transform mode preserves unresolved emoji, reports them and prints a warning; it does not silently delete their meaning.

Reports distinguish actual output changes (`changed`) from planned replacements (`wouldChange`); `dryRun` identifies analysis-only output. A dry run has `changed: false` even when `wouldChange: true`.

## Follow the project theme

Generated icons use `currentColor`, a `1em` width and height, and configurable stroke weight. They inherit light/dark theme colours from surrounding text. For a project that already uses its own icon style, provide paths from that icon set (and respect its license).

Example `icons.json`:

```json
{
  "className": "project-icon",
  "strokeWidth": 1.5,
  "icons": {
    "🔍": {
      "name": "search",
      "label": "Search",
      "paths": ["M10 3a7 7 0 1 0 0 14a7 7 0 0 0 0-14 M15 15l6 6"]
    }
  }
}
```

Use SVG path data in a 24 by 24 viewBox. Raw SVG markup, scripts and arbitrary attributes are not accepted. Custom mappings override the matching built-in emoji or add a new one. Labels supply accessible names; translate them in your config for the UI language. Icons have `role="img"`, an accessible label and `focusable="false"`.

Optional project CSS:

```css
.project-icon {
  vertical-align: -0.125em;
  flex-shrink: 0;
}
```

This is theme inheritance plus explicit configuration, not automatic visual analysis of every design system. Filled icons, gradients and multicolour brand artwork need a separate integration.

## Build integration

```js
import { readFile, writeFile } from 'node:fs/promises';
import { transformEmoji } from 'make-your-ui-look-less-vibe-coded/emoji';

const source = await readFile('dist/index.html', 'utf8');
const result = transformEmoji(source, { format: 'html' });
await writeFile('dist/index.html', result.code);
await writeFile('icons-report.json', JSON.stringify(result.report, null, 2));
```

Run this after the HTML build and before deployment. For hydrated React applications, transform JSX/TSX before bundling so the server and client compile the same markup; rewriting only server HTML can cause hydration mismatches. The API returns source without a source map, so integrate before source-map generation.

The repository example `node examples/production/icons-build.mjs` writes a preview and report to the ignored `build/emoji-example` directory. It combines theme-aware icons with the existing CSS cleaner.

## Coverage and intentional exclusions

- HTML text nodes, including encoded emoji entities; JSX text and directly rendered literal string expressions.
- Emoji sequences are processed as whole graphemes. A family, skin-tone variant, flag or keycap without an exact mapping stays unchanged and is reported rather than partially replaced.
- `data-vibe-keep` on an element protects its subtree.
- Code, preformatted content, scripts, styles, textareas and existing SVG are preserved. Text-only contexts such as `title` and `option` are also preserved because an SVG is not a suitable replacement there. Attributes are not converted into markup: an emoji in `title`, `aria-label`, a URL or other attribute is reported for manual review.
- Dynamic JavaScript values, localization catalogs, data fetched at runtime, CSS-generated `content`, images of emoji, canvas and native UI are outside this source transform. Static detection cannot promise that all runtime output is emoji-free.
- Arbitrary string replacement could corrupt URLs, application data and code. Use `--check` and resolve the reported cases, supply explicit mappings, and review the production preview.

The existing PostCSS export and `less-vibe-css` command retain their CSS-only behaviour.
