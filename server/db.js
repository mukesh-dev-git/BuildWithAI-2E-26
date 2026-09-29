// VikasDrishti AI — SQLite Database Module
// Uses Node 24 native DatabaseSync for zero-dependency, high-performance SQL operations

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'vikasdrishti.db');

// Ensure server directory exists
if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency & write performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('PRAGMA warning:', e.message);
}

// ── Initialize Database Schema ───────────────────────────
export function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS districts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      population INTEGER NOT NULL,
      bpl_ratio REAL NOT NULL,
      literacy_rate REAL NOT NULL,
      infra_index REAL NOT NULL,
      water_coverage REAL NOT NULL,
      road_density REAL NOT NULL,
      health_facilities REAL NOT NULL,
      budget_allocated REAL NOT NULL,
      budget_utilized REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS grievances (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      raw_text TEXT NOT NULL,
      summary_en TEXT NOT NULL,
      severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'resolved')),
      language TEXT DEFAULT 'hi',
      district_id TEXT NOT NULL,
      lat REAL,
      lng REAL,
      citizen_name TEXT DEFAULT 'Verified Citizen',
      votes INTEGER DEFAULT 1,
      image_description TEXT,
      ai_reasoning TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_grievances_district ON grievances(district_id);
    CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category);
    CREATE INDEX IF NOT EXISTS idx_grievances_severity ON grievances(severity);
  `);
  console.log('✅ SQLite Schema initialized at:', DB_PATH);
}
