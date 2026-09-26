# WeatherPocket

A static city search for choosing a location. Story 1 includes only city lookup and selection. Story 2 will use the selected place's coordinates to show current weather; this app does not request or display weather yet.

## Run locally

Requires Node.js. Run these commands from the repository root. No packages need to be installed.

```sh
node weatherpocket/server.mjs
```

Open <http://localhost:4173>. The browser calls Open-Meteo's geocoding API directly, so city search needs an internet connection.

## Test

From the repository root:

```sh
node --test weatherpocket/tests/geocoding.test.mjs weatherpocket/tests/main.test.mjs weatherpocket/tests/server.test.mjs
```

The chosen place is held only in page memory, including name, region, country, latitude, and longitude. It is available to later page modules through `getSelectedPlace()` from `src/main.mjs`.
