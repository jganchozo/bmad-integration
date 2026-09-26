const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
export const REGION_FALLBACK = 'Region unavailable';

export class InvalidCityQueryError extends Error {
  constructor() {
    super('Enter at least two characters to search.');
    this.name = 'InvalidCityQueryError';
  }
}

export class GeocodingError extends Error {
  constructor() {
    super('City search is unavailable. Please try again.');
    this.name = 'GeocodingError';
  }
}

function requiredText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePlace(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new GeocodingError();

  const name = requiredText(result.name);
  const country = requiredText(result.country);
  const latitude = result.latitude;
  const longitude = result.longitude;
  if (!name || !country || typeof latitude !== 'number' || !Number.isFinite(latitude)
    || typeof longitude !== 'number' || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new GeocodingError();
  }

  return {
    name,
    region: requiredText(result.admin1) ?? REGION_FALLBACK,
    country,
    latitude,
    longitude,
  };
}

export async function searchCities(query, { fetchImpl = globalThis.fetch, signal, timeoutMs = 10000 } = {}) {
  const city = typeof query === 'string' ? query.trim() : '';
  if ([...city].length < 2) throw new InvalidCityQueryError();

  const url = new URL(GEOCODING_URL);
  url.searchParams.set('name', city);
  url.searchParams.set('count', '10');
  url.searchParams.set('format', 'json');

  const controller = new AbortController();
  let timeout;
  let onAbort;
  const interrupted = new Promise((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once: true });
    timeout = setTimeout(() => {
      controller.abort();
      reject(new GeocodingError());
    }, timeoutMs);
  });

  try {
    const lookup = (async () => {
      const response = await fetchImpl(url.toString(), { signal: controller.signal });
      if (!response.ok) throw new GeocodingError();
      const payload = await response.json();
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.error === true) {
        throw new GeocodingError();
      }
      if (!Object.hasOwn(payload, 'results')) return [];
      if (!Array.isArray(payload.results)) throw new GeocodingError();
      return payload.results.map(normalizePlace);
    })();
    return await Promise.race([lookup, interrupted]);
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (error instanceof GeocodingError) throw error;
    throw new GeocodingError();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onAbort);
  }
}
