-- definy Cloudflare D1 (SQLite) Initial Schema

CREATE TABLE IF NOT EXISTS events (
  event_hash TEXT PRIMARY KEY,
  signed_event_bytes TEXT NOT NULL,
  account_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at_rfc3339 TEXT NOT NULL,
  time_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_time_ms ON events(time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON events(event_type, time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_events_account_time ON events(account_id, time_ms DESC);

CREATE TABLE IF NOT EXISTS cas_contents (
  content_hash TEXT PRIMARY KEY,
  content_bytes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id TEXT NOT NULL,
  commit_hash TEXT,
  status TEXT NOT NULL,
  url TEXT NOT NULL,
  app_url TEXT NOT NULL,
  region TEXT NOT NULL,
  created_at_rfc3339 TEXT NOT NULL,
  wasm_hash TEXT,
  provider TEXT
);

CREATE INDEX IF NOT EXISTS idx_deployments_id ON deployments(id DESC);

CREATE TABLE IF NOT EXISTS preview_apps (
  app_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  part_id TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  path_url TEXT NOT NULL,
  owner_account_id TEXT NOT NULL,
  created_at_rfc3339 TEXT NOT NULL,
  status TEXT NOT NULL,
  subdomain TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preview_apps_owner ON preview_apps(owner_account_id);
