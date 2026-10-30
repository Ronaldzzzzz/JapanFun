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

The app is built with pure Vanilla ES6 modules loaded via `<script>` tags (zero bundler required), paired with optional Cloudflare Pages Functions for backend storage:

1. **`js/data.js`** — fetches N03 administrative GeoJSONs for Japan's 47 prefectures, combines wards of designated cities into single units, identifies remote island municipalities (`isRemoteIsland`), and handles special areas (like `千葉県所属未定地`).
2. **`js/map.js`** — `TokyoMetroMap` wraps Leaflet.js with light/dark theme tile switching, dynamic prefecture outer border rendering (`prefBorderPane`), non-interactive prefecture watermark labels, roulette deceleration animation, leader line anchor points, and selection highlighting.
3. **`js/info-panel.js`** — `AreaInfoPanel` manages the left-side sliding panel with Google Maps exploration buttons, Wikipedia bilingual summaries (with curated history for special areas like `千葉県所属未定地`), and community photos/notes (`CommunityStore` with Cloudflare D1/R2 API + localStorage fallback).
4. **`js/main.js`** — `TokyoMetroApp` coordinates the floating panels, anchor prefecture & neighbor pool filtering, popular base chips, include-anchor & exclude-islands options, north-to-south leader line rendering (`#leader-lines-svg`), and theme toggling.
5. **`functions/api/`** — Cloudflare Pages Functions (`/api/posts`, `/api/photos/[key]`) backed by Cloudflare D1 SQLite (`schema.sql`) and R2 object storage.

## Data

Coordinate polygons in `data.js` are simplified bounding rectangles, not real administrative boundaries. Population and area values are approximate. To add a region, append a GeoJSON Feature to the `features` array in `data.js` following the existing schema.

## Key Constraints

- **Coordinate order**: `data.js` stores coordinates as `[lat, lng]`. The `normalizeGeoJsonCoordinates()` method in `map.js` detects and corrects this at load time. New entries should follow the existing `[lat, lng]` convention, or the normalization logic will need updating.
- **No framework/build tooling**: changes must work as vanilla JS loaded directly by the browser.
- **Tile fallback**: `map.js` uses `openstreetmap.org` as primary tile source and `openstreetmap.fr/hot` as fallback on tile error.
