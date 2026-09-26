---
title: 'Search and choose a city'
type: 'feature'
created: '2026-09-25'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** WeatherPocket needs a reliable way for someone to identify the city whose current weather they want to check. Places can share a name, and the repository has no application UI yet.

**Approach:** Provide a small static browser app with a responsive city search that lists matching places with region and country, lets the user choose one, and confirms the selected place. Current weather display belongs to Story 2.

## Boundaries & Constraints

**Always:** Use Open-Meteo's free geocoding API for location data; keep the app static and usable on phone and desktop without authentication, paid services, or runtime packages. Preserve the selected place's name, region, country, latitude, and longitude in page state for Story 2, and credit Open-Meteo visibly.

**Never:** Add weather values, multi-day forecasts, saved cities, alerts, maps, device location, or account features in this story. Do not treat the first geocoding match as the user's selection.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Short query | Empty or one-character city name | Ask for at least two characters; make no API request | Keep prior selection unchanged |
| Matching places | Valid city name | Show a selectable list with city, region, and country | Use an explicit region fallback if Open-Meteo omits it |
| No matches | Valid query with no results | Show a clear no-match message and clear old results | Keep prior selection unchanged |
| Search failure | Network failure, non-OK response, or malformed payload | Show a clear search-unavailable message | Do not show stale results as a new response |

</frozen-after-approval>

## Code Map

- `_bmad-output/specs/spec-weather-app/SPEC.md` — CAP-1 acceptance and v1 constraints; retain as the product contract.
- `_bmad-output/specs/spec-weather-app/open-meteo.md` — geocoding endpoint, returned fields, and attribution; retain as the data contract.
- `_bmad-output/specs/spec-weather-app/stories.yaml` — Story 1 scope and both user-selected checkpoints; do not edit during implementation.
- `weatherpocket/` — no existing app files; create a small static browser app here. No project framework or code is available to reuse.

## Tasks & Acceptance

**Execution:**
- [ ] `weatherpocket/index.html` — add semantic search form, results list, status and selected-place regions, and visible source credit.
- [ ] `weatherpocket/src/geocoding.mjs` — query Open-Meteo's geocoding endpoint with an encoded city name; validate and normalize matches, including optional region data and failure cases.
- [ ] `weatherpocket/src/main.mjs` — wire submit, loading, results, selection, and messages; keep only the latest search response and selected place in memory for Story 2.
- [ ] `weatherpocket/src/styles.css` — make the search and results usable at phone and desktop widths, with visible keyboard focus.
- [ ] `weatherpocket/server.mjs` — serve the static files on localhost for development using Node's built-in modules; add no app backend or API proxy.
- [ ] `weatherpocket/tests/geocoding.test.mjs` — use Node's built-in test runner and a stubbed fetch to cover query validation, multiple matches, missing region, no results, and API failure.
- [ ] `weatherpocket/README.md` — document local serving, testing, and the Story 1/Story 2 boundary.

**Acceptance Criteria:**
- Given multiple places matching a search, when the user chooses one, then the page confirms that city, region, and country and keeps its coordinates available in memory for Story 2.
- Given a phone or desktop viewport, when the user searches and chooses a place, then the form and result controls remain readable and keyboard operable.
- Given two searches in quick succession, when the older response arrives last, then it does not replace the newer results.
- Given the Story 1 page, when it loads, then Open-Meteo attribution is visible and no weather values or out-of-scope features appear.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Use a submit-driven search to avoid unnecessary API calls. Keep selection as an in-memory place record rather than storing it or fetching weather; Story 2 can consume that record directly. Render API-provided names as text, not HTML. Node is available locally; the Python launcher has no interpreter, so a small Node server gives this static app a dependency-free local serving command.

## Verification

**Commands:**
- `node --test weatherpocket/tests/geocoding.test.mjs` — expected: all geocoding behavior tests pass.
- `node weatherpocket/server.mjs` — expected: the static app is available at `http://localhost:4173` for manual browser checks.

**Manual checks:**
- Search an ambiguous city, choose a labeled result, and confirm the chosen place on phone and desktop widths.
- Search a nonexistent city and simulate an unavailable API; confirm clear messages and no stale result list.
