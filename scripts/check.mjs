import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
let count = 0;
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['.git', 'dist', 'node_modules'].includes(entry.name)) continue;
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) { await check(file); continue; }
    if (!/\.(html|css|js|mjs|json|md|svg|txt)$/.test(entry.name)) continue;
    const content = await readFile(file, 'utf8');
    if (content.includes(String.fromCharCode(0x2014))) throw new Error(`Caractere proibido: ${file.pathname}`);
    if (/\.(mjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', fileURLToPath(file)], { encoding: 'utf8' });
      if (result.status !== 0) throw new Error(result.stderr);
    }
    count++;
  }
}
await check(root);
console.log(`${count} arquivos verificados.`);
