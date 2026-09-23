INSERT OR IGNORE INTO datasets
  (id, name, description, category, source_label, region, data_class, file_name, row_count, field_names, is_seed)
VALUES
  ('seed-rainfall-aster', 'Aster rainfall scenario', 'Synthetic precipitation sequence for interface and ingestion testing only.', 'RAINFALL', 'QUANTA scenario generator', 'Aster Basin / fictional', 'SIMULATION', 'aster-rainfall-simulation.csv', 8, '["timestamp","rainfall_mm","temperature_c"]', 1),
  ('seed-river-aster', 'Aster river response', 'Synthetic river response paired with the demonstration rainfall scenario.', 'RIVER', 'QUANTA scenario generator', 'Aster Basin / fictional', 'SIMULATION', 'aster-river-simulation.csv', 8, '["timestamp","river_level_m","discharge_m3s"]', 1),
  ('seed-soil-aster', 'Aster soil saturation', 'Synthetic sub-basin soil saturation snapshots for workflow testing.', 'SOIL', 'QUANTA scenario generator', 'Aster Basin / fictional', 'SIMULATION', 'aster-soil-simulation.csv', 6, '["timestamp","soil_moisture_pct"]', 1);

INSERT INTO observations (dataset_id, observed_at, rainfall_mm, temperature_c, payload_json)
SELECT 'seed-rainfall-aster', value ->> '$.timestamp', value ->> '$.rainfall_mm', value ->> '$.temperature_c', value
FROM json_each('[
  {"timestamp":"2026-09-23T00:00:00Z","rainfall_mm":4.0,"temperature_c":19.0},
  {"timestamp":"2026-09-23T03:00:00Z","rainfall_mm":8.5,"temperature_c":18.4},
  {"timestamp":"2026-09-23T06:00:00Z","rainfall_mm":14.0,"temperature_c":18.0},
  {"timestamp":"2026-09-23T09:00:00Z","rainfall_mm":21.5,"temperature_c":17.6},
  {"timestamp":"2026-09-23T12:00:00Z","rainfall_mm":18.0,"temperature_c":18.2},
  {"timestamp":"2026-09-23T15:00:00Z","rainfall_mm":11.0,"temperature_c":18.8},
  {"timestamp":"2026-09-23T18:00:00Z","rainfall_mm":6.5,"temperature_c":18.5},
  {"timestamp":"2026-09-23T21:00:00Z","rainfall_mm":3.0,"temperature_c":18.1}
]')
WHERE NOT EXISTS (SELECT 1 FROM observations WHERE dataset_id = 'seed-rainfall-aster');

INSERT INTO observations (dataset_id, observed_at, river_level_m, discharge_m3s, payload_json)
SELECT 'seed-river-aster', value ->> '$.timestamp', value ->> '$.river_level_m', value ->> '$.discharge_m3s', value
FROM json_each('[
  {"timestamp":"2026-09-23T00:00:00Z","river_level_m":1.80,"discharge_m3s":112},
  {"timestamp":"2026-09-23T03:00:00Z","river_level_m":1.92,"discharge_m3s":124},
  {"timestamp":"2026-09-23T06:00:00Z","river_level_m":2.18,"discharge_m3s":151},
  {"timestamp":"2026-09-23T09:00:00Z","river_level_m":2.55,"discharge_m3s":196},
  {"timestamp":"2026-09-23T12:00:00Z","river_level_m":2.94,"discharge_m3s":241},
  {"timestamp":"2026-09-23T15:00:00Z","river_level_m":3.12,"discharge_m3s":268},
  {"timestamp":"2026-09-23T18:00:00Z","river_level_m":2.96,"discharge_m3s":246},
  {"timestamp":"2026-09-23T21:00:00Z","river_level_m":2.62,"discharge_m3s":209}
]')
WHERE NOT EXISTS (SELECT 1 FROM observations WHERE dataset_id = 'seed-river-aster');

INSERT INTO observations (dataset_id, observed_at, soil_moisture_pct, payload_json)
SELECT 'seed-soil-aster', value ->> '$.timestamp', value ->> '$.soil_moisture_pct', value
FROM json_each('[
  {"timestamp":"2026-09-23T00:00:00Z","soil_moisture_pct":52},
  {"timestamp":"2026-09-23T04:00:00Z","soil_moisture_pct":58},
  {"timestamp":"2026-09-23T08:00:00Z","soil_moisture_pct":67},
  {"timestamp":"2026-09-23T12:00:00Z","soil_moisture_pct":76},
  {"timestamp":"2026-09-23T16:00:00Z","soil_moisture_pct":81},
  {"timestamp":"2026-09-23T20:00:00Z","soil_moisture_pct":78}
]')
WHERE NOT EXISTS (SELECT 1 FROM observations WHERE dataset_id = 'seed-soil-aster');
