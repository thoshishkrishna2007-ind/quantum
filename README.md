# QUANTA Flood Intelligence

A cinematic flood-intelligence interface with a local SQLite data service for controlled hydrological dataset ingestion.

## Run locally

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

The web interface runs on `http://localhost:4173` and proxies `/api` to the data service on port `4174`. The SQLite database is created automatically at `data/quantum-flood.db` and is intentionally ignored by Git.

## Google Maps

The Flood Map does not depend on imported datasets. To use Google's own map tiles and map controls, copy `.env.example` to `.env.local`, add a restricted Google Maps Platform browser key as `VITE_GOOGLE_MAPS_API_KEY`, and restart Vite. Enable Maps JavaScript API, Places API, and Geocoding API, and enable billing in the Google Cloud project. Restrict the key to this app's referrers and the APIs it uses. A `VITE_GOOGLE_MAPS_MAP_ID` is optional for vector-map capabilities. Without a key, or if Google rejects it, the map uses the public Esri/OpenStreetMap fallback instead.

## AI reports

The Reports page can export a data-summary report without an AI key. To enable Gemini analysis, add a separate server-side `GEMINI_API_KEY` to `.env.local`, then restart the API; do not reuse the browser Maps key. Enable the Gemini API for that key. When requested, only dataset summary statistics are sent to Gemini, not raw records.

## Dataset workflow

Open **Datasets** in the command-center navigation to:

- inspect the included simulation rainfall, river-response and soil-saturation datasets;
- download a CSV import template;
- add CSV or JSON datasets with provenance, geographic region and data classification;
- preview normalized hydrology fields and original source values;
- remove user-imported datasets while keeping bundled seed data protected.

Supported classifications are `SIMULATION`, `HISTORICAL`, `OBSERVED`, and `MODEL_OUTPUT`. Classification is metadata supplied by the importer; it does not prove scientific accuracy.

CSV headers are preserved. Common headers such as `timestamp`, `rainfall_mm`, `river_level_m`, `soil_moisture_pct`, `discharge_m3s`, and `temperature_c` are also mapped into queryable SQL columns. Imports are limited to 5,000 records and 6 MB.

## Validation

```bash
npm test
npm run build
npm run lint
```

The sample values in `datasets/` and `server/sql/seed.sql` are explicitly synthetic and must not be used for operational decisions.
