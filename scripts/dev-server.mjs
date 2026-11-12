import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd());
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const port = Number(process.env.PORT) || 4173;

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!(filename === root || filename.startsWith(root + sep))) {
      response.writeHead(403).end('Forbidden'); return;
    }
    if (!['.html', '.js', '.css', '.svg', '.json'].includes(extname(filename))) {
      response.writeHead(404).end('Not found'); return;
    }
    if (!(await stat(filename)).isFile()) { response.writeHead(404).end('Not found'); return; }
    const data = await readFile(filename);
    response.writeHead(200, { 'content-type': types[extname(filename)], 'cache-control': 'no-store' });
    response.end(data);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log('MarketplaceOps running at http://localhost:' + port));
