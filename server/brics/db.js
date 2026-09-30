// BRICS Development Intelligence database (data/brics.db).
// Built from open sources by `npm run data:build`; see server/pipeline.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export const DB_PATH = path.resolve('data/brics.db');

export function openDb({ fresh = false } = {}) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (fresh && fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  return db;
}

export function createSchema(db) {
  db.exec(`
    CREATE TABLE countries (
      iso3 TEXT PRIMARY KEY, iso2 TEXT, name TEXT NOT NULL, joined INTEGER,
      languages TEXT, feedback_source TEXT
    );
    CREATE TABLE indicators (
      iso3 TEXT NOT NULL, key TEXT NOT NULL, year INTEGER NOT NULL, value REAL NOT NULL,
      PRIMARY KEY (iso3, key, year)
    );
    CREATE TABLE regions (
      id TEXT PRIMARY KEY, iso3 TEXT NOT NULL, name TEXT NOT NULL, iso_code TEXT,
      population INTEGER, population_year INTEGER
    );
    CREATE TABLE municipalities (
      id TEXT PRIMARY KEY, region_id TEXT NOT NULL, name TEXT NOT NULL, lat REAL, lng REAL
    );
    -- Monthly demand per region x sector x request type
    CREATE TABLE demand_monthly (
      region_id TEXT NOT NULL, sector TEXT NOT NULL, month TEXT NOT NULL, type TEXT NOT NULL,
      n INTEGER NOT NULL, resolved INTEGER NOT NULL, days_sum INTEGER NOT NULL, days_n INTEGER NOT NULL,
      source TEXT NOT NULL,
      PRIMARY KEY (region_id, sector, month, type)
    );
    CREATE TABLE demand_subject (
      region_id TEXT NOT NULL, sector TEXT NOT NULL, subject TEXT NOT NULL, year INTEGER NOT NULL, n INTEGER NOT NULL,
      PRIMARY KEY (region_id, sector, subject, year)
    );
    CREATE TABLE demand_municipality (
      municipality_id TEXT NOT NULL, region_id TEXT NOT NULL, sector TEXT NOT NULL, year INTEGER NOT NULL, n INTEGER NOT NULL,
      PRIMARY KEY (municipality_id, sector, year)
    );
    -- Repeated strings (subjects, agencies, statuses) stored once
    CREATE TABLE lookup (id INTEGER PRIMARY KEY, value TEXT NOT NULL UNIQUE);
    -- Individual citizen requests (most recent 12 months of source data + platform intake)
    CREATE TABLE requests (
      id INTEGER PRIMARY KEY, date TEXT NOT NULL, region_id TEXT, municipality_id TEXT,
      sector TEXT NOT NULL, subject_id INTEGER, type TEXT, agency_id INTEGER, sphere_id INTEGER, status_id INTEGER,
      days INTEGER, channel TEXT, language TEXT, text TEXT, source TEXT NOT NULL
    );
    CREATE VIEW requests_v AS
      SELECT q.id, q.date, q.region_id, q.municipality_id, q.sector, s.value subject, q.type, a.value agency,
        sp.value sphere, st.value status, q.days, q.channel, q.language, q.text, q.source
      FROM requests q
      LEFT JOIN lookup s ON s.id = q.subject_id LEFT JOIN lookup a ON a.id = q.agency_id
      LEFT JOIN lookup sp ON sp.id = q.sphere_id LEFT JOIN lookup st ON st.id = q.status_id;
    CREATE TABLE sources (
      id TEXT PRIMARY KEY, name TEXT, publisher TEXT, url TEXT, license TEXT,
      coverage TEXT, records INTEGER, retrieved_at TEXT, notes TEXT
    );
  `);
}

export function createIndexes(db) {
  db.exec(`
    CREATE INDEX idx_dm_sector_month ON demand_monthly(sector, month);
    CREATE INDEX idx_dm_month ON demand_monthly(month);
    CREATE INDEX idx_ds_region ON demand_subject(region_id, year);
    CREATE INDEX idx_dmun_region ON demand_municipality(region_id, year);
    CREATE INDEX idx_req_date ON requests(date DESC);
    CREATE INDEX idx_req_region_sector ON requests(region_id, sector);
    CREATE INDEX idx_regions_iso3 ON regions(iso3);
  `);
}

/** Returns the lookup id for a string, inserting it if new. */
export function lookupId(db, value) {
  if (value === null || value === undefined || value === '') return null;
  db.prepare('INSERT OR IGNORE INTO lookup (value) VALUES (?)').run(value);
  return db.prepare('SELECT id FROM lookup WHERE value = ?').get(value).id;
}
