// Region × theme hotspots for the Demand Intelligence Map.
// Each region gets the best evidence available for a theme:
//   citizen-demand     Brazil: Fala.BR requests via the priority engine
//   regional-survey    India, Ethiopia, Indonesia, South Africa, Egypt: DHS state/province estimates
//   national-indicator everyone else: the member's World Bank theme score applied to all regions
import { THEMES, PROGRAMMES, tierOf } from './themes.js';
import { buildCountryHexGrid, buildHexGrid, regionGeo } from './hexgrid.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const avg = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const f0 = (v) => (v === undefined || v === null ? 'n/a' : Math.round(v));

// Themes available on the map. Food & nutrition exists only where DHS surveys measure stunting.
export const MAP_THEMES = [
  ...THEMES.map(({ id, label, sector, icon, color }) => ({ id, label, sector, icon, color })),
  { id: 'nutrition', label: 'Food & nutrition', sector: 'agriculture', icon: 'wheat', color: '#84cc16' },
];

// Regional need scores from DHS indicators, on the same 0–100 scale as the national themes
const REGIONAL = {
  water: (i) => avg([i.water_improved != null ? clamp(((100 - i.water_improved) / 40) * 100) : null,
    i.sanitation_improved != null ? clamp(((100 - i.sanitation_improved) / 40) * 100) : null]),
  energy: (i) => (i.electricity != null ? clamp(((100 - i.electricity) / 40) * 100) : null),
  health: (i) => avg([i.u5_mortality != null ? clamp((i.u5_mortality / 60) * 100) : null,
    i.vaccination_basic != null ? clamp(((100 - i.vaccination_basic) / 50) * 100) : null]),
  education: (i) => (i.literacy_women != null ? clamp(((100 - i.literacy_women) / 40) * 100) : null),
  digital: (i) => (i.mobile_phone != null ? clamp(((100 - i.mobile_phone) / 40) * 100) : null),
  nutrition: (i) => (i.stunting != null ? clamp((i.stunting / 40) * 100) : null),
};
const REGIONAL_TEXT = {
  water: (i) => `${f0(i.water_improved)}% improved water, ${f0(i.sanitation_improved)}% improved sanitation`,
  energy: (i) => `${f0(i.electricity)}% of households with electricity`,
  health: (i) => `under-5 mortality ${f0(i.u5_mortality)} per 1,000, ${f0(i.vaccination_basic)}% basic vaccination`,
  education: (i) => `${f0(i.literacy_women)}% female literacy`,
  digital: (i) => `${f0(i.mobile_phone)}% of households own a mobile phone`,
  nutrition: (i) => `${f0(i.stunting)}% of under-5s stunted`,
};

const surveyName = (i) => (i._survey === 'IA2020DHS' ? 'NFHS-5 survey (2019–21)' : `DHS survey (${i._year})`);

