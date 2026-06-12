# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 語言

請一律使用**繁體中文**回覆。

## Running the App

This is a static web app with no build step. Serve it with any local HTTP server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in a browser. Opening `index.html` directly as a `file://` URL may cause issues with external tile requests.

## Architecture

The app is three plain ES6 classes loaded via `<script>` tags in order — no bundler, no modules:

1. **`js/data.js`** — declares the global `tokyoMetroData` GeoJSON FeatureCollection. Each feature has `properties` (`name`, `prefecture`, `type`, `population`, `area_km2`) and a `geometry.coordinates` array stored as `[lat, lng]` (non-standard order).

2. **`js/map.js`** — `TokyoMetroMap` wraps Leaflet.js. On init it calls `normalizeGeoJsonCoordinates()` to swap any `[lat, lng]` pairs where the second value exceeds ±90 into proper `[lng, lat]` GeoJSON order before passing to `L.geoJSON()`. Maintains `selectedAreas` (Set of area name strings) and `areaLayers` (Map of name → Leaflet layer). Prefecture colors are hardcoded in `getPrefectureColor()`.

3. **`js/main.js`** — `TokyoMetroApp` owns the UI: button bindings, keyboard shortcuts (`Ctrl/Cmd+R` random select, `Ctrl/Cmd+C` clear), input validation (1–50), and toast notifications. Delegates all map/selection logic to its `TokyoMetroMap` instance. The global `window.app` is exposed for browser console debugging.

## Data

Coordinate polygons in `data.js` are simplified bounding rectangles, not real administrative boundaries. Population and area values are approximate. To add a region, append a GeoJSON Feature to the `features` array in `data.js` following the existing schema.

## Key Constraints

- **Coordinate order**: `data.js` stores coordinates as `[lat, lng]`. The `normalizeGeoJsonCoordinates()` method in `map.js` detects and corrects this at load time. New entries should follow the existing `[lat, lng]` convention, or the normalization logic will need updating.
- **No framework/build tooling**: changes must work as vanilla JS loaded directly by the browser.
- **Tile fallback**: `map.js` uses `openstreetmap.org` as primary tile source and `openstreetmap.fr/hot` as fallback on tile error.
