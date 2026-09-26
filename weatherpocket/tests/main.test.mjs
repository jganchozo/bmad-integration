import assert from 'node:assert/strict';
import test from 'node:test';

class FakeElement {
  constructor() {
    this.children = [];
    this.listeners = new Map();
    this.hidden = false;
    this.textContent = '';
    this.value = '';
  }

  addEventListener(type, callback) { this.listeners.set(type, callback); }
  append(child) { this.children.push(child); }
  replaceChildren() { this.children = []; }
  dispatch(type) { return this.listeners.get(type)({ preventDefault() {} }); }
}

async function harness(fetchImpl) {
  const elements = new Map();
  for (const id of [
    '#city-search', '#city-name', '#search-status', '#results-section',
    '#results', '#selected-section', '#selected-place',
  ]) elements.set(id, new FakeElement());
  elements.get('#results-section').hidden = true;
  elements.get('#selected-section').hidden = true;
  globalThis.document = {
    querySelector: (selector) => elements.get(selector),
    createElement: () => new FakeElement(),
  };
  globalThis.fetch = fetchImpl;
  const main = await import(`../src/main.mjs?test=${Math.random()}`);
  const el = (id) => elements.get(id);
  const submit = (query) => {
    el('#city-name').value = query;
    return el('#city-search').dispatch('submit');
  };
  const choose = (index) => el('#results').children[index].children[0].dispatch('click');
  return { el, main, submit, choose };
}

const places = [
  { name: 'Springfield', admin1: 'Illinois', country: 'United States', latitude: 39.8, longitude: -89.6 },
  { name: 'Springfield', admin1: 'Massachusetts', country: 'United States', latitude: 42.1, longitude: -72.6 },
];

function response(payload) {
  return { ok: true, json: async () => payload };
}

test('user explicitly chooses a labeled match and short query keeps the selection', async () => {
  let calls = 0;
  const app = await harness(async () => { calls++; return response({ results: places }); });
  assert.equal(app.el('#results-section').hidden, true);
  assert.equal(app.el('#selected-section').hidden, true);
  await app.submit('Springfield');
  assert.equal(app.main.getSelectedPlace(), null);
  assert.equal(app.el('#results').children.length, 2);
  assert.equal(app.el('#results-section').hidden, false);
  assert.equal(app.el('#selected-section').hidden, true);
  app.choose(1);
  assert.deepEqual(app.main.getSelectedPlace(), {
    name: 'Springfield', region: 'Massachusetts', country: 'United States', latitude: 42.1, longitude: -72.6,
  });
  assert.equal(app.el('#selected-place').textContent, 'Springfield, Massachusetts, United States');
  assert.equal(app.el('#selected-section').hidden, false);
  await app.submit('S');
  assert.match(app.el('#search-status').textContent, /at least two characters/);
  assert.equal(app.el('#results').children.length, 0);
  assert.equal(app.el('#results-section').hidden, true);
  assert.equal(app.el('#selected-section').hidden, false);
  assert.equal(app.main.getSelectedPlace().region, 'Massachusetts');
  assert.equal(calls, 1);
});

test('no matches and unavailable search clear old results but retain the chosen place', async () => {
  let calls = 0;
  const app = await harness(async () => {
    calls++;
    if (calls === 1) return response({ results: places });
    if (calls === 2) return response({});
    throw new Error('offline');
  });
  await app.submit('Springfield');
  app.choose(0);
  await app.submit('NoSuchCity');
  assert.match(app.el('#search-status').textContent, /No matching places/);
  assert.equal(app.el('#results').children.length, 0);
  assert.equal(app.el('#results-section').hidden, true);
  assert.equal(app.main.getSelectedPlace().region, 'Illinois');
  await app.submit('Paris');
  assert.match(app.el('#search-status').textContent, /unavailable/);
  assert.equal(app.el('#results').children.length, 0);
  assert.equal(app.el('#results-section').hidden, true);
  assert.equal(app.el('#selected-section').hidden, false);
  assert.equal(app.main.getSelectedPlace().region, 'Illinois');
});

test('older response arriving last cannot replace newer results', async () => {
  const pending = [];
  const app = await harness(() => new Promise((resolve) => pending.push(resolve)));
  const older = app.submit('Springfield');
  const newer = app.submit('Paris');
  pending[1](response({ results: [{ name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35 }] }));
  await newer;
  pending[0](response({ results: places }));
  await older;
  assert.equal(app.el('#results').children.length, 1);
  assert.equal(app.el('#results').children[0].children[0].textContent, 'Paris, Region unavailable, France');
  assert.match(app.el('#search-status').textContent, /1 matching place found/);
  assert.match(app.el('#search-status').textContent, /“Paris”/);
});

test('results status identifies the submitted query after the input changes', async () => {
  let resolveFetch;
  const app = await harness(() => new Promise((resolve) => { resolveFetch = resolve; }));
  const search = app.submit('Springfield');
  app.el('#city-name').value = 'Paris';
  resolveFetch(response({ results: places }));
  await search;
  assert.match(app.el('#search-status').textContent, /“Springfield”/);
  assert.doesNotMatch(app.el('#search-status').textContent, /Paris/);
});

test('ten results prompt the user to narrow by region or country', async () => {
  const app = await harness(async () => response({ results: Array(10).fill(places[0]) }));
  await app.submit('Springfield');
  assert.equal(app.el('#results').children.length, 10);
  assert.match(app.el('#search-status').textContent, /Add a region or country/);
});

test('a single non-BMP character does not start a search', async () => {
  let calls = 0;
  const app = await harness(async () => { calls++; return response({}); });
  await app.submit('😀');
  assert.equal(calls, 0);
  assert.match(app.el('#search-status').textContent, /at least two characters/);
});

test('a stalled search shows unavailable instead of searching forever', async () => {
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (callback, delay) => realSetTimeout(callback, Math.min(delay, 5));
  try {
    const app = await harness(() => new Promise(() => {}));
    await app.submit('Paris');
    assert.match(app.el('#search-status').textContent, /unavailable/);
    assert.equal(app.el('#results-section').hidden, true);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});
