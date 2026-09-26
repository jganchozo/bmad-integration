import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { connect } from 'node:net';
import test from 'node:test';

const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));

function startServer() {
  const child = spawn(process.execPath, [serverPath], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ready = new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Server did not start')), 5000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/http:\/\/localhost:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`Server exited with ${code}`)));
  });
  return { child, ready };
}

function sendRawRequest(port, request) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1');
    let data = '';
    socket.setEncoding('utf8');
    socket.on('connect', () => socket.end(request));
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
  });
}

test('server serves the page and its assets, rejects a malformed target, and keeps running', async () => {
  const { child, ready } = startServer();
  try {
    const port = await ready;
    const base = `http://127.0.0.1:${port}`;
    const page = await fetch(base);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /href="\/src\/styles\.css"/);
    assert.match(html, /src="\/src\/main\.mjs"/);
    assert.match(html, /add its region or country/);
    for (const asset of ['/src/styles.css', '/src/main.mjs', '/src/geocoding.mjs']) {
      const response = await fetch(base + asset);
      assert.equal(response.status, 200, asset);
      assert.ok((await response.text()).length > 0, asset);
    }
    assert.equal((await fetch(base + '/tests/geocoding.test.mjs')).status, 404);

    const malformed = await sendRawRequest(port, 'GET //[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
    assert.match(malformed, /^HTTP\/1\.1 400/);
    assert.equal((await fetch(base)).status, 200);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  }
});