export function registerHotspots(router, h) {
  const { getDb, memo, countries, regionsById, computeRecommendations, latestIndicators } = h;

  const actions = () => {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS hotspot_actions (
      key TEXT PRIMARY KEY, done INTEGER NOT NULL, updated_at TEXT NOT NULL)`);
    return Object.fromEntries(db.prepare('SELECT key, done, updated_at FROM hotspot_actions').all().map((r) => [r.key, r]));
  };

  const regionalIndicators = () => memo('regionalIndicators', () => {
    const out = {};
    for (const r of getDb().prepare('SELECT region_id, key, value, survey, year FROM regional_indicators').all()) {
      const o = (out[r.region_id] ??= { _survey: r.survey, _year: r.year });
      o[r.key] = r.value;
    }
    return out;
  });

  const nationalScores = () => memo('nationalThemeScores', () => {
    const li = latestIndicators();
    return Object.fromEntries(countries().map((c) => {
      const vals = Object.fromEntries(Object.entries(li[c.iso3] || {}).map(([k, v]) => [k, v.value]));
      return [c.iso3, Object.fromEntries(THEMES.map((t) => [t.id, { score: t.score(vals), text: t.describe(vals) }]))];
    }));
  });

  const nationalPpi = () => memo('nationalPpi', () => {
    const d = getDb();
    const maxYear = d.prepare('SELECT MAX(year) y FROM indicators').get().y;
    const out = {};
    for (const r of d.prepare("SELECT iso3, key, SUM(value) v FROM indicators WHERE key LIKE 'ppi_%' AND year > ? GROUP BY iso3, key").all(maxYear - 10)) {
      (out[r.iso3] ??= {})[r.key] = r.v;
    }
    return out;
  });
  const PPI_KEY = { water: 'ppi_water', energy: 'ppi_energy', transport: 'ppi_transport', digital: 'ppi_ict' };

  /** All region × theme hotspots (cached). */
  const allHotspots = () => memo('allHotspots', () => {
    const regions = Object.values(regionsById());
    const reg = regionalIndicators();
    const nat = nationalScores();
    const ppi = nationalPpi();
    const feedback = new Set(countries().filter((c) => c.feedback_source).map((c) => c.iso3));
    const demand = {};
    for (const r of computeRecommendations({ country: null, sector: null })) if (r.regionId) demand[`${r.regionId}:${r.sector}`] = r;

    const out = [];
    for (const region of regions) {
      for (const t of MAP_THEMES) {
        let rec = null;
        if (feedback.has(region.iso3)) {
          const r = demand[`${region.id}:${t.sector}`];
          if (!r) continue;
          rec = {
            basis: 'citizen-demand', score: r.score, requests12m: r.requests12m, per100k: r.per100k, growth: r.growth,
            unresolved: r.unresolved, detail: `${r.requests12m.toLocaleString('en')} citizen requests in 12 months, ${r.per100k} per 100k residents`,
            infraScore: r.infraGap === null ? null : Math.round(100 - r.infraGap), source: 'Fala.BR citizen requests',
          };
        } else if (reg[region.id] && REGIONAL[t.id]?.(reg[region.id]) != null) {
          const s = REGIONAL[t.id](reg[region.id]);
          rec = {
            basis: 'regional-survey', score: Math.round(s), detail: REGIONAL_TEXT[t.id](reg[region.id]),
            infraScore: Math.round(100 - s), source: surveyName(reg[region.id]),
          };
        } else if (nat[region.iso3]?.[t.id]?.score != null) {
          const n = nat[region.iso3][t.id];
          rec = {
            basis: 'national-indicator', score: Math.round(n.score), detail: `National: ${n.text}`,
            infraScore: Math.round(100 - n.score), source: 'World Bank WDI (national)',
          };
        } else continue;
        out.push({
          key: `${region.id}:${t.id}`, regionId: region.id, region: region.name, iso3: region.iso3,
          theme: t.id, themeLabel: t.label, sector: t.sector, tier: tierOf(rec.score),
          population: region.population ?? null,
          nationalInvestment: PPI_KEY[t.sector] ? ppi[region.iso3]?.[PPI_KEY[t.sector]] ?? null : null,
          programme: PROGRAMMES[t.id]?.[region.iso3] || null,
          ...rec,
        });
      }
    }
    return out;
  });

  const withActions = (items) => {
    const a = actions();
    return items.map((x) => ({ ...x, addressed: !!a[x.key]?.done, addressedAt: a[x.key]?.done ? a[x.key].updated_at : null }));
  };

  const BASIS_ORDER = { 'citizen-demand': 0, 'regional-survey': 1, 'national-indicator': 2 };

  router.get('/hotspots/list', (req, res) => {
    const { country, theme, basis, q, tier, status } = req.query;
    const sort = String(req.query.sort || 'score');
    let items = allHotspots();
    if (country && country !== 'ALL') items = items.filter((x) => x.iso3 === country);
    // National estimates repeat one value across every region; list them only on request
    if (req.query.national !== '1') items = items.filter((x) => x.basis !== 'national-indicator');
    const counts = Object.fromEntries(MAP_THEMES.map((t) => [t.id, items.filter((x) => x.theme === t.id && x.tier !== 'low').length]));
    if (theme && theme !== 'all') items = items.filter((x) => x.theme === theme);
    if (basis) items = items.filter((x) => x.basis === basis);
    if (tier) items = items.filter((x) => x.tier === tier);
    if (q) { const s = String(q).toLowerCase(); items = items.filter((x) => x.region.toLowerCase().includes(s)); }
    items = withActions(items);
    if (status === 'open') items = items.filter((x) => !x.addressed);
    if (status === 'addressed') items = items.filter((x) => x.addressed);
    items = [...items].sort((a, b) => {
      if (sort === 'growth') return (b.growth ?? -Infinity) - (a.growth ?? -Infinity);
      if (sort === 'requests') return (b.requests12m ?? -1) - (a.requests12m ?? -1);
      if (sort === 'score-asc') return a.score - b.score;
      // Equal scores: stronger evidence first (regional data before national fallback)
      return b.score - a.score || BASIS_ORDER[a.basis] - BASIS_ORDER[b.basis];
    });
    const page = Math.max(Number(req.query.page) || 1, 1);
    const size = Math.min(Math.max(Number(req.query.size) || 10, 5), 100);
    res.json({ total: items.length, page, size, counts, themes: MAP_THEMES, items: items.slice((page - 1) * size, page * size) });
  });

  router.post('/hotspots/action', (req, res) => {
    const { key, done } = req.body || {};
    if (!key || !allHotspots().some((x) => x.key === key)) return res.status(400).json({ error: 'Unknown hotspot' });
    actions();
    getDb().prepare(`INSERT INTO hotspot_actions VALUES (?, ?, datetime('now'))
      ON CONFLICT (key) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`).run(key, done ? 1 : 0);
    res.json({ key, done: !!done });
  });

  router.get('/hotspots/detail/:regionId/:theme', (req, res) => {
    const item = allHotspots().find((x) => x.regionId === req.params.regionId && x.theme === req.params.theme);
    if (!item) return res.status(404).json({ error: 'No data for this region and theme' });
    const [withAct] = withActions([item]);
    const feature = regionGeo().find((f) => f.properties.id === item.regionId);
    const similar = allHotspots()
      .filter((x) => x.theme === item.theme && x.iso3 !== item.iso3 && x.basis !== 'national-indicator')
      .sort((a, b) => Math.abs(a.score - item.score) - Math.abs(b.score - item.score)).slice(0, 5);
    let trend = [];
    if (item.basis === 'citizen-demand') {
      trend = getDb().prepare(`SELECT month, SUM(n) n FROM demand_monthly WHERE region_id = ? AND sector = ?
        GROUP BY month ORDER BY month DESC LIMIT 24`).all(item.regionId, item.sector).reverse();
    }
    res.json({ ...withAct, geometry: feature?.geometry || null, indicators: regionalIndicators()[item.regionId] || null, similar, trend });
  });

  // Hex layer: every cell coloured by its region's score for the theme and layer
  router.get('/hotspots/hexmap', (req, res) => {
    const theme = req.query.theme && req.query.theme !== 'all' ? String(req.query.theme) : null;
    const layer = String(req.query.layer || 'priority');
    const iso3 = req.query.country && req.query.country !== 'ALL' ? String(req.query.country) : null;
    const grid = iso3 ? memo(`hexgrid:${iso3}`, () => buildCountryHexGrid(iso3)) : memo('hexgrid', buildHexGrid);
    const byRegion = {};
    for (const x of allHotspots()) {
      if (theme && x.theme !== theme) continue;
      if (layer === 'demand' && x.basis !== 'citizen-demand') continue;
      if (layer === 'need' && x.basis === 'citizen-demand') continue;
      const b = byRegion[x.regionId];
      if (!b || x.score > b.score) byRegion[x.regionId] = { score: x.score, basis: x.basis, theme: x.theme };
    }
    const regions = regionsById();
    const cells = grid.cells.map((c) => {
      if (!c.iso3) return [c.x, c.y, null, null, null, null];
      const v = byRegion[c.regionId];
      return [c.x, c.y, c.iso3, c.regionId, v ? v.score : null, v ? v.basis : null];
    });
    const labels = {};
    for (const [x, y, cIso] of cells) {
      if (!cIso) continue;
      const l = (labels[cIso] ??= { sx: 0, sy: 0, n: 0 });
      l.sx += x; l.sy += y; l.n++;
    }
    res.json({
      r: grid.r, bounds: grid.bounds,
      regionNames: Object.fromEntries(Object.values(regions).map((r) => [r.id, r.name])),
      regionBest: byRegion,
      cells,
      labels: Object.entries(labels).map(([k, l]) => ({ iso3: k, name: countries().find((c) => c.iso3 === k).name, x: l.sx / l.n, y: l.sy / l.n })),
    });
  });

  // Top needs per member: the member's three highest-scoring map themes
  router.get('/hotspots/topneeds', (req, res) => {
    const nat = nationalScores();
    const hs = allHotspots();
    res.json(countries().map((c) => {
      const scores = MAP_THEMES.map((t) => {
        const regional = hs.filter((x) => x.iso3 === c.iso3 && x.theme === t.id && x.basis !== 'national-indicator');
        const score = regional.length ? Math.max(...regional.map((x) => x.score)) : nat[c.iso3]?.[t.id]?.score ?? null;
        return { theme: t.id, label: t.label, score: score === null ? null : Math.round(score), regions: regional.filter((x) => x.tier !== 'low').length };
      }).filter((x) => x.score !== null).sort((a, b) => b.score - a.score);
      return { iso3: c.iso3, name: c.name, basis: c.feedback_source ? 'citizen-demand' : hs.some((x) => x.iso3 === c.iso3 && x.basis === 'regional-survey') ? 'regional-survey' : 'national-indicator', top: scores.slice(0, 3) };
    }));
  });
}
