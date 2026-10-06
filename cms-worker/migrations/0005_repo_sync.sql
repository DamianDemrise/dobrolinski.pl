-- Synchronizacja panel ↔ repo (content/published.json na main).
-- Jeden wiersz: wersja pliku w repo przy ostatniej synchronizacji (sha blobu), jego treść
-- (baza porównania trójstronnego) i nierozstrzygnięte konflikty (zmiana i w repo, i w panelu).
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  repo_sha TEXT NOT NULL,
  base_json TEXT NOT NULL,
  conflicts_json TEXT NOT NULL DEFAULT '[]',
  synced_at TEXT NOT NULL
);

-- Nowy rodzaj rewizji 'import' (zmiana przyszła z repo). SQLite nie zmienia CHECK w miejscu,
-- więc tabela jest przebudowana z zachowaniem danych.
CREATE TABLE revisions_new (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('checkpoint', 'publish', 'restore', 'import')),
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT,
  UNIQUE (entity_id, version)
);
INSERT INTO revisions_new (id, entity_id, version, kind, data_json, created_at, created_by)
  SELECT id, entity_id, version, kind, data_json, created_at, created_by FROM revisions;
DROP TABLE revisions;
ALTER TABLE revisions_new RENAME TO revisions;
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON revisions(entity_id, version DESC);
