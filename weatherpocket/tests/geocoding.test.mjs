import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GeocodingError,
  InvalidCityQueryError,
  REGION_FALLBACK,
  searchCities,
} from '../src/geocoding.mjs';

const springfields = [
  { name: 'Springfield', admin1: 'Illinois', country: 'United States', latitude: 39.8017, longitude: -89.6437 },
  { name: 'Springfield', admin1: 'Massachusetts', country: 'United States', latitude: 42.1015, longitude: -72.5898 },
];

function ok(results) {
  return { ok: true, json: async () => results };
}

test('empty and one-character queries make no API request', async () => {
  let calls = 0;
  const fetchImpl = () => { calls++; throw new Error('Should not fetch'); };
  await assert.rejects(searchCities('', { fetchImpl }), InvalidCityQueryError);
  await assert.rejects(searchCities(' A ', { fetchImpl }), InvalidCityQueryError);
  await assert.rejects(searchCities('😀', { fetchImpl }), InvalidCityQueryError);
  assert.equal(calls, 0);
});

test('multiple places retain distinct region, country, and coordinates', async () => {
  let requested;
  const matches = await searchCities('  New York  ', {
    fetchImpl: async (url) => {
      requested = new URL(url);
      return ok({ results: springfields });
    },
  });
  assert.equal(requested.origin, 'https://geocoding-api.open-meteo.com');
  assert.equal(requested.searchParams.get('name'), 'New York');
  assert.equal(requested.searchParams.get('count'), '10');
  assert.deepEqual(matches, [
    { name: 'Springfield', region: 'Illinois', country: 'United States', latitude: 39.8017, longitude: -89.6437 },
    { name: 'Springfield', region: 'Massachusetts', country: 'United States', latitude: 42.1015, longitude: -72.5898 },
  ]);
});

test('missing region gets an explicit fallback', async () => {
  const [match] = await searchCities('Paris', {
    fetchImpl: async () => ok({ results: [{ name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35 }] }),
  });
  assert.equal(match.region, REGION_FALLBACK);
});

test('no matches return an empty list', async () => {
  const matches = await searchCities('nowhere', { fetchImpl: async () => ok({}) });
  assert.deepEqual(matches, []);
});

test('API error flag is not treated as no matches', async () => {
  await assert.rejects(
    searchCities('Paris', { fetchImpl: async () => ok({ error: true, reason: 'Invalid parameter' }) }),
    GeocodingError,
  );
});

test('a stalled request times out and aborts its fetch', async () => {
  let fetchSignal;
  await assert.rejects(searchCities('Paris', {
    fetchImpl: (_, { signal }) => {
      fetchSignal = signal;
      return new Promise(() => {});
    },
    timeoutMs: 5,
  }), GeocodingError);
  assert.equal(fetchSignal.aborted, true);
});

test('superseded search cancellation aborts its fetch', async () => {
  const controller = new AbortController();
  let fetchSignal;
  const search = searchCities('Paris', {
    fetchImpl: (_, { signal }) => {
      fetchSignal = signal;
      return new Promise(() => {});
    },
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(search, { name: 'AbortError' });
  assert.equal(fetchSignal.aborted, true);
});

test('network, non-OK, and malformed API responses fail clearly', async (t) => {
  const cases = [
    async () => { throw new Error('offline'); },
    async () => ({ ok: false }),
    async () => ok(null),
    async () => ok({ results: 'bad' }),
    async () => ok({ results: [{ name: 'Invalid', country: 'Nowhere', latitude: '0', longitude: 0 }] }),
  ];
  for (const [index, fetchImpl] of cases.entries()) {
    await t.test(`failure ${index + 1}`, async () => {
      await assert.rejects(searchCities('Paris', { fetchImpl }), GeocodingError);
    });
  }
});
