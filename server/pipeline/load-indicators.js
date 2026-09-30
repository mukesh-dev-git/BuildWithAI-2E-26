// Reloads only the World Bank indicators table in data/brics.db from data/raw/worldbank.json
// (run after `node server/pipeline/fetch-sources.js worldbank`; no full rebuild needed).
import fs from 'node:fs';
import path from 'node:path';
import { INDICATORS } from './countries.js';
import { openDb } from '../brics/db.js';

const wb = JSON.parse(fs.readFileSync(path.resolve('data/raw/worldbank.json'), 'utf8'));
const db = openDb();
db.exec('BEGIN');
db.exec('DELETE FROM indicators');
const ins = db.prepare('INSERT INTO indicators VALUES (?,?,?,?)');
let n = 0;
for (const [code, rows] of Object.entries(wb)) {
  if (!INDICATORS[code]) continue;
  for (const r of rows) { ins.run(r.iso3, INDICATORS[code].key, r.year, r.value); n++; }
}
db.prepare("UPDATE sources SET records = ?, retrieved_at = date('now') WHERE id = 'worldbank'").run(n);
db.exec('COMMIT');
db.close();
console.log(`indicators reloaded: ${n}`);
