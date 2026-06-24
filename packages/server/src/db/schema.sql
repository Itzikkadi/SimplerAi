CREATE TABLE IF NOT EXISTS saved_samples (
  saved_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  freesound_id TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  username     TEXT NOT NULL,
  duration     REAL NOT NULL,
  license      TEXT NOT NULL,
  preview_url  TEXT,
  tags         TEXT NOT NULL DEFAULT '[]',
  source_prompt TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS searches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt          TEXT NOT NULL,
  structured_query TEXT NOT NULL,
  result_count    INTEGER NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_cache (
  query_hash TEXT PRIMARY KEY,
  response   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
