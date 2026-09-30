// /api/v2 — aggregate endpoints for the BRICS development dashboard.
// Every endpoint reads pre-aggregated tables, so response time does not grow
// with the number of raw citizen records.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { openDb, DB_PATH, lookupId } from './db.js';
import { SECTORS, NON_DEVELOPMENT } from '../pipeline/sectors.js';

const NON_DEV_SQL = `(${NON_DEVELOPMENT.map((s) => `'${s}'`).join(',')})`;
import { INDICATORS } from '../pipeline/countries.js';

const router = express.Router();
const GEO_PATH = path.resolve('data/processed/regions.geojson');

let db = null;
function getDb() {
  if (!db) {
    if (!fs.existsSync(DB_PATH)) throw Object.assign(new Error('data/brics.db not found — run `npm run data:build`'), { status: 503 });
    db = openDb();
  }
  return db;
}

// ── helpers ─────────────────────────────────────────────────────
const cache = new Map();
function memo(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

const latestMonth = () => memo('latestMonth', () => getDb().prepare("SELECT MAX(month) m FROM demand_monthly WHERE source != 'platform'").get().m);

function monthsBack(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

/** { iso3: { key: { value, year } } } — most recent observation of each indicator */
const latestIndicators = () => memo('latestIndicators', () => {
  const rows = getDb().prepare(`
    SELECT i.iso3, i.key, i.year, i.value FROM indicators i
    JOIN (SELECT iso3, key, MAX(year) y FROM indicators GROUP BY iso3, key) m
      ON m.iso3 = i.iso3 AND m.key = i.key AND m.y = i.year`).all();
  const out = {};
  for (const r of rows) (out[r.iso3] ??= {})[r.key] = { value: r.value, year: r.year };
  return out;
});

const countries = () => memo('countries', () =>
  getDb().prepare('SELECT * FROM countries').all().map((c) => ({ ...c, languages: JSON.parse(c.languages) })));

const regionsById = () => memo('regions', () =>
  Object.fromEntries(getDb().prepare('SELECT * FROM regions').all().map((r) => [r.id, r])));

/** Infrastructure gap (0–100, higher = worse) for a sector in a country, from World Bank indicators. */
function sectorGap(iso3, sector) {
  const ind = latestIndicators()[iso3] || {};
  const pct = (k) => (ind[k] ? 100 - ind[k].value : null);
  switch (sector) {
    case 'water': {
      const v = [pct('water_pct'), pct('sanitation_pct')].filter((x) => x !== null);
      return v.length ? v.reduce((a, b) => a + b) / v.length : null;
    }
    case 'energy': return pct('electricity_pct');
    case 'digital': return pct('internet_pct');
    case 'education': return pct('literacy_pct');
    case 'health': return ind.hospital_beds ? Math.max(0, (1 - ind.hospital_beds.value / 3) * 100) : null; // 3 beds per 1,000 (roughly the global average) = no gap
    case 'social': return ind.poverty_pct ? Math.min(100, ind.poverty_pct.value * 4) : null;
    default: return null;
  }
}

const rank = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return (v) => (sorted.length <= 1 ? 1 : sorted.findIndex((x) => x >= v) / (sorted.length - 1));
};

function parseFilters(q) {
  return {
    country: q.country && q.country !== 'ALL' ? String(q.country) : null,
    sector: q.sector && q.sector !== 'all' ? String(q.sector) : null,
    months: Math.min(Math.max(Number(q.months) || 12, 1), 144),
  };
}

// ── Demand priority engine ──────────────────────────────────────
// Combines citizen demand (volume per capita, growth, unresolved share)
// with the national infrastructure gap for the sector.
function computeRecommendations({ country, sector }) {
  const key = `recs:${country}:${sector}`;
  return memo(key, () => {
    const end = latestMonth();
    const from12 = monthsBack(end, 11);
    const from6 = monthsBack(end, 5);
    const from18 = monthsBack(end, 17);
    const params = [from18];
    let where = `dm.month >= ? AND dm.sector NOT IN ${NON_DEV_SQL}`;
    if (sector) { where += ' AND dm.sector = ?'; params.push(sector); }
    if (country) { where += ' AND r.iso3 = ?'; params.push(country); }

    const rows = getDb().prepare(`
      SELECT dm.region_id, dm.sector, r.iso3, r.name, r.population,
        SUM(CASE WHEN dm.month >= '${from12}' THEN dm.n END) n12,
        SUM(CASE WHEN dm.month >= '${from6}' THEN dm.n END) n6,
        SUM(CASE WHEN dm.month < '${from6}' AND dm.month >= '${monthsBack(end, 11)}' THEN dm.n END) prev6,
        SUM(CASE WHEN dm.month >= '${from12}' THEN dm.resolved END) res12,
        SUM(CASE WHEN dm.month >= '${from12}' THEN dm.days_sum END) days_sum,
        SUM(CASE WHEN dm.month >= '${from12}' THEN dm.days_n END) days_n
      FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
      WHERE ${where} AND dm.type NOT IN ('praise')
      GROUP BY dm.region_id, dm.sector
      HAVING n12 >= 25`).all(...params);

    const items = rows.map((r) => {
      const per100k = r.population ? (r.n12 / r.population) * 1e5 : null;
      const growth = r.prev6 ? (r.n6 - r.prev6) / r.prev6 : 0;
      const unresolved = 1 - r.res12 / r.n12;
      return { ...r, per100k, growth, unresolved, avgDays: r.days_n ? r.days_sum / r.days_n : null, gap: sectorGap(r.iso3, r.sector) };
    });

    // Rank each signal within its sector so sectors with naturally different volumes compare fairly
    const bySector = {};
    for (const it of items) (bySector[it.sector] ??= []).push(it);
    for (const list of Object.values(bySector)) {
      const rPer = rank(list.map((i) => i.per100k ?? 0));
      const rVol = rank(list.map((i) => i.n12));
      const rGrow = rank(list.map((i) => i.growth));
      for (const it of list) {
        const demand = 0.6 * rPer(it.per100k ?? 0) + 0.4 * rVol(it.n12);
        const gapN = it.gap === null ? 0.5 : Math.min(it.gap, 60) / 60;
        it.components = {
          demand: +demand.toFixed(3),
          growth: +rGrow(it.growth).toFixed(3),
          unresolved: +Math.min(it.unresolved * 3, 1).toFixed(3),
          infraGap: +gapN.toFixed(3),
        };
        it.score = Math.round(100 * (0.45 * it.components.demand + 0.2 * it.components.growth + 0.15 * it.components.unresolved + 0.2 * it.components.infraGap));
      }
    }

    const demandBased = items.map((it) => ({
      id: `${it.region_id}:${it.sector}`,
      basis: 'citizen-demand',
      regionId: it.region_id, region: it.name, iso3: it.iso3, sector: it.sector, sectorLabel: SECTORS[it.sector].label,
      score: it.score, requests12m: it.n12, per100k: it.per100k && +it.per100k.toFixed(1),
      growth: +it.growth.toFixed(3), unresolved: +it.unresolved.toFixed(3), avgDays: it.avgDays && Math.round(it.avgDays),
      infraGap: it.gap && +it.gap.toFixed(1), components: it.components, population: it.population,
    }));

    // Countries without open citizen-feedback data: need-based recommendations from national indicators
    const needBased = [];
    for (const c of countries()) {
      if (c.feedback_source) continue;
      if (country && c.iso3 !== country) continue;
      for (const s of Object.keys(SECTORS)) {
        if (sector && s !== sector) continue;
        const gap = sectorGap(c.iso3, s);
        if (gap === null || gap < 3) continue;
        needBased.push({
          id: `${c.iso3}:${s}`, basis: 'infrastructure-need', regionId: null, region: `${c.name} (national)`,
          iso3: c.iso3, sector: s, sectorLabel: SECTORS[s].label,
          // Capped at 70: without citizen evidence a national gap alone shouldn't outrank verified demand hotspots
          score: Math.round(Math.min(gap, 60) / 60 * 70), infraGap: +gap.toFixed(1),
          components: { demand: null, growth: null, unresolved: null, infraGap: +(Math.min(gap, 60) / 60).toFixed(3) },
        });
      }
    }
    return [...demandBased, ...needBased].sort((a, b) => b.score - a.score);
  });
}

// ── routes ──────────────────────────────────────────────────────
router.get('/meta', (req, res) => {
  const d = getDb();
  res.json({
    sectors: SECTORS,
    indicators: Object.values(INDICATORS),
    countries: countries(),
    latestMonth: latestMonth(),
    firstMonth: d.prepare('SELECT MIN(month) m FROM demand_monthly').get().m,
  });
});

router.get('/geo', (req, res) => {
  res.type('application/geo+json');
  res.set('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(GEO_PATH).pipe(res);
});

router.get('/overview', (req, res) => {
  const { country, sector, months } = parseFilters(req.query);
  const d = getDb();
  const end = latestMonth();
  const from = monthsBack(end, months - 1);
  const prevFrom = monthsBack(end, 2 * months - 1);
  const cond = [`dm.sector NOT IN ${NON_DEV_SQL}`];
  const p = [];
  if (country) { cond.push('r.iso3 = ?'); p.push(country); }
  if (sector) { cond.push('dm.sector = ?'); p.push(sector); }
  const where = cond.join(' AND ');

  const kpi = d.prepare(`
    SELECT SUM(CASE WHEN month >= ? THEN n END) n, SUM(CASE WHEN month >= ? THEN resolved END) resolved,
      SUM(CASE WHEN month < ? AND month >= ? THEN n END) prev,
      SUM(CASE WHEN month >= ? THEN days_sum END) days_sum, SUM(CASE WHEN month >= ? THEN days_n END) days_n,
      COUNT(DISTINCT CASE WHEN month >= ? THEN region_id END) regions
    FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id WHERE ${where}`)
    .get(from, from, from, prevFrom, from, from, from, ...p);

  const allTime = d.prepare(`SELECT SUM(n) n FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id WHERE ${country ? 'r.iso3 = ?' : '1=1'}`)
    .get(...(country ? [country] : [])).n;

  const trend = d.prepare(`
    SELECT month, sector, SUM(n) n FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
    WHERE ${where} AND month >= ? GROUP BY month, sector ORDER BY month`).all(...p, monthsBack(end, 35));

  const bySector = d.prepare(`
    SELECT sector, SUM(n) n, SUM(resolved) resolved FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
    WHERE ${where} AND month >= ? GROUP BY sector ORDER BY n DESC`).all(...p, from);

  const byType = d.prepare(`
    SELECT type, SUM(n) n FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
    WHERE ${where} AND month >= ? GROUP BY type ORDER BY n DESC`).all(...p, from);

  const recs = computeRecommendations({ country, sector });
  const covered = countries().filter((c) => c.feedback_source).map((c) => c.iso3);

  res.json({
    window: { from, to: end, months },
    kpis: {
      requests: kpi.n || 0,
      requestsPrev: kpi.prev || 0,
      resolvedPct: kpi.n ? kpi.resolved / kpi.n : null,
      avgDays: kpi.days_n ? kpi.days_sum / kpi.days_n : null,
      regionsWithDemand: kpi.regions,
      allTimeRecords: allTime || 0,
      hotspots: recs.filter((r) => r.score >= 70).length,
      countriesWithFeedback: covered.length,
      countries: countries().length,
    },
    trend, bySector, byType,
    topRecommendations: recs.slice(0, 8),
  });
});

router.get('/map', (req, res) => {
  const { country, sector, months } = parseFilters(req.query);
  const end = latestMonth();
  const from = monthsBack(end, months - 1);
  const p = [from];
  let cond = `dm.month >= ? AND dm.sector NOT IN ${NON_DEV_SQL} AND dm.type != 'praise'`;
  if (sector) { cond += ' AND dm.sector = ?'; p.push(sector); }
  const rows = getDb().prepare(`
    SELECT dm.region_id id, SUM(dm.n) n, SUM(dm.resolved) resolved FROM demand_monthly dm
    WHERE ${cond} GROUP BY dm.region_id`).all(...p);
  const demand = Object.fromEntries(rows.map((r) => [r.id, r]));
  const recs = computeRecommendations({ country: null, sector });
  const topByRegion = {};
  for (const r of recs) if (r.regionId && !topByRegion[r.regionId]) topByRegion[r.regionId] = r;

  const regions = Object.values(regionsById())
    .filter((r) => !country || r.iso3 === country)
    .map((r) => {
      const dmd = demand[r.id];
      const gap = sector ? sectorGap(r.iso3, sector) : null;
      return {
        id: r.id, name: r.name, iso3: r.iso3, population: r.population,
        requests: dmd?.n ?? null,
        per100k: dmd && r.population ? +((dmd.n / r.population) * 1e5).toFixed(1) : null,
        resolvedPct: dmd ? dmd.resolved / dmd.n : null,
        topPriority: topByRegion[r.id] ? { sector: topByRegion[r.id].sector, score: topByRegion[r.id].score } : null,
        nationalGap: gap && +gap.toFixed(1),
      };
    });

  const countryNeed = Object.fromEntries(countries().map((c) => [c.iso3, {
    hasFeedback: !!c.feedback_source,
    gaps: Object.fromEntries(Object.keys(SECTORS).map((s) => [s, sectorGap(c.iso3, s)]).filter(([, v]) => v !== null)),
  }]));

  res.json({ window: { from, to: end }, regions, countryNeed });
});

router.get('/hotspots', (req, res) => {
  const { country, sector } = parseFilters(req.query);
  const end = latestMonth();
  const year = Number(req.query.year) || Number(end.slice(0, 4));
  const p = [year];
  let cond = `dm.year = ? AND dm.sector NOT IN ${NON_DEV_SQL}`;
  if (sector) { cond += ' AND dm.sector = ?'; p.push(sector); }
  if (country) { cond += ' AND r.iso3 = ?'; p.push(country); }
  const rows = getDb().prepare(`
    SELECT m.id, m.name, m.lat, m.lng, r.name region, r.iso3, SUM(dm.n) n
    FROM demand_municipality dm JOIN municipalities m ON m.id = dm.municipality_id JOIN regions r ON r.id = dm.region_id
    WHERE ${cond} GROUP BY m.id ORDER BY n DESC LIMIT ?`).all(...p, Math.min(Number(req.query.limit) || 400, 2000));
  res.json({ year, hotspots: rows });
});

router.get('/recommendations', (req, res) => {
  const { country, sector } = parseFilters(req.query);
  const basis = req.query.basis;
  let recs = computeRecommendations({ country, sector });
  if (basis) recs = recs.filter((r) => r.basis === basis);
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  res.json({ total: recs.length, items: recs.slice(0, limit) });
});

router.get('/recommendations/:regionId/:sector', (req, res) => {
  const { regionId, sector } = req.params;
  const region = regionsById()[regionId];
  if (!region || !SECTORS[sector]) return res.status(404).json({ error: 'Unknown region or sector' });
  const d = getDb();
  const end = latestMonth();
  const rec = computeRecommendations({ country: region.iso3, sector }).find((r) => r.regionId === regionId);
  const year = Number(end.slice(0, 4));
  res.json({
    region, sector: { id: sector, ...SECTORS[sector] }, recommendation: rec || null,
    trend: d.prepare(`SELECT month, SUM(n) n, SUM(resolved) resolved FROM demand_monthly
      WHERE region_id = ? AND sector = ? AND month >= ? GROUP BY month ORDER BY month`).all(regionId, sector, monthsBack(end, 35)),
    subjects: d.prepare(`SELECT subject, SUM(n) n FROM demand_subject WHERE region_id = ? AND sector = ? AND year >= ?
      GROUP BY subject ORDER BY n DESC LIMIT 10`).all(regionId, sector, year - 1),
    municipalities: d.prepare(`SELECT m.name, m.lat, m.lng, SUM(dm.n) n FROM demand_municipality dm JOIN municipalities m ON m.id = dm.municipality_id
      WHERE dm.region_id = ? AND dm.sector = ? AND dm.year >= ? GROUP BY m.id ORDER BY n DESC LIMIT 10`).all(regionId, sector, year - 1),
    byType: d.prepare(`SELECT type, SUM(n) n FROM demand_monthly WHERE region_id = ? AND sector = ? AND month >= ?
      GROUP BY type ORDER BY n DESC`).all(regionId, sector, monthsBack(end, 11)),
    indicators: latestIndicators()[region.iso3] || {},
    samples: d.prepare(`SELECT date, subject, type, agency, status, days FROM requests_v
      WHERE region_id = ? AND sector = ? ORDER BY date DESC LIMIT 15`).all(regionId, sector),
  });
});

router.get('/requests', (req, res) => {
  const { country, sector } = parseFilters(req.query);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const size = Math.min(Math.max(Number(req.query.size) || 50, 10), 200);
  const cond = ['1=1'];
  const p = [];
  if (country) { cond.push('r.iso3 = ?'); p.push(country); }
  if (sector) { cond.push('q.sector = ?'); p.push(sector); }
  if (req.query.region) { cond.push('q.region_id = ?'); p.push(String(req.query.region)); }
  if (req.query.type) { cond.push('q.type = ?'); p.push(String(req.query.type)); }
  if (req.query.source) { cond.push('q.source = ?'); p.push(String(req.query.source)); }
  if (req.query.q) { cond.push('(q.subject LIKE ? OR q.agency LIKE ? OR q.text LIKE ?)'); const like = `%${req.query.q}%`; p.push(like, like, like); }
  const where = cond.join(' AND ');
  const d = getDb();
  const total = d.prepare(`SELECT COUNT(*) c FROM requests_v q LEFT JOIN regions r ON r.id = q.region_id WHERE ${where}`).get(...p).c;
  const items = d.prepare(`
    SELECT q.*, r.name region, r.iso3, m.name municipality FROM requests_v q
    LEFT JOIN regions r ON r.id = q.region_id LEFT JOIN municipalities m ON m.id = q.municipality_id
    WHERE ${where} ORDER BY q.date DESC, q.id DESC LIMIT ? OFFSET ?`).all(...p, size, (page - 1) * size);
  res.json({ total, page, size, items });
});

router.post('/requests', express.json(), (req, res) => {
  const b = req.body || {};
  if (!b.text || !b.sector || !SECTORS[b.sector]) return res.status(400).json({ error: 'text and a valid sector are required' });
  const region = b.regionId ? regionsById()[b.regionId] : null;
  const d = getDb();
  const info = d.prepare(`INSERT INTO requests (date, region_id, sector, subject_id, type, status_id, channel, language, text, source)
    VALUES (date('now'), ?, ?, ?, ?, ?, ?, ?, ?, 'platform')`)
    .run(region?.id ?? null, b.sector, lookupId(d, b.subject ? String(b.subject).slice(0, 200) : null), b.type || 'request',
      lookupId(d, 'Registered'), b.channel || 'web', b.language || null, String(b.text).slice(0, 4000));
  // Count it toward region × sector demand so it feeds the map and priority engine
  if (region) {
    d.prepare(`INSERT INTO demand_monthly VALUES (?, ?, strftime('%Y-%m', 'now'), ?, 1, 0, 0, 0, 'platform')
      ON CONFLICT (region_id, sector, month, type) DO UPDATE SET n = n + 1`).run(region.id, b.sector, b.type || 'request');
    cache.clear();
  }
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

router.get('/countries', (req, res) => {
  const d = getDb();
  const end = latestMonth();
  const demand = Object.fromEntries(d.prepare(`
    SELECT r.iso3, SUM(dm.n) n FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
    WHERE dm.month >= ? AND dm.sector NOT IN ${NON_DEV_SQL} GROUP BY r.iso3`).all(monthsBack(end, 11)).map((r) => [r.iso3, r.n]));
  const regionCounts = Object.fromEntries(d.prepare('SELECT iso3, COUNT(*) c FROM regions GROUP BY iso3').all().map((r) => [r.iso3, r.c]));
  res.json(countries().map((c) => ({
    ...c,
    regions: regionCounts[c.iso3] || 0,
    requests12m: demand[c.iso3] ?? null,
    indicators: latestIndicators()[c.iso3] || {},
    gaps: Object.fromEntries(Object.keys(SECTORS).map((s) => [s, sectorGap(c.iso3, s)]).filter(([, v]) => v !== null)),
  })));
});

router.get('/regions', (req, res) => {
  const { country } = parseFilters(req.query);
  res.json(Object.values(regionsById())
    .filter((r) => !country || r.iso3 === country)
    .map(({ id, name, iso3 }) => ({ id, name, iso3 }))
    .sort((a, b) => a.name.localeCompare(b.name)));
});

router.get('/indicators/series', (req, res) => {
  const key = String(req.query.key || 'electricity_pct');
  res.json(getDb().prepare('SELECT iso3, year, value FROM indicators WHERE key = ? ORDER BY year').all(key));
});

router.get('/investment', (req, res) => {
  const d = getDb();
  const ppi = d.prepare(`SELECT iso3, key, year, value FROM indicators WHERE key LIKE 'ppi_%' ORDER BY year`).all();
  const gfcf = d.prepare(`SELECT iso3, year, value FROM indicators WHERE key = 'gfcf_pct_gdp' ORDER BY year`).all();
  // Demand share vs investment share by sector (only where both exist: Brazil today)
  const end = latestMonth();
  const PPI_SECTOR = { ppi_transport: 'transport', ppi_energy: 'energy', ppi_water: 'water', ppi_ict: 'digital' };
  const alignment = countries().filter((c) => c.feedback_source).map((c) => {
    const dem = d.prepare(`SELECT dm.sector, SUM(dm.n) n FROM demand_monthly dm JOIN regions r ON r.id = dm.region_id
      WHERE r.iso3 = ? AND dm.month >= ? AND dm.sector IN ('transport','energy','water','digital') GROUP BY dm.sector`)
      .all(c.iso3, monthsBack(end, 59));
    const inv = d.prepare(`SELECT key, SUM(value) v FROM indicators WHERE iso3 = ? AND key LIKE 'ppi_%' AND year >= ? GROUP BY key`)
      .all(c.iso3, Number(end.slice(0, 4)) - 5);
    const demTotal = dem.reduce((s, r) => s + r.n, 0);
    const invTotal = inv.reduce((s, r) => s + r.v, 0);
    return {
      iso3: c.iso3, name: c.name,
      sectors: Object.values(PPI_SECTOR).map((s) => {
        const dn = dem.find((r) => r.sector === s)?.n || 0;
        const iv = inv.find((r) => PPI_SECTOR[r.key] === s)?.v || 0;
        return { sector: s, demandShare: demTotal ? dn / demTotal : 0, investmentShare: invTotal ? iv / invTotal : 0, requests: dn, investmentUsd: iv };
      }),
    };
  });
  res.json({ ppi, gfcf, alignment });
});

router.get('/sources', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM sources').all());
});

router.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

export default router;
