---
id: SPEC-weather-app
companions:
  - open-meteo.md
sources: []
---

> **Canonical contract.** This spec and its companion define what to build and verify.

# WeatherPocket

## Why

Give people a quick everyday check of the current weather in a chosen city.

## Capabilities

- **CAP-1**
  - **intent:** A user can search for a city and choose the intended location.
  - **success:** A matching search shows a list of places labeled with region and country so the user can choose the correct location; a search with no matches shows a clear message.
- **CAP-2**
  - **intent:** A user can see the chosen city's current temperature, weather condition, and wind speed.
  - **success:** The app shows temperature in °C, a readable condition, and wind speed in km/h for the selected city; unavailable weather data produces a clear message without invented values.

## Constraints

- Use Open-Meteo for city lookup and current weather data as described in [open-meteo.md](open-meteo.md).
- Use only APIs that require no payment. The Open-Meteo free hosted API requires noncommercial use and data attribution.
- No user authentication.
- Deliver v1 as a responsive web app for phone and desktop.
- Display temperature in °C and wind speed in km/h.

## Non-goals

- Multi-day forecasts in v1.
- Saved cities, alerts, maps, and device location in v1.

## Success signal

On both phone and desktop, a user can search for a city, choose the correct match by region and country, and see its current temperature in °C, readable weather condition, and wind speed in km/h. A search with no matches or unavailable weather data shows a clear message without invented values.
