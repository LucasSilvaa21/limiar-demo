import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    const local = relative(root, file);
    if (local.startsWith('..') || isAbsolute(local) || local.split(/[\\/]/).some(part => part.startsWith('.'))) {
      response.writeHead(403).end('Acesso negado.');
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end('Arquivo não encontrado.');
  }
});
server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => {
  console.log(`LIMIAR: http://127.0.0.1:${server.address().port}`);
});
