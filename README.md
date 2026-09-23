# QUANTA Flood Intelligence

A cinematic flood-intelligence interface with a local SQLite data service for controlled hydrological dataset ingestion.

## Run locally

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

The web interface runs on `http://localhost:4173` and proxies `/api` to the data service on port `4174`. The SQLite database is created automatically at `data/quantum-flood.db` and is intentionally ignored by Git.

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
