// Builds data/brics.db from the files fetched by fetch-sources.js plus the
// Fala.BR open-data dump (Brazil federal ombudsman, CGU).
//
//   node server/pipeline/build-db.js <path/to/manifestacoes-ouvidoria.zip>
//
// The Fala.BR zip (~190 MB, ~2 GB of CSV) is streamed, never fully extracted.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { BRICS, INDICATORS } from './countries.js';
import { sectorFor, NON_DEVELOPMENT } from './sectors.js';
import { openDb, createSchema, createIndexes, lookupId } from '../brics/db.js';

const RAW = path.resolve('data/raw');
const PROCESSED = path.resolve('data/processed');
const falabrZip = process.argv[2];
const today = new Date().toISOString().slice(0, 10);

const norm = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

const db = openDb({ fresh: true });
createSchema(db);
const tx = (fn) => {
  db.exec('BEGIN');
  try { fn(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
};

// ── Countries & World Bank indicators ───────────────────────────
const wb = JSON.parse(fs.readFileSync(path.join(RAW, 'worldbank.json'), 'utf8'));
tx(() => {
  const ins = db.prepare('INSERT INTO countries VALUES (?,?,?,?,?,?)');
  for (const c of BRICS) {
    ins.run(c.iso3, c.iso2, c.name, c.joined, JSON.stringify(c.languages), c.iso3 === 'BRA' ? 'falabr' : null);
  }
  const insI = db.prepare('INSERT INTO indicators VALUES (?,?,?,?)');
  let n = 0;
  for (const [code, rows] of Object.entries(wb)) {
    for (const r of rows) { insI.run(r.iso3, INDICATORS[code].key, r.year, r.value); n++; }
  }
  console.log(`indicators: ${n}`);
});

// ── Regions (geoBoundaries ADM1) + Brazil population & municipalities ──
const regions = JSON.parse(fs.readFileSync(path.join(PROCESSED, 'regions.json'), 'utf8'));
const ibgePop = JSON.parse(fs.readFileSync(path.join(RAW, 'ibge_state_population.json'), 'utf8'));
const estados = fs.readFileSync(path.join(RAW, 'estados.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
const ufByIbge = Object.fromEntries(estados.map((e) => [e[0], e[1]]));
const popByUf = Object.fromEntries(ibgePop.map((p) => [ufByIbge[p.ibge], p]));
const regionByUf = {};

tx(() => {
  const ins = db.prepare('INSERT INTO regions VALUES (?,?,?,?,?,?)');
  for (const r of regions) {
    const uf = r.iso3 === 'BRA' && r.isoCode ? r.isoCode.slice(3) : null;
    if (uf) regionByUf[uf] = r.id;
    const pop = uf ? popByUf[uf] : null;
    ins.run(r.id, r.iso3, r.name, r.isoCode, pop?.population ?? null, pop?.year ?? null);
  }
});
console.log(`regions: ${regions.length} (Brazil states matched: ${Object.keys(regionByUf).length})`);

const munByKey = {};
tx(() => {
  const ins = db.prepare('INSERT INTO municipalities VALUES (?,?,?,?,?)');
  const lines = fs.readFileSync(path.join(RAW, 'municipios.csv'), 'utf8').trim().split('\n').slice(1);
  for (const l of lines) {
    const [code, name, lat, lng, , ufCode] = l.split(',');
    const uf = ufByIbge[ufCode];
    const regionId = regionByUf[uf];
    if (!regionId) continue;
    ins.run(code, regionId, name, Number(lat), Number(lng));
    munByKey[`${norm(name)}|${uf}`] = code;
  }
  console.log(`municipalities: ${lines.length}`);
});

// ── Fala.BR citizen manifestations ──────────────────────────────
const TYPES = {
  'Reclamação': 'complaint', 'Solicitação': 'request', 'Comunicação': 'report', 'Denúncia': 'denunciation',
  'Elogio': 'praise', 'Sugestão': 'suggestion', 'Simplifique': 'simplify',
};

function streamZipMember(zip, member) {
  const [cmd, args] = process.platform === 'win32'
    ? [path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe'), ['-xOf', zip, member]]
    : ['unzip', ['-p', zip, member]];
  const child = spawn(cmd, args);
  child.stderr.pipe(process.stderr);
  return readline.createInterface({ input: child.stdout.setEncoding('latin1'), crlfDelay: Infinity });
}

async function ingestFalabr(zip) {
  const monthly = new Map();
  const subjects = new Map();
  const muni = new Map();
  const recent = [];
  let total = 0, located = 0, skipped = 0, maxMonth = '0000-00';
  const firstYear = 2015;
  const lastYear = new Date().getFullYear();

  const bump = (map, key, init, fn) => { let v = map.get(key); if (!v) { v = init(); map.set(key, v); } fn(v); };

  for (let year = firstYear; year <= lastYear; year++) {
    const rl = streamZipMember(zip, `Manifestacoes_Ouvidoria_${year}.csv`);
    let header = true;
    for await (const line of rl) {
      if (header) { header = false; continue; }
      const r = line.split(';');
      if (r.length !== 26) { skipped++; continue; }
      total++;
      let uf = r[9], city = r[8];
      if (uf === 'NI' || !regionByUf[uf]) { uf = r[7]; city = r[6]; }
      const regionId = regionByUf[uf];
      if (!regionId) continue;
      located++;

      const [dd, mm, yyyy] = r[0].split('/');
      const month = `${yyyy}-${mm}`;
      if (month > maxMonth) maxMonth = month;
      const subject = r[16] || 'Não Informado';
      const sector = sectorFor(subject);
      const type = TYPES[r[10]] || 'other';
      const resolved = r[20] === 'Concluída' ? 1 : 0;
      const days = r[17] === '' ? null : Number(r[17]);
      const munId = munByKey[`${norm(city)}|${uf}`] || null;

      bump(monthly, `${regionId}\t${sector}\t${month}\t${type}`, () => [0, 0, 0, 0], (v) => {
        v[0]++; v[1] += resolved;
        if (days !== null && !Number.isNaN(days)) { v[2] += days; v[3]++; }
      });
      bump(subjects, `${regionId}\t${sector}\t${subject}\t${yyyy}`, () => [0], (v) => v[0]++);
      if (munId) bump(muni, `${munId}\t${regionId}\t${sector}\t${yyyy}`, () => [0], (v) => v[0]++);

      if (year >= lastYear - 1 && !NON_DEVELOPMENT.includes(sector)) {
        recent.push([`${yyyy}-${mm}-${dd}`, regionId, munId, sector, subject, type, r[13], r[21], r[20], days]);
      }
    }
    console.log(`  Fala.BR ${year}: running total ${total.toLocaleString()} records`);
  }

  // The dump is published on the 1st of the month, so its final month holds only a few
  // records; drop trailing months that have <5% of the previous month's volume.
  const monthTotals = {};
  for (const [k, v] of monthly) { const m = k.split('	')[2]; monthTotals[m] = (monthTotals[m] || 0) + v[0]; }
  const months = Object.keys(monthTotals).sort();
  while (months.length > 1 && monthTotals[months.at(-1)] < 0.05 * monthTotals[months.at(-2)]) {
    const partial = months.pop();
    for (const k of [...monthly.keys()]) if (k.split('	')[2] === partial) monthly.delete(k);
    console.log(`  dropped partial month ${partial} (${monthTotals[partial]} records)`);
  }
  maxMonth = months.at(-1);
  const monthEnd = `${maxMonth}-31`;

  // Keep the most recent 12 months of individual records
  const [my, mm] = maxMonth.split('-').map(Number);
  const cutoff = `${mm === 12 ? my : my - 1}-${String((mm % 12) + 1).padStart(2, '0')}-01`;
  const keep = recent.filter((r) => r[0] >= cutoff && r[0] <= monthEnd);

  tx(() => {
    const insM = db.prepare('INSERT INTO demand_monthly VALUES (?,?,?,?,?,?,?,?,?)');
    for (const [k, v] of monthly) insM.run(...k.split('\t'), ...v, 'falabr');
    const insS = db.prepare('INSERT INTO demand_subject VALUES (?,?,?,?,?)');
    for (const [k, v] of subjects) { const p = k.split('\t'); insS.run(p[0], p[1], p[2], Number(p[3]), v[0]); }
    const insU = db.prepare('INSERT INTO demand_municipality VALUES (?,?,?,?,?)');
    for (const [k, v] of muni) { const p = k.split('\t'); insU.run(p[0], p[1], p[2], Number(p[3]), v[0]); }
    const insR = db.prepare(`INSERT INTO requests (date, region_id, municipality_id, sector, subject_id, type, agency_id, sphere_id, status_id, days, channel, language, source)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'web', 'pt', 'falabr')`);
    const ids = new Map();
    const id = (v) => { if (!ids.has(v)) ids.set(v, lookupId(db, v)); return ids.get(v); };
    for (const r of keep) insR.run(r[0], r[1], r[2], r[3], id(r[4]), r[5], id(r[6]), id(r[7]), id(r[8]), r[9]);
  });

  console.log(`Fala.BR: ${total.toLocaleString()} records, ${located.toLocaleString()} located to a state, ${skipped} malformed rows skipped`);
  console.log(`  aggregates: ${monthly.size} monthly, ${subjects.size} subject, ${muni.size} municipality rows; ${keep.length.toLocaleString()} recent records kept (since ${cutoff})`);
  return { total, located, maxMonth };
}

let falabr = null;
if (falabrZip) falabr = await ingestFalabr(falabrZip);
else console.warn('No Fala.BR zip given — citizen-demand tables left empty.');

// ── Source registry (shown on the Data Sources page) ────────────
tx(() => {
  const ins = db.prepare('INSERT INTO sources VALUES (?,?,?,?,?,?,?,?,?)');
  const wbCount = Object.values(wb).reduce((s, r) => s + r.length, 0);
  ins.run('worldbank', 'World Development Indicators', 'World Bank', 'https://data.worldbank.org/',
    'CC BY 4.0', '10 BRICS members, 2000–latest', wbCount, today,
    'Population, poverty, access to electricity/water/sanitation/internet, hospital beds, literacy, capital formation and PPI infrastructure investment.');
  ins.run('geoboundaries', 'geoBoundaries ADM1', 'William & Mary geoLab', 'https://www.geoboundaries.org/',
    'CC BY 4.0 (gbOpen)', '10 BRICS members, state/province level', regions.length, today,
    'First-level administrative boundaries, simplified for web display.');
  ins.run('ibge', 'Population estimates by state', 'IBGE (Brazil)', 'https://servicodados.ibge.gov.br/',
    'Open government data', 'Brazil, 27 states', ibgePop.length, today, 'Used to normalise demand per 100k residents.');
  ins.run('municipios', 'Brazilian municipalities with coordinates', 'kelvins/municipios-brasileiros (IBGE codes)',
    'https://github.com/kelvins/municipios-brasileiros', 'MIT', 'Brazil, all municipalities', Object.keys(munByKey).length, today,
    'Places city-level demand hotspots on the map.');
  if (falabr) {
    ins.run('falabr', 'Fala.BR ombudsman manifestations', 'Controladoria-Geral da União (CGU), Brazil',
      'https://www.gov.br/cgu/pt-br/acesso-a-informacao/dados-abertos/arquivos/ouvidoria',
      'Open government data', `Brazil, 2015 – ${falabr.maxMonth}`, falabr.total, today,
      'Real citizen complaints, requests, reports and suggestions submitted to federal, state and municipal ombudsmen. Subjects are mapped to development sectors.');
  }
});

createIndexes(db);
db.exec('ANALYZE; VACUUM;');
db.close();
console.log(`Done -> data/brics.db (${(fs.statSync('data/brics.db').size / 1e6).toFixed(1)} MB)`);
