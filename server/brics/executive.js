// Endpoints behind the BRICS Executive Overview page.
import { THEMES, PROGRAMMES, PRIORITY_THRESHOLD, tierOf } from './themes.js';
import { buildHexGrid } from './hexgrid.js';

const PPI_BY_SECTOR = { water: 'ppi_water', energy: 'ppi_energy', transport: 'ppi_transport', digital: 'ppi_ict' };

/**
 * @param router express router mounted at /api/v2
 * @param h shared helpers from api.js
 */
export function registerExecutive(router, h) {
  const { getDb, memo, latestIndicators, countries, latestMonth, monthsBack, computeRecommendations, regionsById, NON_DEV_SQL } = h;

  const indicatorValues = (iso3) =>
    Object.fromEntries(Object.entries(latestIndicators()[iso3] || {}).map(([k, v]) => [k, v.value]));

  /** themeScores[iso3][themeId] = 0–100 need score */
  const themeScores = () => memo('themeScores', () => {
    const out = {};
    for (const c of countries()) {
      const vals = indicatorValues(c.iso3);
      out[c.iso3] = Object.fromEntries(THEMES.map((t) => {
        const s = t.score(vals);
        return [t.id, s === null ? null : Math.round(s)];
      }));
    }
    return out;
  });

  const themeSummary = () => memo('themeSummary', () => {
    const scores = themeScores();
    return THEMES.map((t) => {
      const ranked = countries()
        .map((c) => ({ iso3: c.iso3, name: c.name, score: scores[c.iso3][t.id] }))
        .filter((c) => c.score !== null)
        .sort((a, b) => b.score - a.score);
      const priority = ranked.filter((c) => c.score >= PRIORITY_THRESHOLD);
      return {
        id: t.id, label: t.label, sector: t.sector, icon: t.icon, color: t.color,
        priorityCount: priority.length, priorityCountries: priority, ranked,
      };
    }).sort((a, b) => b.priorityCount - a.priorityCount || b.ranked[0].score - a.ranked[0].score);
  });

  /** Citizen demand growth by sector: last `months` vs the `months` before (open citizen data only). */
  function demandGrowth(months) {
    const end = latestMonth();
    const from = monthsBack(end, months - 1);
    const prevFrom = monthsBack(end, 2 * months - 1);
    const rows = getDb().prepare(`
      SELECT sector, SUM(CASE WHEN month >= ? THEN n END) cur, SUM(CASE WHEN month < ? AND month >= ? THEN n END) prev
      FROM demand_monthly WHERE sector NOT IN ${NON_DEV_SQL} AND source != 'platform' GROUP BY sector`).all(from, from, prevFrom);
    return Object.fromEntries(rows.map((r) => [r.sector, { cur: r.cur || 0, prev: r.prev || 0, growth: r.prev ? (r.cur - r.prev) / r.prev : null }]));
  }

  function alignment() {
    const d = getDb();
    const end = latestMonth();
    const dem = d.prepare(`SELECT sector, SUM(n) n FROM demand_monthly WHERE month >= ? AND sector IN ('water','energy','transport','digital') GROUP BY sector`)
      .all(monthsBack(end, 59));
    const inv = d.prepare(`SELECT key, SUM(value) v FROM indicators WHERE iso3 = 'BRA' AND key LIKE 'ppi_%' AND year >= ? GROUP BY key`)
      .all(Number(end.slice(0, 4)) - 5);
    const dt = dem.reduce((s, r) => s + r.n, 0);
    const it = inv.reduce((s, r) => s + r.v, 0);
    return ['water', 'energy', 'transport', 'digital'].map((s) => {
      const demandShare = dt ? (dem.find((r) => r.sector === s)?.n || 0) / dt : 0;
      const investmentShare = it ? (inv.find((r) => r.key === PPI_BY_SECTOR[s])?.v || 0) / it : 0;
      const gap = demandShare - investmentShare;
      return { sector: s, demandShare, investmentShare, status: gap > 0.05 ? 'gap' : gap < -0.05 ? 'aligned' : 'review' };
    });
  }

  /** Share of member × indicator cells with an observation in the last 5 years. */
  function coverage(keys) {
    const minYear = Number(latestMonth().slice(0, 4)) - 5;
    const li = latestIndicators();
    const cells = countries().length * keys.length;
    let have = 0;
    for (const c of countries()) for (const k of keys) if (li[c.iso3]?.[k]?.year >= minYear) have++;
    return have / cells;
  }

  /** Mentor = low need now and the biggest improvement since ~2010 on the theme's headline indicator. */
  function improvement(iso3, theme) {
    const { key, better } = theme.headline;
    const rows = getDb().prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? ORDER BY year').all(iso3, key);
    if (rows.length < 2) return null;
    const base = rows.find((r) => r.year >= 2010) || rows[0];
    const last = rows.at(-1);
    if (last.year - base.year < 5) return null;
    const change = last.value - base.value;
    return { from: base, to: last, change, improved: better === 'up' ? change > 0 : change < 0, magnitude: Math.abs(change) / (Math.abs(base.value) || 1) };
  }

  function cooperation() {
    const summary = themeSummary();
    const shared = summary.filter((t) => t.priorityCount >= 3).slice(0, 3).map((t) => ({
      kind: 'shared', theme: t.id, label: t.label, icon: t.icon, color: t.color,
      countries: t.priorityCountries.slice(0, 3).map((c) => c.iso3),
      detail: `${t.priorityCount} members rank this a priority`,
    }));
    const exchanges = [];
    for (const t of summary) {
      const theme = THEMES.find((x) => x.id === t.id);
      const mentors = t.ranked
        .filter((c) => c.score < PRIORITY_THRESHOLD)
        .map((c) => ({ ...c, imp: improvement(c.iso3, theme) }))
        .filter((c) => c.imp?.improved)
        .sort((a, b) => b.imp.magnitude - a.imp.magnitude)
        .slice(0, 2);
      const learners = t.priorityCountries.slice(0, 2);
      if (!mentors.length || !learners.length) continue;
      exchanges.push({
        kind: 'exchange', theme: t.id, label: t.label, icon: t.icon, color: t.color,
        mentors: mentors.map((m) => m.iso3), learners: learners.map((l) => l.iso3),
        detail: `${mentors.map((m) => m.name).join(' & ')} improved on ${theme.headline.label} fastest since ${mentors[0].imp.from.year}`,
      });
    }
    return { shared, exchanges };
  }

  router.get('/executive', (req, res) => {
    const months = Math.min(Math.max(Number(req.query.months) || 12, 3), 36);
    const summary = themeSummary();
    const scores = themeScores();
    const recs = computeRecommendations({ country: null, sector: null });
    const growth = demandGrowth(months);
    const d = getDb();
    const feedbackRecords = d.prepare("SELECT SUM(n) n FROM demand_monthly WHERE source != 'platform'").get().n || 0;
    const indicatorObs = d.prepare('SELECT COUNT(*) c FROM indicators').get().c;
    const criticalRegions = new Set(recs.filter((r) => r.basis === 'citizen-demand' && r.score >= 70).map((r) => r.regionId));

    const risks = summary.map((t) => ({
      theme: t.id, label: t.label, sector: t.sector, icon: t.icon, color: t.color,
      growth: growth[t.sector]?.growth ?? null, requests: growth[t.sector]?.cur ?? 0,
      countriesAffected: t.priorityCount, countries: t.priorityCountries.map((c) => c.iso3),
    })).filter((r) => r.growth !== null).sort((a, b) => b.growth - a.growth);

    const snapshots = countries().map((c) => ({
      iso3: c.iso3, iso2: c.iso2, name: c.name,
      top: THEMES.map((t) => ({ theme: t.id, label: t.label, score: scores[c.iso3][t.id] }))
        .filter((x) => x.score !== null).sort((a, b) => b.score - a.score).slice(0, 3)
        .map((x) => ({ ...x, tier: tierOf(x.score) })),
    }));

    const top = summary[0];
    const health = summary.find((t) => t.id === 'health');
    const rising = risks[0];
    const coop = cooperation();
    const brief = [
      { theme: top.id, text: `${top.label} is a shared priority across ${top.priorityCount} of ${countries().length} members.` },
      { theme: 'health', text: `Healthcare access gaps remain significant in ${health.priorityCount} members, led by ${health.priorityCountries.slice(0, 2).map((c) => c.name).join(' and ')}.` },
      rising && { theme: rising.theme, text: `${rising.label} demand is ${rising.growth >= 0 ? 'up' : 'down'} ${Math.abs(rising.growth * 100).toFixed(0)}% in open citizen data over the last ${months} months.` },
      { theme: null, text: `${criticalRegions.size} critical hotspots need national-level review this month.` },
    ].filter(Boolean);

    res.json({
      window: { months, to: latestMonth() },
      kpis: {
        countries: countries().length,
        countriesWithFeedback: countries().filter((c) => c.feedback_source).length,
        criticalHotspots: criticalRegions.size,
        priorityProjects: recs.filter((r) => r.score >= 55).length,
        sharedGoals: summary.filter((t) => t.priorityCount >= Math.ceil(countries().length / 2)).length,
        recordsAnalysed: feedbackRecords + indicatorObs,
        feedbackRecords, indicatorObs,
      },
      brief,
      themes: summary.map(({ ranked, ...t }) => ({ ...t, scores: Object.fromEntries(ranked.map((r) => [r.iso3, r.score])) })),
      risks,
      snapshots,
      cooperation: coop,
      alignment: alignment(),
      confidence: [
        { id: 'feedback', label: 'Citizen feedback', value: countries().filter((c) => c.feedback_source).length / countries().length, note: 'Members publishing open record-level citizen requests' },
        { id: 'infra', label: 'Infrastructure indicators', value: coverage(['water_pct', 'sanitation_pct', 'electricity_pct', 'internet_pct', 'lpi_infra', 'hospital_beds']), note: 'Observed in the last 5 years' },
        { id: 'investment', label: 'Public investment data', value: coverage(['ppi_transport', 'ppi_energy', 'ppi_water', 'gfcf_pct_gdp']), note: 'PPI commitments and capital formation, last 5 years' },
        { id: 'demo', label: 'Demographic & socio-economic', value: coverage(['population', 'urban_pct', 'gdp_pc', 'poverty_pct', 'unemployment_pct', 'literacy_pct']), note: 'Observed in the last 5 years' },
      ],
    });
  });

  // How each member is doing on one theme: trend, investment and flagship programmes
  router.get('/themes/:id', (req, res) => {
    const theme = THEMES.find((t) => t.id === req.params.id);
    if (!theme) return res.status(404).json({ error: 'Unknown theme' });
    const d = getDb();
    const scores = themeScores();
    const ppiKey = PPI_BY_SECTOR[theme.sector];
    const maxYear = d.prepare('SELECT MAX(year) y FROM indicators').get().y;
    const rows = countries().map((c) => {
      const vals = indicatorValues(c.iso3);
      const series = d.prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? AND year >= 2005 ORDER BY year').all(c.iso3, theme.headline.key);
      const ppi = ppiKey ? d.prepare('SELECT SUM(value) v FROM indicators WHERE iso3 = ? AND key = ? AND year > ?').get(c.iso3, ppiKey, maxYear - 10).v : null;
      return {
        iso3: c.iso3, name: c.name, score: scores[c.iso3][theme.id], tier: tierOf(scores[c.iso3][theme.id]),
        summary: theme.describe(vals), improvement: improvement(c.iso3, theme), series,
        investment10y: ppi, programme: PROGRAMMES[theme.id]?.[c.iso3] || null,
      };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    res.json({
      theme: { id: theme.id, label: theme.label, sector: theme.sector, icon: theme.icon, color: theme.color, headline: theme.headline },
      ppiSector: ppiKey || null, rows,
    });
  });

  // Hex-bin hotspot map. Brazil hexes use regional citizen-demand priority scores;
  // other members use the national theme need score.
  router.get('/hexmap', (req, res) => {
    const sector = req.query.sector && req.query.sector !== 'all' ? String(req.query.sector) : null;
    const grid = memo('hexgrid', buildHexGrid);
    const scores = themeScores();
    const theme = sector ? THEMES.find((t) => t.sector === sector) : null;
    const nationalScore = (iso3) => {
      if (theme) return scores[iso3][theme.id];
      const top3 = Object.values(scores[iso3]).filter((v) => v !== null).sort((a, b) => b - a).slice(0, 3);
      return top3.length ? Math.round(top3.reduce((a, b) => a + b, 0) / top3.length) : null;
    };
    const regionScore = {};
    for (const r of computeRecommendations({ country: 'BRA', sector })) {
      if (r.regionId) regionScore[r.regionId] = Math.max(regionScore[r.regionId] ?? 0, r.score);
    }
    const hasFeedback = new Set(countries().filter((c) => c.feedback_source).map((c) => c.iso3));
    const regions = regionsById();
    const cells = grid.cells.map((c) => {
      if (!c.iso3) return [c.x, c.y, null, null, null];
      const score = hasFeedback.has(c.iso3) ? regionScore[c.regionId] ?? null : nationalScore(c.iso3);
      return [c.x, c.y, c.iso3, c.regionId, score];
    });
    // Label anchor = mean hex position; marker = highest-scoring hex per country
    const byCountry = {};
    for (const [x, y, iso3, regionId, score] of cells) {
      if (!iso3) continue;
      const b = (byCountry[iso3] ??= { sx: 0, sy: 0, n: 0, best: null });
      b.sx += x; b.sy += y; b.n++;
      if (score !== null && (!b.best || score > b.best.score)) b.best = { x, y, score, region: regions[regionId]?.name };
    }
    const labels = Object.entries(byCountry).map(([iso3, b]) => ({
      iso3, name: countries().find((c) => c.iso3 === iso3).name, x: b.sx / b.n, y: b.sy / b.n, hotspot: b.best,
    }));
    res.json({
      r: grid.r, bounds: grid.bounds, basis: hasFeedback.size ? 'mixed' : 'indicator', theme: theme?.label || null,
      regionNames: Object.fromEntries(Object.values(regions).map((r) => [r.id, r.name])), cells, labels,
    });
  });
}
