// Shared Goal Tracker: per-member implementation milestones for each shared goal.
// Milestones are derived from open data where a fair proxy exists, and otherwise
// come only from status updates people record in the dashboard — never inferred.
import { THEMES, PROGRAMMES, PRIORITY_THRESHOLD } from './themes.js';

export const MILESTONES = [
  { id: 'need', label: 'Need identified', auto: 'World Bank / regional need score' },
  { id: 'strategy', label: 'Strategy approved', auto: 'Flagship programme on record' },
  { id: 'funding', label: 'Funding secured', auto: 'Infrastructure investment (World Bank PPI)' },
  { id: 'pilot', label: 'Pilot launched', auto: null },
  { id: 'full', label: 'Full implementation', auto: null },
  { id: 'impact', label: 'Impact measured', auto: 'Headline indicator improved since the programme began' },
];
const STATUSES = ['done', 'in_progress', 'not_started', 'na'];
const REGION_STATUSES = { not_started: 0, planned: 20, in_progress: 50, completed: 100 };
const PPI_KEY = { water: 'ppi_water', energy: 'ppi_energy', transport: 'ppi_transport', digital: 'ppi_ict' };
const GOAL_BLURB = {
  water: 'Safe, sustainable and resilient water and sanitation for all',
  health: 'Accessible primary health care and better child-health outcomes',
  digital: 'Affordable connectivity and access to online public services',
  transport: 'Reliable roads, logistics and public transport',
  energy: 'Universal electricity access with a growing renewable share',
  education: 'Literacy and secondary schooling for every region',
  jobs: 'More and better jobs, especially for young people',
  air: 'Cleaner air within WHO guideline levels',
};

// Which part of a region's measured gap to act on first (from DHS / Fala.BR values)
function keyAction(theme, ind, hotspot) {
  if (hotspot.basis === 'citizen-demand') return `Respond to ${hotspot.requests12m?.toLocaleString('en')} citizen requests`;
  if (!ind) return 'National programme roll-out';
  const pick = (a, b) => (a[1] <= b[1] ? a : b);
  switch (theme) {
    case 'water': {
      const [k, v] = pick(['Safe water access', ind.water_improved ?? 100], ['Sanitation coverage', ind.sanitation_improved ?? 100]);
      return `${k} (${Math.round(v)}% today)`;
    }
    case 'health': return (ind.vaccination_basic ?? 100) < 70 ? `Child vaccination (${Math.round(ind.vaccination_basic)}% today)` : `Child survival (under-5 mortality ${Math.round(ind.u5_mortality)})`;
    case 'energy': return `Household electricity (${Math.round(ind.electricity)}% today)`;
    case 'education': return `Female literacy (${Math.round(ind.literacy_women)}% today)`;
    case 'digital': return `Mobile access (${Math.round(ind.mobile_phone)}% of households)`;
    default: return 'Regional programme roll-out';
  }
}

