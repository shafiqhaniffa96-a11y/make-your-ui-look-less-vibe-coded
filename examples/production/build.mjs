import postcss from 'postcss';
import lessVibe from '../../js/index.js';
import { readFile, writeFile } from 'node:fs/promises';
const input = new URL('./input.css', import.meta.url);
const output = new URL('./output.css', import.meta.url);
const result = await postcss([lessVibe()]).process(await readFile(input, 'utf8'), { from: input.pathname, to: output.pathname });
await writeFile(output, result.css);
console.log(JSON.stringify(result.messages, null, 2));
