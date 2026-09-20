import { mkdir, writeFile } from 'node:fs/promises';
import postcss from 'postcss';
import lessVibe from '../../js/index.js';
import { transformEmoji } from '../../js/emoji.js';

const styles = await postcss([lessVibe()]).process(`
body { font: 18px system-ui; background: #14232b; color: #e8f4f2; padding: 3rem; }
.card { border-left: 4px solid orange; background: #243940; padding: 2rem; border-radius: 12px; }
button { font: inherit; color: #14232b; background: #9ce5cd; padding: .6em 1em; border: 0; border-radius: 6px; }
.project-icon { vertical-align: -.125em; }
`, { from: undefined });
const source = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Emoji icon build example</title>
<style>${styles.css}</style><main class="card"><h1>⭐ Project dashboard</h1>
<p>✅ Ready for production</p><button>🔍 Search</button>
<p data-vibe-keep>Intentional original: ⭐</p><p>Unmapped: 🦄</p></main></html>`;
const result = transformEmoji(source, { format: 'html', strokeWidth: 1.5, className: 'project-icon' });
const destination = new URL('../../build/emoji-example/', import.meta.url);
await mkdir(destination, { recursive: true });
await writeFile(new URL('index.html', destination), result.code);
await writeFile(new URL('report.json', destination), JSON.stringify(result.report, null, 2));
console.log(`Built ${destination.pathname} (${result.report.length} emoji reported)`);
