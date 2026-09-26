import { InvalidCityQueryError, searchCities } from './geocoding.mjs';

const form = document.querySelector('#city-search');
const input = document.querySelector('#city-name');
const status = document.querySelector('#search-status');
const resultsSection = document.querySelector('#results-section');
const results = document.querySelector('#results');
const selectedSection = document.querySelector('#selected-section');
const selectedText = document.querySelector('#selected-place');

let latestSearch = 0;
let activeRequest = null;
let selectedPlace = null;

export function getSelectedPlace() {
  return selectedPlace;
}

function placeLabel(place) {
  return `${place.name}, ${place.region}, ${place.country}`;
}

function clearResults() {
  results.replaceChildren();
  resultsSection.hidden = true;
}

function showResults(places) {
  clearResults();
  for (const place of places) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = placeLabel(place);
    button.addEventListener('click', () => {
      selectedPlace = place;
      selectedText.textContent = placeLabel(place);
      selectedSection.hidden = false;
      status.textContent = `Selected ${placeLabel(place)}.`;
    });
    item.append(button);
    results.append(item);
  }
  resultsSection.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const searchId = ++latestSearch;
  activeRequest?.abort();
  activeRequest = null;
  clearResults();

  const query = input.value.trim();
  if ([...query].length < 2) {
    status.textContent = new InvalidCityQueryError().message;
    return;
  }

  const controller = new AbortController();
  activeRequest = controller;
  status.textContent = `Searching for “${query}”…`;
  try {
    const places = await searchCities(query, { signal: controller.signal });
    if (searchId !== latestSearch) return;
    if (places.length === 0) {
      status.textContent = `No matching places found for “${query}”. Try another city name.`;
    } else {
      showResults(places);
      status.textContent = `${places.length} matching ${places.length === 1 ? 'place' : 'places'} found for “${query}”. Choose a place below.${places.length === 10 ? ' Add a region or country to narrow your search.' : ''}`;
    }
  } catch (error) {
    if (searchId !== latestSearch || error?.name === 'AbortError') return;
    status.textContent = 'City search is unavailable. Please try again.';
  } finally {
    if (searchId === latestSearch) activeRequest = null;
  }
});
