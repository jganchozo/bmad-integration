# Open-Meteo data contract

- Resolve city names with the [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). Use each result's name, region, country, latitude, and longitude to let users identify a place and request its weather.
- Request `current=temperature_2m,weather_code,wind_speed_10m` for the selected coordinates from the [Weather Forecast API](https://open-meteo.com/en/docs). Convert the WMO `weather_code` to a readable condition. Open-Meteo describes these current conditions as model-based data.
- Show appropriate [Open-Meteo attribution](https://open-meteo.com/en/terms). The [free hosted API](https://open-meteo.com/en/pricing) is limited to noncommercial use and its published call limits; it needs no API key.
