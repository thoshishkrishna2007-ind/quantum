PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS datasets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('RAINFALL', 'RIVER', 'SOIL', 'TERRAIN', 'INFRASTRUCTURE', 'HYDROLOGY', 'OTHER')),
  source_label TEXT NOT NULL,
  region TEXT NOT NULL,
  data_class TEXT NOT NULL CHECK (data_class IN ('SIMULATION', 'HISTORICAL', 'OBSERVED', 'MODEL_OUTPUT')),
  file_name TEXT,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  field_names TEXT NOT NULL DEFAULT '[]',
  is_seed INTEGER NOT NULL DEFAULT 0 CHECK (is_seed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  observed_at TEXT,
  rainfall_mm REAL,
  river_level_m REAL,
  soil_moisture_pct REAL,
  discharge_m3s REAL,
  temperature_c REAL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observations_dataset ON observations(dataset_id);
CREATE INDEX IF NOT EXISTS idx_observations_time ON observations(observed_at);
CREATE INDEX IF NOT EXISTS idx_datasets_class ON datasets(data_class);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