export function registerGoals(router, h) {
  const { getDb, countries, latestIndicators } = h;

  const tables = () => {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_milestones (
        iso3 TEXT NOT NULL, theme TEXT NOT NULL, milestone TEXT NOT NULL, status TEXT NOT NULL,
        date TEXT, note TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (iso3, theme, milestone));
      CREATE TABLE IF NOT EXISTS goal_regions (
        iso3 TEXT NOT NULL, theme TEXT NOT NULL, region_id TEXT NOT NULL, status TEXT NOT NULL,
        note TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (iso3, theme, region_id));`);
    return db;
  };

  const reported = (theme) => {
    const out = {};
    for (const r of tables().prepare('SELECT * FROM goal_milestones WHERE theme = ?').all(theme)) {
      (out[r.iso3] ??= {})[r.milestone] = r;
    }
    return out;
  };

  const ppiSeries = (iso3, key) => getDb().prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? ORDER BY year').all(iso3, key);

  /** Milestones for one member and goal: reported status wins, else a data-derived default. */
  function milestonesFor(iso3, theme, rep) {
    const t = THEMES.find((x) => x.id === theme);
    const nat = h.nationalScores()[iso3]?.[theme];
    const regional = h.allHotspots().filter((x) => x.iso3 === iso3 && x.theme === theme && x.basis !== 'national-indicator');
    const regionalMax = regional.length ? Math.max(...regional.map((x) => x.score)) : null;
    const needScore = Math.round(Math.max(nat?.score ?? 0, regionalMax ?? 0));
    const inScope = needScore >= PRIORITY_THRESHOLD;
    const prog = PROGRAMMES[theme]?.[iso3] || null;
    const progYear = prog ? Number(prog.match(/\((\d{4})\)/)?.[1]) || null : null;
    const lastYear = Math.max(...Object.values(latestIndicators()[iso3] || {}).map((v) => v.year), 0);

    const derived = {};
    derived.need = inScope
      ? { status: 'done', date: String(lastYear), source: 'data', evidence: `Need score ${needScore}${regionalMax !== null ? ` (regional peak ${Math.round(regionalMax)})` : ''}: ${nat?.text || ''}` }
      : { status: 'na', source: 'data', evidence: `Need score ${needScore}, below the ${PRIORITY_THRESHOLD} priority line` };
    derived.strategy = prog
      ? { status: 'done', date: progYear ? String(progYear) : null, source: 'curated', evidence: prog }
      : { status: 'not_started', source: 'none', evidence: 'No flagship programme on record' };
    if (PPI_KEY[theme]) {
      const s = ppiSeries(iso3, PPI_KEY[theme]).filter((r) => r.year >= lastYear - 10 && r.value > 0);
      const total = s.reduce((a, r) => a + r.value, 0);
      derived.funding = s.length
        ? { status: 'done', date: String(s.at(-1).year), source: 'data', evidence: `US$${(total / 1e9).toFixed(2)}B private-participation investment, ${s[0].year}–${s.at(-1).year}` }
        : { status: 'not_started', source: 'data', evidence: 'No infrastructure investment recorded in 10 years' };
    } else {
      derived.funding = { status: 'not_started', source: 'none', evidence: 'No open investment data for this goal. Update when funding is confirmed' };
    }
    derived.pilot = { status: 'not_started', source: 'none', evidence: 'Not reported yet' };
    derived.full = { status: 'not_started', source: 'none', evidence: 'Not reported yet' };
    const imp = h.improvement(iso3, t);
    const since = progYear || 2010;
    const series = getDb().prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? ORDER BY year').all(iso3, t.headline.key);
    const base = series.find((r) => r.year >= since);
    const last = series.at(-1);
    const improved = base && last && last.year > base.year && (t.headline.better === 'up' ? last.value > base.value : last.value < base.value);
    derived.impact = improved
      ? { status: 'done', date: String(last.year), source: 'data', evidence: `${t.headline.label} ${base.value.toFixed(1)} → ${last.value.toFixed(1)} (${base.year}–${last.year}). An outcome trend, not proof of attribution` }
      : imp ? { status: 'not_started', source: 'data', evidence: `${t.headline.label} has not improved since ${since}` } : { status: 'not_started', source: 'none', evidence: 'No outcome series' };

    const ms = MILESTONES.map((m) => {
      const r = rep?.[m.id];
      return r
        ? { id: m.id, label: m.label, status: r.status, date: r.date, source: 'reported', evidence: r.note || 'Status reported in the dashboard', updatedAt: r.updated_at, derived: derived[m.id] }
        : { id: m.id, label: m.label, ...derived[m.id] };
    });
    const applicable = ms.filter((m) => m.status !== 'na');
    const progress = applicable.length ? applicable.reduce((s, m) => s + (m.status === 'done' ? 1 : m.status === 'in_progress' ? 0.5 : 0), 0) / MILESTONES.length : 0;
    const done = ms.filter((m) => m.status === 'done').length;
    const state = !inScope && !rep ? 'na' : done === MILESTONES.length ? 'completed' : ms.some((m) => m.status === 'done' && m.id !== 'need') || ms.some((m) => m.status === 'in_progress') ? 'in_progress' : 'not_started';
    return { needScore, inScope, milestones: ms, progress, done, state, programme: prog, regionalCount: regional.length };
  }

  const regionRows = (iso3, theme) => {
    const reps = Object.fromEntries(tables().prepare('SELECT * FROM goal_regions WHERE iso3 = ? AND theme = ?').all(iso3, theme).map((r) => [r.region_id, r]));
    const ind = h.regionalIndicators();
    return h.allHotspots()
      .filter((x) => x.iso3 === iso3 && x.theme === theme && x.basis !== 'national-indicator')
      .sort((a, b) => b.score - a.score)
      .map((x) => {
        const r = reps[x.regionId];
        const status = r?.status || 'not_started';
        return {
          regionId: x.regionId, region: x.region, score: x.score, tier: x.tier, detail: x.detail, source: x.source,
          action: keyAction(theme, ind[x.regionId], x), status, progress: REGION_STATUSES[status], note: r?.note || null, updatedAt: r?.updated_at || null,
        };
      });
  };

  const goalInfo = (t) => ({ id: t.id, label: t.label, icon: t.icon, color: t.color, sector: t.sector, blurb: GOAL_BLURB[t.id], headline: t.headline });

  router.get('/goals/overview', (req, res) => {
    const t = THEMES.find((x) => x.id === (req.query.goal || 'water'));
    if (!t) return res.status(400).json({ error: 'Unknown goal' });
    const rep = reported(t.id);
    const rows = countries().map((c) => ({ iso3: c.iso3, name: c.name, ...milestonesFor(c.iso3, t.id, rep[c.iso3]) }))
      .sort((a, b) => Number(b.inScope) - Number(a.inScope) || b.progress - a.progress || b.needScore - a.needScore);
    const scope = rows.filter((r) => r.inScope || r.state !== 'na');
    const regionsCovered = scope.reduce((s, r) => s + h.allHotspots().filter((x) => x.iso3 === r.iso3 && x.theme === t.id && x.basis !== 'national-indicator' && x.tier !== 'low').length, 0);
    const pipeline = THEMES.map((g) => {
      const r = reported(g.id);
      const ms = countries().map((c) => ({ iso3: c.iso3, ...milestonesFor(c.iso3, g.id, r[c.iso3]) }));
      return { ...goalInfo(g), inScope: ms.filter((m) => m.inScope).map((m) => m.iso3), total: ms.length, avgProgress: ms.filter((m) => m.inScope).reduce((s, m) => s + m.progress, 0) / Math.max(1, ms.filter((m) => m.inScope).length) };
    }).sort((a, b) => b.inScope.length - a.inScope.length);
    const lastUpdate = getDb().prepare('SELECT MAX(updated_at) u FROM goal_milestones').get().u;
    res.json({
      goal: goalInfo(t), milestones: MILESTONES, countries: rows,
      kpis: {
        inScope: scope.length,
        completed: scope.filter((r) => r.state === 'completed').length,
        inProgress: scope.filter((r) => r.state === 'in_progress').length,
        notStarted: scope.filter((r) => r.state === 'not_started').length,
        regionsCovered,
      },
      pipeline,
      lastUpdate,
      goals: THEMES.map(goalInfo),
    });
  });

  router.get('/goals/country/:iso3/:goal', (req, res) => {
    const t = THEMES.find((x) => x.id === req.params.goal);
    const c = countries().find((x) => x.iso3 === req.params.iso3);
    if (!t || !c) return res.status(404).json({ error: 'Unknown member or goal' });
    const rep = reported(t.id);
    const me = milestonesFor(c.iso3, t.id, rep[c.iso3]);
    const regions = regionRows(c.iso3, t.id);
    const others = countries().map((x) => ({ iso3: x.iso3, name: x.name, ...milestonesFor(x.iso3, t.id, rep[x.iso3]) }))
      .sort((a, b) => (a.iso3 === c.iso3 ? -1 : b.iso3 === c.iso3 ? 1 : Number(b.inScope) - Number(a.inScope) || b.progress - a.progress));
    const learn = (h.recsBuild().transfers || []).filter((x) => x.to === c.iso3 && x.theme === t.id);
    const mentors = learn.length ? learn : (h.recsBuild().shared.find((s) => s.theme === t.id)?.mentorCountries || [])
      .filter((m) => m !== c.iso3).map((m) => ({ from: m, model: PROGRAMMES[t.id]?.[m]?.split(':')[0] || `${t.headline.label} improvement` }));
    const reportedDates = Object.values(rep[c.iso3] || {}).map((r) => r.updated_at).sort();
    const lastUpdated = reportedDates.at(-1) || null;
    const nextReview = lastUpdated ? new Date(new Date(`${lastUpdated.replace(' ', 'T')}Z`).getTime() + 182 * 864e5).toISOString().slice(0, 10) : null;
    const ppi = PPI_KEY[t.id] ? ppiSeries(c.iso3, PPI_KEY[t.id]).filter((r) => r.year >= 2010) : [];
    const outcome = getDb().prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? AND year >= 2005 ORDER BY year').all(c.iso3, t.headline.key);
    res.json({
      goal: goalInfo(t), country: { iso3: c.iso3, name: c.name }, milestones: MILESTONES, ...me,
      regions, regionsCovered: regions.filter((r) => r.status !== 'not_started').length,
      regionsNeeding: regions.filter((r) => r.tier !== 'low').length,
      others, learn: mentors.slice(0, 3).map((m) => ({ iso3: m.from, model: m.model, programme: PROGRAMMES[t.id]?.[m.from] || null, match: m.match || null })),
      investments: ppi, outcome, lastUpdated, nextReview,
    });
  });

  router.post('/goals/milestone', (req, res) => {
    const { iso3, goal, milestone, status, date, note, reset } = req.body || {};
    if (!countries().some((c) => c.iso3 === iso3) || !THEMES.some((t) => t.id === goal) || !MILESTONES.some((m) => m.id === milestone)) {
      return res.status(400).json({ error: 'iso3, goal and milestone are required' });
    }
    const db = tables();
    if (reset) {
      db.prepare('DELETE FROM goal_milestones WHERE iso3 = ? AND theme = ? AND milestone = ?').run(iso3, goal, milestone);
      return res.json({ ok: true, reset: true });
    }
    if (!STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of ${STATUSES.join(', ')}` });
    db.prepare(`INSERT INTO goal_milestones VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (iso3, theme, milestone) DO UPDATE SET status = excluded.status, date = excluded.date, note = excluded.note, updated_at = excluded.updated_at`)
      .run(iso3, goal, milestone, status, date ? String(date).slice(0, 10) : null, note ? String(note).slice(0, 500) : null);
    res.json({ ok: true });
  });

  router.post('/goals/region', (req, res) => {
    const { iso3, goal, regionId, status, note } = req.body || {};
    if (!(status in REGION_STATUSES) || !h.allHotspots().some((x) => x.regionId === regionId && x.iso3 === iso3 && x.theme === goal)) {
      return res.status(400).json({ error: 'Unknown region or status' });
    }
    tables().prepare(`INSERT INTO goal_regions VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (iso3, theme, region_id) DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = excluded.updated_at`)
      .run(iso3, goal, regionId, status, note ? String(note).slice(0, 500) : null);
    res.json({ ok: true });
  });
}
