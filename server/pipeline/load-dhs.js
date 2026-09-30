// Loads DHS sub-national survey estimates (data/raw/dhs_subnational.json) into
// regional_indicators, matched to geoBoundaries ADM1 region ids.
//   node server/pipeline/load-dhs.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../brics/db.js';
import { DHS_INDICATORS, DHS_SURVEYS } from './countries.js';

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// DHS label (slugged) -> geoBoundaries region slug, where names differ
const ALIASES = {
  IND: { 'new-delhi': 'delhi', 'jammu-kashmir': 'jammu-and-kashmir', 'dadra-and-nagar-haveli-daman-and-diu': 'dadra-and-nagar-haveli-and-daman-and-diu' },
  IDN: { 'dki-jakarta': 'jakarta-special-capital-region', 'di-yogyakarta': 'special-region-of-yogyakarta', 'di-aceh': 'aceh', 'north-sumatera': 'north-sumatra', 'west-sumatera': 'west-sumatra', 'south-sumatera': 'south-sumatra', 'bangka-belitung': 'bangka-belitung-islands', 'east-kalimantan-since-2017': 'east-kalimantan', 'north-kalimantan-since-2017': 'north-kalimantan' },
  ETH: { 'benishangul-gumuz': 'beneshangul-gumu', harari: 'hareri' },
  ZAF: { 'kwazulu-natal': 'kwazulu-natal', 'northern-cape': 'nothern-cape', 'northern-province': 'limpopo' },
};

// Egypt's 2014 DHS reports four regional groups; each governorate takes its group's value.
// North and South Sinai were not surveyed, so they fall back to national indicators.
const EGYPT_GROUPS = {
  'urban-governorates': ['cairo', 'alexandria', 'port-said', 'suez'],
  'lower-egypt': ['damietta', 'dakahlia', 'al-sharqia', 'qalyubia', 'kafr-el-sheikh', 'gharbiyya', 'monufia', 'beheira', 'ismailia'],
  'upper-egypt': ['giza', 'beni-suef', 'faiyum', 'minya', 'asyut', 'sohag', 'qena', 'aswan', 'luxor'],
  'frontier-governorates-excluding-north-and-south-sinai': ['red-sea', 'new-valley', 'matrouh'],
};

export function loadDhs(db) {
  const data = JSON.parse(fs.readFileSync(path.resolve('data/raw/dhs_subnational.json'), 'utf8'));
  const regions = db.prepare('SELECT id, iso3 FROM regions').all();
  const ids = new Set(regions.map((r) => r.id));
  const surveyIso = Object.fromEntries(Object.entries(DHS_SURVEYS).map(([iso3, s]) => [s, iso3]));

  db.exec(`CREATE TABLE IF NOT EXISTS regional_indicators (
    region_id TEXT NOT NULL, key TEXT NOT NULL, value REAL NOT NULL, survey TEXT NOT NULL, year TEXT NOT NULL,
    PRIMARY KEY (region_id, key))`);
  db.exec('BEGIN');
  db.exec('DELETE FROM regional_indicators');
  const ins = db.prepare('INSERT OR REPLACE INTO regional_indicators VALUES (?,?,?,?,?)');
  const unmatched = new Set();
  let n = 0;
  for (const d of data) {
    const iso3 = surveyIso[d.SurveyId];
    const key = DHS_INDICATORS[d.IndicatorId];
    if (!iso3 || !key || d.Value === null) continue;
    const label = slug(d.CharacteristicLabel.replace(/^\.+/, ''));
    let targets;
    if (iso3 === 'EGY') {
      targets = (EGYPT_GROUPS[label] || []).map((g) => [`EGY-${g}-governorate`, `EGY-${g}-governate`].find((x) => ids.has(x)));
    } else {
      targets = [`${iso3}-${ALIASES[iso3]?.[label] || label}`];
    }
    for (const t of targets) {
      if (!t || !ids.has(t)) { if (d.LevelRank === 1) unmatched.add(`${iso3}: ${d.CharacteristicLabel}`); continue; }
      ins.run(t, key, d.Value, d.SurveyId, d.SurveyYearLabel || String(d.SurveyYear));
      n++;
    }
  }
  db.prepare(`INSERT OR REPLACE INTO sources VALUES ('dhs', 'DHS sub-national survey estimates', 'The DHS Program (ICF / USAID)',
    'https://api.dhsprogram.com/', 'Free public API; cite The DHS Program', ?, ?, date('now'), ?)`)
    .run('India NFHS-5 2019-21, Ethiopia 2019, Indonesia 2017, South Africa 2016, Egypt 2014 (regional groups)', n,
      'State/province estimates of improved water, sanitation, electricity, vaccination, under-5 mortality, female literacy, stunting and mobile phones.');
  db.exec('COMMIT');
  const covered = db.prepare('SELECT COUNT(DISTINCT region_id) c FROM regional_indicators').get().c;
  console.log(`DHS: ${n} regional values across ${covered} regions`);
  if (unmatched.size) console.log('Unmatched DHS labels:', [...unmatched].join('; '));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = openDb();
  loadDhs(db);
  db.close();
}
