# Make Your UI Look Less Vibe-Coded

Remove decorative vertical accent bars and replace UI emoji with theme-aware SVG icons during your production build.

The CSS workflow is a **PostCSS plugin and Node CLI**. It transforms generated CSS before deployment, with no screenshots or browser runtime required. Detection is based on CSS structure rather than a specific accent colour. A separate **HTML/JSX/TSX transform and CLI** replaces supported UI emoji with inline vector icons.

## Replace emoji with vector icons

```sh
node js/emoji-cli.js input.html -o output.html --report icons-report.json
node js/emoji-cli.js src/App.tsx --dry-run
node js/emoji-cli.js src/App.tsx --check
```

For JavaScript build scripts:

```js
import { transformEmoji } from 'make-your-ui-look-less-vibe-coded/emoji';

const { code, report } = transformEmoji(source, {
  format: 'tsx', // html, jsx or tsx
  strokeWidth: 1.5,
  className: 'project-icon',
});
```

Supported emoji in rendered text become accessible SVGs that inherit text colour and font size. Configure the stroke weight, CSS class and custom SVG path mappings to match your design system. Unknown emoji remain unchanged and are reported. The transform does not guess an arbitrary project's icon library or the meaning of ambiguous symbols.

Run it on HTML output or on JSX/TSX **before compilation**, and make your build consume the returned code. It does not modify projects automatically just because it is installed. See [emoji icon configuration, build example and limits](docs/emoji-icons.md).

## Install from source

Requires Node.js 20.19 or newer.

```sh
git clone https://github.com/shafiqhaniffa96-a11y/make-your-ui-look-less-vibe-coded.git
cd make-your-ui-look-less-vibe-coded
npm install
```

To add this local checkout to another app:

```sh
npm install --save-dev /path/to/make-your-ui-look-less-vibe-coded
```

This package is not yet published to the npm registry.

## Run during production builds

In your app's `postcss.config.mjs`:

```js
import lessVibe from 'make-your-ui-look-less-vibe-coded';

export default {
  plugins: [
    // Put CSS-generating plugins before lessVibe.
    ...(process.env.NODE_ENV === 'production' ? [lessVibe()] : []),
    // Put minifiers after lessVibe so directive comments survive.
  ],
};
```

Merge this into your existing configuration. Ensure the build sets `NODE_ENV=production`; otherwise this example deliberately does nothing. Use the CLI below if your framework does not use PostCSS.

## Standalone CLI

```sh
node js/cli.js input.css -o output.css --report report.json
node js/cli.js input.css --check
```

Use distinct input and output paths. Check mode reports candidates without rewriting the CSS and exits with code 1 when candidates exist. A normal application build should consume the cleaned output file.

## What it changes

Supported narrow, solid, one-sided vertical accent borders are neutralized. Empty, absolutely positioned `::before` / `::after` bars with a narrow width, tall height and solid background are also candidates.

Detection is conservative. It cannot infer the visual meaning of every border from CSS alone. Full outlines, ambiguous cascade combinations, interactive/status selectors and unsupported expressions are preserved. Review the report and your production preview before adopting the plugin across a large site.

A framework may generate width, style and colour in separate utility rules. Those combinations are not automatically resolved across the cascade. Inline styles, JavaScript-created styles, SVG lines and canvas graphics are outside this plugin's scope.

## Keep an intentional accent

Place a directive inside the rule:

```css
.brand-card {
  /* vibe-keep */
  border-left: 4px solid orange;
}
```

Place `/* vibe-remove */` immediately before a supported border declaration only when you have explicitly identified it as decorative. It enables supported removals in cases where the default selector guard would otherwise preserve the rule; it is not a general instruction to delete arbitrary CSS.

## Audit without rewriting

```js
import postcss from 'postcss';
import lessVibe from 'make-your-ui-look-less-vibe-coded';

const result = await postcss([lessVibe({ dryRun: true })])
  .process(css, { from: 'input.css' });
console.log(result.messages);
```

## Try a production example

Run `node examples/production/build.mjs` to generate `examples/production/output.css` from the included fixture and print its change report.

## Development

```sh
npm test
npm pack --dry-run
```

The original Python screenshot utility remains available as a legacy feature. See [legacy documentation](docs/legacy-screenshot-tool.md). It is not required by the production CSS workflow.

Plugin architecture follows the [official PostCSS plugin guide](https://github.com/postcss/postcss/blob/main/docs/writing-a-plugin.md).

## License

[MIT](LICENSE) © 2026 Ahnaf Thaqeef
