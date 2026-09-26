import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/src/styles.css', ['src/styles.css', 'text/css; charset=utf-8']],
  ['/src/main.mjs', ['src/main.mjs', 'text/javascript; charset=utf-8']],
  ['/src/geocoding.mjs', ['src/geocoding.mjs', 'text/javascript; charset=utf-8']],
]);

const port = Number(process.env.PORT ?? 4173);
const host = '127.0.0.1';

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, `http://${host}`).pathname;
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Invalid request target');
    return;
  }
  const file = files.get(pathname);
  if (!file || request.method !== 'GET') {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  try {
    const body = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Unable to serve file');
  }
});
server.listen(port, host, () => {
  console.log(`WeatherPocket is available at http://localhost:${server.address().port}`);
});
