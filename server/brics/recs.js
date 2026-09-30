// Recommendations: BRICS-level (shared goals) and country-level (national actions),
// linked by knowledge transfer — "who needs it, who has done it, what transfers".
import { THEMES, PROGRAMMES } from './themes.js';

const clamp = (x) => Math.max(0, Math.min(100, x));
const NEED = 45; // a member "needs action" on a theme at national need score >= 45
const MATURE = 25; // a member can share experience when its need is below 25 and it has improved

export const TYPES = {
  shared: { label: 'Shared challenge', note: 'Several members face the same problem' },
  joint: { label: 'Joint initiative', note: 'Two members could pilot a solution together' },
  transfer: { label: 'Knowledge transfer', note: 'Another member has relevant experience' },
  national: { label: 'National action', note: 'For one member only' },
  research: { label: 'Research opportunity', note: 'Shared problem no member has solved yet' },
};

export const STAGES = [
  ['reviewed', 'Reviewed'], ['matched', 'Country matched'], ['funding', 'Funding identified'],
  ['pilot', 'Pilot approved'], ['implementation', 'Implementation started'], ['impact', 'Impact measured'],
];

// Suggested cooperation actions per theme (curated starting points, not data outputs)
const BRICS_ACTIONS = {
  water: ['Share water-monitoring and leakage-detection practices', 'Compare drought-management and reuse models', 'Launch a BRICS water resilience knowledge exchange'],
  health: ['Exchange community and primary-care delivery models', 'Share telemedicine and mobile-clinic playbooks', 'Pool child-health outcome data for joint evaluation'],
  digital: ['Share rural broadband and backbone financing models', 'Exchange digital public infrastructure (ID, payments, e-services) designs', 'Joint programme on last-mile connectivity'],
  transport: ['Compare rural road and logistics corridor programmes', 'Share public-transport and freight modernisation practices', 'Joint benchmarking of infrastructure quality'],
  energy: ['Share renewable procurement and auction designs', 'Exchange off-grid and mini-grid electrification models', 'Joint research on grid integration of renewables'],
  education: ['Exchange school-financing and teacher-deployment models', 'Share foundational literacy programmes', 'Joint evaluation of learning outcomes'],
  jobs: ['Compare public employment and skills programmes', 'Share labour-market information systems', 'Joint youth-employment pilots'],
  air: ['Share air-quality monitoring networks and data standards', 'Compare city clean-air action plans', 'Joint research on pollution sources and health costs'],
};
const NATIONAL_ACTIONS = {
  water: 'Prioritise water-distribution upgrades, sanitation coverage and leakage monitoring',
  health: 'Expand primary-care access and child-health services where outcomes lag',
  digital: 'Extend last-mile connectivity and assisted access to online services',
  transport: 'Upgrade road and logistics infrastructure on the weakest corridors',
  energy: 'Close electricity-access gaps and accelerate renewable capacity',
  education: 'Target literacy and secondary-school completion in lagging regions',
  jobs: 'Scale employment and skills programmes for the highest-unemployment groups',
  air: 'Deploy air-quality monitoring and act on the largest pollution sources',
};
const PPI_KEY = { water: 'ppi_water', energy: 'ppi_energy', transport: 'ppi_transport', digital: 'ppi_ict' };

