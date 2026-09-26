---
title: 'Search and choose a city'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c85f30c6c188976c5166587e667122d808543630'
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
- [x] `weatherpocket/index.html` — add semantic search form, results list, status and selected-place regions, and visible source credit.
- [x] `weatherpocket/src/geocoding.mjs` — query Open-Meteo's geocoding endpoint with an encoded city name; validate and normalize matches, including optional region data and failure cases.
- [x] `weatherpocket/src/main.mjs` — wire submit, loading, results, selection, and messages; keep only the latest search response and selected place in memory for Story 2.
- [x] `weatherpocket/src/styles.css` — make the search and results usable at phone and desktop widths, with visible keyboard focus.
- [x] `weatherpocket/server.mjs` — serve the static files on localhost for development using Node's built-in modules; add no app backend or API proxy.
- [x] `weatherpocket/tests/geocoding.test.mjs` — use Node's built-in test runner and a stubbed fetch to cover query validation, multiple matches, missing region, no results, and API failure.
- [x] `weatherpocket/README.md` — document local serving, testing, and the Story 1/Story 2 boundary.

**Acceptance Criteria:**
- Given multiple places matching a search, when the user chooses one, then the page confirms that city, region, and country and keeps its coordinates available in memory for Story 2.
- Given a phone or desktop viewport, when the user searches and chooses a place, then the form and result controls remain readable and keyboard operable.
- Given two searches in quick succession, when the older response arrives last, then it does not replace the newer results.
- Given the Story 1 page, when it loads, then Open-Meteo attribution is visible and no weather values or out-of-scope features appear.

## Implementation Notes

- Built a dependency-free static page; `server.mjs` serves an allowlist of files on localhost only. The browser calls Open-Meteo directly.
- `getSelectedPlace()` exposes the selected name, region, country, latitude, and longitude from in-memory page state for Story 2.
- Added `weatherpocket/tests/main.test.mjs` for selection, no-match, failure, and stale-response UI behavior. All 13 geocoding and UI tests passed; syntax checks and `git diff --check` passed.
- In a local browser, live searches returned labeled Springfield and Paris matches; explicit and keyboard selection worked, and a no-match query cleared results. Tested 1280 px and 390 px viewports with no horizontal overflow.
- Review fixes now reject Open-Meteo error payloads, count Unicode characters correctly, time out and cancel searches, guide refinement of crowded results, and keep malformed HTTP request targets from stopping the local server. Final geocoding, UI, and server tests passed (21/21); the patched app also returned live Springfield matches and confirmed an explicit selection in the browser. No review issue remains deferred beyond the documented BH6 triage decision.

## Spec Change Log

## Review Triage Log

- BH1 — **medium, patch:** `geocoding.mjs` treats a successful `{error: true}` response without `results` as no matches. Reject the API error flag while retaining `{}` as the documented no-match shape.
- BH2 — **low, patch:** `count=10` can truncate ambiguous names; Open-Meteo accepts a region or country qualifier, but the UI gives no narrowing guidance. Explain how to refine a search when the list is capped.
- BH3 — **low, patch:** JavaScript string length admits one non-BMP character as two code units in both search guards. Count Unicode code points consistently so one character makes no request.
- BH4 — **low, patch:** Editing the input before an earlier search settles can make results appear under different text. Label the results status with the submitted query.
- BH5 — **medium, patch:** A request that never settles leaves the search status pending indefinitely. Add a bounded request timeout that becomes a search-unavailable message.
- BH6 — **low, rejected:** The selected confirmation can be below a long list, but browser checks at a compact 390 × 600 viewport kept the chosen text visible after selecting a later result, while the status was visible for early results. Extra focus or scroll state is disproportionate for a shorter landscape viewport where normal scrolling remains available.
- BH7 — **low, patch:** README commands work from the repository root but do not state that working-directory requirement. Add it explicitly.
- VG1 — **medium, patch:** UI tests initialize sections as visible and never assert the transitions from hidden results and selection sections. Start them hidden and assert each becomes visible after its trigger.
- VG2 — **medium, patch:** Direct module imports in tests do not verify the server's page and module route map; a broken module path would prevent app startup. Add a local server smoke test for the page and referenced modules.
- EH1 — **low, patch:** The one-character Unicode query reaches the API through the same code-unit guards as BH3. Use the BH3 fix.
- EH2 — **medium, patch:** A hung fetch remains pending through the same missing timeout as BH5. Use the BH5 fix.
- EH3 — **low, patch:** Later city matches are undiscoverable through the unannounced ten-result cap in BH2. Use the BH2 refinement guidance.
- EH4 — **low, patch:** A raw `GET //[ HTTP/1.1` request was accepted by Node's HTTP parser and crashed the local server at `new URL(request.url, ...)`. Catch URL parse failure and return a client error without stopping the server.
- EH5 — **medium, patch:** Open-Meteo's `{error: true}` payload is misreported as no matches through the same missing check as BH1. Use the BH1 fix.

## Design Notes

Use a submit-driven search to avoid unnecessary API calls. Keep selection as an in-memory place record rather than storing it or fetching weather; Story 2 can consume that record directly. Render API-provided names as text, not HTML. Node is available locally; the Python launcher has no interpreter, so a small Node server gives this static app a dependency-free local serving command.

## Verification

**Commands:**
- `node --test weatherpocket/tests/geocoding.test.mjs weatherpocket/tests/main.test.mjs weatherpocket/tests/server.test.mjs` — expected: all geocoding, UI, and server behavior tests pass.
- `node weatherpocket/server.mjs` — expected: the static app is available at `http://localhost:4173` for manual browser checks.

**Manual checks:**
- Search an ambiguous city, choose a labeled result, and confirm the chosen place on phone and desktop widths.
- Search a nonexistent city and simulate an unavailable API; confirm clear messages and no stale result list.