export function registerRecs(router, h) {
  const { getDb, memo, countries, latestIndicators, latestMonth } = h;

  const lifecycle = () => {
    const db = getDb();
    db.exec(`CREATE TABLE IF NOT EXISTS rec_lifecycle (
      rec_id TEXT NOT NULL, stage TEXT NOT NULL, done INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (rec_id, stage))`);
    const out = {};
    for (const r of db.prepare('SELECT rec_id, stage, done, updated_at FROM rec_lifecycle WHERE done = 1').all()) {
      (out[r.rec_id] ??= {})[r.stage] = r.updated_at;
    }
    return out;
  };

  const ind = (iso3, key) => latestIndicators()[iso3]?.[key]?.value ?? null;
  const name = (iso3) => countries().find((c) => c.iso3 === iso3)?.name || iso3;

  const series = (iso3, key) => memo(`series:${iso3}:${key}`, () =>
    getDb().prepare('SELECT year, value FROM indicators WHERE iso3 = ? AND key = ? ORDER BY year').all(iso3, key));

  function improvement(iso3, theme) {
    const rows = series(iso3, theme.headline.key);
    if (rows.length < 2) return null;
    const base = rows.find((r) => r.year >= 2010) || rows[0];
    const last = rows.at(-1);
    if (last.year - base.year < 5) return null;
    const change = last.value - base.value;
    return { from: base, to: last, change, improved: theme.headline.better === 'up' ? change > 0 : change < 0, magnitude: Math.abs(change) / (Math.abs(base.value) || 1) };
  }

  const level = (x, hi, mid) => (x === null ? 'Unknown' : x <= hi ? 'High' : x <= mid ? 'Medium' : 'Low');

  /** Why mentor M suits learner L on theme T — computed, not asserted. */
  function matchReason(theme, m, l) {
    const key = theme.headline.key;
    const target = ind(l, key);
    const hist = series(m, key);
    let baseline = null;
    if (target !== null && hist.length) {
      const best = hist.reduce((b, r) => (Math.abs(r.value - target) < Math.abs(b.value - target) ? r : b), hist[0]);
      if (Math.abs(best.value - target) <= Math.max(3, Math.abs(target) * 0.1) && best.year < hist.at(-1).year) baseline = best;
    }
    const rural = ind(m, 'rural_pct') !== null && ind(l, 'rural_pct') !== null ? Math.abs(ind(m, 'rural_pct') - ind(l, 'rural_pct')) : null;
    const gm = ind(m, 'gdp_pc');
    const gl = ind(l, 'gdp_pc');
    const income = gm && gl ? Math.max(gm, gl) / Math.min(gm, gl) : null;
    const imp = improvement(m, theme);
    return {
      problem: baseline ? 'High' : 'Medium',
      problemNote: baseline
        ? `${name(m)} was at ${name(l)}'s current level (${target.toFixed(1)}) in ${baseline.year}`
        : `${name(m)}'s trajectory doesn't pass through ${name(l)}'s current level`,
      context: level(rural, 15, 30),
      contextNote: rural === null ? 'Rural share unknown' : `Rural population differs by ${rural.toFixed(0)} points`,
      income: level(income, 2, 4),
      incomeNote: income === null ? 'Income unknown' : `GDP per capita differs ${income.toFixed(1)}×`,
      maturity: imp?.improved && PROGRAMMES[theme.id]?.[m] ? 'High' : imp?.improved ? 'Medium' : 'Low',
      evidence: imp ? `Available: ${theme.headline.label.toLowerCase()} ${imp.change >= 0 ? '+' : ''}${imp.change.toFixed(1)} since ${imp.from.year}` : 'Limited',
    };
  }

  const build = () => memo('recs', () => {
    const nat = h.nationalScores();
    const hs = h.allHotspots();
    const ppi = h.nationalPpi();
    const cs = countries();
    const pop = Object.fromEntries(cs.map((c) => [c.iso3, ind(c.iso3, 'population') || 0]));
    const totalPop = Object.values(pop).reduce((a, b) => a + b, 0);
    const shared = [];
    const transfers = [];

    for (const t of THEMES) {
      const scored = cs.map((c) => ({ iso3: c.iso3, score: nat[c.iso3]?.[t.id]?.score })).filter((x) => x.score !== null && x.score !== undefined);
      const needs = scored.filter((x) => x.score >= NEED).sort((a, b) => b.score - a.score);
      if (!needs.length) continue;
      const mentors = scored.filter((x) => x.score < MATURE)
        .map((x) => ({ ...x, imp: improvement(x.iso3, t) }))
        .filter((x) => x.imp?.improved)
        .sort((a, b) => b.imp.magnitude - a.imp.magnitude).slice(0, 3);
      const type = needs.length >= 3 ? (mentors.length ? 'shared' : 'research') : needs.length === 2 ? 'joint' : mentors.length ? 'transfer' : 'national';

      const needIsos = needs.map((x) => x.iso3);
      const regional = hs.filter((x) => x.theme === t.id && needIsos.includes(x.iso3) && x.basis !== 'national-indicator');
      const demand = regional.length ? Math.max(...regional.map((x) => x.score)) : null;
      const gap = needs.reduce((s, x) => s + x.score, 0) / needs.length;
      const popShare = needIsos.reduce((s, i) => s + pop[i], 0) / totalPop;
      let mismatch = null;
      if (PPI_KEY[t.id]) {
        const perCap = (isos) => isos.reduce((s, i) => s + (ppi[i]?.[PPI_KEY[t.id]] || 0), 0) / isos.reduce((s, i) => s + pop[i], 0);
        const all = perCap(cs.map((c) => c.iso3));
        if (all > 0) mismatch = clamp((1 - Math.min(perCap(needIsos) / all, 1)) * 100);
      }
      const components = {
        demand: demand === null ? null : Math.round(demand),
        gap: Math.round(gap),
        population: Math.round(clamp((popShare / 0.6) * 100)),
        mismatch: mismatch === null ? null : Math.round(mismatch),
      };
      const w = { demand: 0.3, gap: 0.3, population: 0.2, mismatch: 0.2 };
      const used = Object.entries(components).filter(([, v]) => v !== null);
      const score = Math.round(used.reduce((s, [k, v]) => s + w[k] * v, 0) / used.reduce((s, [k]) => s + w[k], 0));

      const implementations = [
        ...mentors.map((m) => ({ iso3: m.iso3, role: 'mentor', status: 'Mature model', text: PROGRAMMES[t.id]?.[m.iso3] || `${t.headline.label} ${m.imp.change >= 0 ? '+' : ''}${m.imp.change.toFixed(1)} since ${m.imp.from.year}` })),
        ...needs.map((n) => ({ iso3: n.iso3, role: 'need', status: PROGRAMMES[t.id]?.[n.iso3] ? 'Active' : 'Needs support', text: PROGRAMMES[t.id]?.[n.iso3] || 'No flagship programme recorded; needs region-level adaptation' })),
      ];

      shared.push({
        id: `shared:${t.id}`, theme: t.id, label: t.label, icon: t.icon, color: t.color, sector: t.sector, type,
        needCountries: needIsos, mentorCountries: mentors.map((m) => m.iso3), score, components,
        // Short plain-language reason, strongest signals first
        why: [
          demand !== null && demand >= 70 ? 'High regional need' : null,
          gap >= 60 ? (['jobs', 'air'].includes(t.id) ? 'wide gaps' : 'infrastructure gaps') : gap >= NEED ? 'persistent gaps' : null,
          mismatch !== null && mismatch > 40 ? 'low investment' : null,
          popShare >= 0.3 ? 'large population affected' : null,
        ].filter(Boolean).slice(0, 2).join(' + ').replace(/^./, (c) => c.toUpperCase()),
        actions: BRICS_ACTIONS[t.id] || [], implementations,
        populationShare: popShare,
      });

      for (const m of mentors.slice(0, 2)) {
        for (const l of needs.slice(0, 2)) {
          transfers.push({
            id: `transfer:${m.iso3}:${l.iso3}:${t.id}`, theme: t.id, label: t.label, icon: t.icon, color: t.color,
            from: m.iso3, to: l.iso3, need: l.score,
            model: PROGRAMMES[t.id]?.[m.iso3]?.split(':')[0] || `${t.headline.label} improvement`,
            match: matchReason(t, m.iso3, l.iso3),
          });
        }
      }
    }
    shared.sort((a, b) => b.score - a.score);
    transfers.sort((a, b) => b.need - a.need);

    // Country-level: each member's most severe needs, with pilot regions and who to learn from
    const plans = cs.map((c) => {
      const items = THEMES.map((t) => {
        const regional = hs.filter((x) => x.iso3 === c.iso3 && x.theme === t.id && x.basis !== 'national-indicator').sort((a, b) => b.score - a.score);
        const national = nat[c.iso3]?.[t.id]?.score ?? null;
        const score = regional.length ? Math.max(regional[0].score, national ?? 0) : national;
        if (score === null) return null;
        const imp = improvement(c.iso3, t);
        const learn = transfers.filter((x) => x.to === c.iso3 && x.theme === t.id).map((x) => ({ iso3: x.from, model: x.model }));
        const fallback = learn.length ? [] : (shared.find((s) => s.theme === t.id)?.mentorCountries || []).map((m) => ({ iso3: m, model: PROGRAMMES[t.id]?.[m]?.split(':')[0] || `${t.headline.label} improvement` }));
        return {
          id: `country:${c.iso3}:${t.id}`, iso3: c.iso3, theme: t.id, label: t.label, icon: t.icon, color: t.color, type: 'national', score: Math.round(score),
          action: NATIONAL_ACTIONS[t.id],
          evidence: {
            basis: regional[0]?.basis || 'national-indicator',
            regionsAffected: regional.filter((x) => x.tier !== 'low').length,
            regionsMeasured: regional.length,
            pilotRegions: regional.slice(0, 3).map((x) => ({ name: x.region, score: x.score, detail: x.detail })),
            requests12m: regional.reduce((s, x) => s + (x.requests12m || 0), 0) || null,
            nationalScore: national === null ? null : Math.round(national),
            nationalText: nat[c.iso3]?.[t.id]?.text,
            investment: PPI_KEY[t.id] ? ppi[c.iso3]?.[PPI_KEY[t.id]] ?? null : null,
            trend: imp ? { change: imp.change, since: imp.from.year, improving: imp.improved } : null,
          },
          programme: PROGRAMMES[t.id]?.[c.iso3] || null,
          learnFrom: [...learn, ...fallback].filter((x) => x.iso3 !== c.iso3).slice(0, 3),
        };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      return { iso3: c.iso3, name: c.name, top: items.slice(0, 3), all: items };
    });

    return { shared, transfers, plans };
  });

  const coverage = (keys) => {
    const minYear = Number(latestMonth().slice(0, 4)) - 5;
    const li = latestIndicators();
    let have = 0;
    for (const c of countries()) for (const k of keys) if (li[c.iso3]?.[k]?.year >= minYear) have++;
    return have / (countries().length * keys.length);
  };

  h.recsBuild = build;
  h.improvement = improvement;

  router.get('/recs/overview', (req, res) => {
    const { shared, transfers, plans } = build();
    const life = lifecycle();
    const withLife = (r) => ({ ...r, lifecycle: life[r.id] || {} });
    const all = [...shared, ...plans.flatMap((p) => p.top), ...transfers];
    const tracked = all.filter((r) => life[r.id]);
    res.json({
      stages: STAGES, types: TYPES,
      kpis: {
        sharedPriorities: shared.filter((s) => s.type !== 'national').length,
        countryPlans: plans.length,
        transferMatches: transfers.length,
        transferLearners: new Set(transfers.map((t) => t.to)).size,
        tracked: all.length,
        inProgress: tracked.length,
      },
      shared: shared.map(withLife),
      transfers: transfers.map(withLife),
      plans: plans.map((p) => ({ ...p, top: p.top.map(withLife), all: p.all.map(withLife) })),
      tracker: all.filter((r) => life[r.id]).map((r) => {
        const done = STAGES.filter(([k]) => life[r.id][k]);
        return { id: r.id, label: r.label, icon: r.icon, color: r.color, iso3: r.iso3 || null, from: r.from || null, to: r.to || null, stage: done.at(-1)?.[1], progress: done.length / STAGES.length };
      }),
      confidence: [
        {
          // Members with citizen requests count fully, members with regional surveys count half
          id: 'feedback', label: 'Citizen & regional data',
          value: countries().reduce((sum, c) => {
            const b = new Set(h.allHotspots().filter((x) => x.iso3 === c.iso3).map((x) => x.basis));
            return sum + (b.has('citizen-demand') ? 1 : b.has('regional-survey') ? 0.5 : 0);
          }, 0) / countries().length,
        },
        { id: 'infra', label: 'Infrastructure indicators', value: coverage(['water_pct', 'sanitation_pct', 'electricity_pct', 'internet_pct', 'lpi_infra', 'hospital_beds']) },
        { id: 'investment', label: 'Public investment data', value: coverage(['ppi_transport', 'ppi_energy', 'ppi_water', 'gfcf_pct_gdp']) },
        { id: 'demo', label: 'Demographic data', value: coverage(['population', 'urban_pct', 'gdp_pc', 'poverty_pct', 'unemployment_pct', 'literacy_pct']) },
      ],
    });
  });

  router.post('/recs/lifecycle', (req, res) => {
    const { recId, stage, done } = req.body || {};
    if (!recId || !STAGES.some(([k]) => k === stage)) return res.status(400).json({ error: 'recId and a valid stage are required' });
    lifecycle();
    getDb().prepare(`INSERT INTO rec_lifecycle VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT (rec_id, stage) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`).run(recId, stage, done ? 1 : 0);
    res.json({ recId, stage, done: !!done });
  });

  // "Adapt this solution to my country": context check between the source model and the target member
  router.get('/recs/adapt', (req, res) => {
    const t = THEMES.find((x) => x.id === req.query.theme);
    const from = String(req.query.from || '');
    const to = String(req.query.to || '');
    if (!t || !countries().some((c) => c.iso3 === from) || !countries().some((c) => c.iso3 === to)) return res.status(400).json({ error: 'theme, from and to are required' });
    const rows = [
      ['population', 'Population', 'people'], ['rural_pct', 'Rural population', '%'], ['gdp_pc', 'GDP per capita', 'US$'],
      [t.headline.key, t.headline.label, t.headline.unit], ['internet_pct', 'Internet users', '%'], ['electricity_pct', 'Electricity access', '%'],
      ['physicians', 'Physicians', 'per 1,000'], ['health_exp_gdp', 'Health spending', '% of GDP'],
    ].filter((r, i, arr) => arr.findIndex((x) => x[0] === r[0]) === i).map(([key, label, unit]) => ({ key, label, unit, from: ind(from, key), to: ind(to, key) }));

    const considerations = [];
    const v = Object.fromEntries(rows.map((r) => [r.key, r]));
    if (v.rural_pct?.to !== null && v.rural_pct?.from !== null && v.rural_pct.to - v.rural_pct.from > 15) considerations.push(`${name(to)} is more rural (${v.rural_pct.to.toFixed(0)}% vs ${v.rural_pct.from.toFixed(0)}%): favour outreach, mobile and decentralised delivery.`);
    if (v.internet_pct?.to !== null && v.internet_pct?.from !== null && v.internet_pct.from - v.internet_pct.to > 15) considerations.push(`Lower internet use (${v.internet_pct.to.toFixed(0)}% vs ${v.internet_pct.from.toFixed(0)}%): plan offline or assisted channels.`);
    if (v.gdp_pc?.to && v.gdp_pc?.from && v.gdp_pc.from / v.gdp_pc.to > 2) considerations.push(`Income is ${(v.gdp_pc.from / v.gdp_pc.to).toFixed(1)}× lower: design for lower unit cost or blended finance.`);
    if (v.electricity_pct?.to !== null && v.electricity_pct?.to < 90) considerations.push(`Only ${v.electricity_pct.to.toFixed(0)}% electricity access: solutions needing grid power need an off-grid variant.`);
    if (v.physicians?.to !== null && v.physicians?.from !== null && t.id === 'health' && v.physicians.to < v.physicians.from / 2) considerations.push(`Far fewer physicians (${v.physicians.to.toFixed(1)} vs ${v.physicians.from.toFixed(1)} per 1,000): lean on community health workers.`);
    if (!considerations.length) considerations.push('Context is broadly comparable on the indicators available; validate costs and institutions locally.');

    const pilots = h.allHotspots().filter((x) => x.iso3 === to && x.theme === t.id && x.basis !== 'national-indicator').sort((a, b) => b.score - a.score).slice(0, 4);
    const model = PROGRAMMES[t.id]?.[from] || null;
    res.json({
      theme: { id: t.id, label: t.label, icon: t.icon, color: t.color },
      from: { iso3: from, name: name(from), model }, to: { iso3: to, name: name(to), programme: PROGRAMMES[t.id]?.[to] || null },
      match: matchReason(t, from, to), context: rows, considerations,
      pilots: pilots.map((x) => ({ region: x.region, score: x.score, detail: x.detail, source: x.source })),
      recommendation: pilots.length
        ? `Pilot ${model ? model.split(':')[0] : `${name(from)}'s approach`} in ${pilots.slice(0, 3).map((x) => x.region).join(', ')}, where ${t.label.toLowerCase()} need is highest, then scale on measured results.`
        : `Pilot ${model ? model.split(':')[0] : `${name(from)}'s approach`} nationally in ${name(to)}; no regional data is available to target specific regions.`,
    });
  });
}
