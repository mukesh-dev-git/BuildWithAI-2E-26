// Answers policymaker questions about the executive brief from the dashboard's own data.
// Uses Gemini when a key is configured (grounded on the same data), otherwise a
// deterministic matcher over themes, countries and hotspots.
import { apiGet } from './api';
import { answerPolicyQuestion, isApiKeyConfigured } from '../services/gemini';
import { COUNTRY_NAMES } from './components/Flag';

const THEME_WORDS = {
  water: /water|scarcity|sanitation|drinking|wash/i,
  health: /health|hospital|doctor|physician|mortality|clinic|medical/i,
  digital: /digital|internet|connectiv|broadband|online/i,
  transport: /transport|road|logistic|rail|bus|mobility/i,
  energy: /energy|electric|power|renewable|solar/i,
  education: /educat|school|literacy|learning/i,
  jobs: /job|employ|work|livelihood/i,
  air: /air|pollution|pm2|smog|climate/i,
};

const findTheme = (q) => Object.keys(THEME_WORDS).find((k) => THEME_WORDS[k].test(q)) || null;
const findCountries = (q) => Object.entries(COUNTRY_NAMES)
  // Names match any case; ISO codes only in capitals (so "are" isn't read as ARE)
  .filter(([iso3, name]) => new RegExp(`\\b${name}\\b`, 'i').test(q) || new RegExp(`\\b${iso3}\\b`).test(q) || (iso3 === 'ARE' && /\buae\b/i.test(q)))
  .map(([iso3]) => iso3);
const pct = (x) => `${(x * 100).toFixed(0)}%`;

async function ruleBased(question, exec) {
  const themeId = findTheme(question);
  const isos = findCountries(question);

  if (/hotspot|critical|urgent/i.test(question) && !themeId) {
    const { items } = await apiGet('/recommendations', { basis: 'citizen-demand', limit: 6 });
    return {
      text: `Hotspots are region × sector pairs scoring 70+ on the priority engine. The score combines citizen demand per capita and volume (45%), 6-month growth (20%), unresolved share (15%) and the national infrastructure gap (20%). ${exec.kpis.criticalHotspots} regions currently qualify. The strongest signals:`,
      bullets: items.map((r) => `${r.region} · ${r.sectorLabel}: score ${r.score}, ${r.requests12m?.toLocaleString()} requests in 12 months, ${r.per100k} per 100k residents, ${r.growth >= 0 ? '+' : ''}${pct(r.growth)} growth, ${pct(r.unresolved)} unresolved`),
      source: 'Priority engine over Fala.BR citizen records (Brazil) + World Bank indicators',
    };
  }

  if (themeId) {
    const t = await apiGet(`/themes/${themeId}`);
    const rows = isos.length ? t.rows.filter((r) => isos.includes(r.iso3)) : t.rows;
    const priority = rows.filter((r) => r.score >= 25);
    const compare = /compare|versus|vs\.?|differ|rank/i.test(question) || isos.length > 1;
    const list = compare ? rows : priority;
    return {
      text: compare
        ? `${t.theme.label}: need scores (0 = no gap, 100 = severe) for ${isos.length ? 'the members you named' : 'all members'}.`
        : priority.length
          ? `${priority.length} member${priority.length > 1 ? 's' : ''} rank ${t.theme.label.toLowerCase()} as a priority (need score 25+):`
          : `None of the members you named has ${t.theme.label.toLowerCase()} as a priority.`,
      bullets: list.map((r) => `${r.name}: score ${r.score ?? 'n/a'}, ${r.summary}${r.improvement ? `; ${t.theme.headline.label.toLowerCase()} ${r.improvement.change >= 0 ? '+' : ''}${r.improvement.change.toFixed(1)} since ${r.improvement.from.year}` : ''}`),
      source: `World Bank WDI, latest observation (${t.theme.headline.label})`,
      themeId,
    };
  }

  if (isos.length) {
    const snaps = exec.snapshots.filter((s) => isos.includes(s.iso3));
    return {
      text: 'Top observed development needs:',
      bullets: snaps.map((s) => `${s.name}: ${s.top.map((x) => `${x.label} (${x.score})`).join(', ')}`),
      source: 'World Bank WDI theme scores',
    };
  }

  return {
    text: "I can answer from this dashboard's data. Ask about a theme (water, healthcare, digital, transport, energy, education, jobs, air), a member country, or why hotspots are critical. Current brief:",
    bullets: exec.brief.map((b) => b.text),
    source: 'Executive brief',
  };
}

export async function askAssistant(question, exec) {
  const grounded = await ruleBased(question, exec);
  if (!isApiKeyConfigured()) return { ...grounded, engine: 'data' };
  try {
    const context = {
      brief: exec.brief.map((b) => b.text),
      themes: exec.themes.map((t) => ({ theme: t.label, priorityCountries: t.priorityCountries.map((c) => `${c.name} ${c.score}`) })),
      snapshots: exec.snapshots.map((s) => ({ country: s.name, top: s.top.map((x) => `${x.label} ${x.score}`) })),
      retrieved: { text: grounded.text, facts: grounded.bullets },
    };
    const text = await answerPolicyQuestion(question, context);
    return text ? { text, bullets: grounded.bullets, source: grounded.source, engine: 'gemini' } : { ...grounded, engine: 'data' };
  } catch {
    return { ...grounded, engine: 'data' };
  }
}

const BASIS_NOTE = { 'citizen-demand': 'citizen requests', 'regional-survey': 'regional survey', 'national-indicator': 'national estimate' };

/** Map-page questions: regional hotspots, growth, investment gaps and country approaches. */
async function mapRuleBased(question) {
  const themeId = findTheme(question) || (/nutrition|food|stunting|hunger/i.test(question) ? 'nutrition' : null);
  const isos = findCountries(question);

  if (/how is|how are|address|tackl|respond|programme|program|policy/i.test(question) && themeId && isos.length) {
    const t = await apiGet(`/themes/${themeId === 'nutrition' ? 'health' : themeId}`);
    const rows = t.rows.filter((r) => isos.includes(r.iso3));
    const hs = await apiGet('/hotspots/list', { country: isos[0], theme: themeId, size: 3 });
    return {
      text: `${t.theme.label} in ${rows.map((r) => r.name).join(' and ')}:`,
      bullets: [
        ...rows.map((r) => `${r.name}: need score ${r.score}, ${r.summary}${r.improvement ? `; ${t.theme.headline.label.toLowerCase()} ${r.improvement.change >= 0 ? '+' : ''}${r.improvement.change.toFixed(1)} since ${r.improvement.from.year}` : ''}.`),
        ...rows.map((r) => (r.programme ? `Flagship programme: ${r.programme}` : `No flagship programme is recorded for ${r.name} in this dashboard.`)),
        ...hs.items.map((x) => `Hotspot: ${x.region} (score ${x.score}, ${x.detail})`),
      ],
      source: 'World Bank WDI, DHS / Fala.BR regional data, curated programme list',
    };
  }

  if (/fast|rising|increas|grow|surg/i.test(question)) {
    const hs = await apiGet('/hotspots/list', { theme: themeId || 'all', basis: 'citizen-demand', sort: 'growth', size: 6 });
    return {
      text: `Fastest-growing citizen demand${themeId ? ` for ${hs.themes.find((t) => t.id === themeId)?.label.toLowerCase()}` : ''} (last 6 months vs the 6 before). Growth is only measurable where citizen requests are open, which today means Brazil:`,
      bullets: hs.items.map((x) => `${x.region}, ${x.themeLabel}: ${x.growth >= 0 ? '+' : ''}${(x.growth * 100).toFixed(0)}%, ${x.requests12m.toLocaleString()} requests in 12 months (score ${x.score})`),
      source: 'Fala.BR citizen requests via the priority engine',
    };
  }

  if (/low investment|under.?invest|mismatch|funding gap|invest/i.test(question)) {
    const exec = await apiGet('/executive', { months: 12 });
    const gaps = exec.alignment.filter((a) => a.status === 'gap');
    const sector = gaps[0]?.sector;
    const theme = { water: 'water', energy: 'energy', transport: 'transport', digital: 'digital' }[sector];
    const hs = theme ? await apiGet('/hotspots/list', { theme, basis: 'citizen-demand', size: 5 }) : { items: [] };
    return {
      text: gaps.length
        ? `Where citizen demand outruns infrastructure investment. In Brazil, ${gaps.map((g) => `${g.sector} takes ${(g.demandShare * 100).toFixed(0)}% of citizen requests but ${(g.investmentShare * 100).toFixed(0)}% of private-participation investment`).join('; ')}. The regions driving that demand:`
        : 'No sector currently shows citizen demand clearly ahead of investment.',
      bullets: hs.items.map((x) => `${x.region}: ${x.requests12m.toLocaleString()} requests, score ${x.score}`),
      source: 'Fala.BR (5 years) vs World Bank PPI; regional investment plans are not published openly',
    };
  }

  if (themeId) {
    const hs = await apiGet('/hotspots/list', { theme: themeId, country: isos[0] || 'ALL', size: 8 });
    return {
      text: `Regions with the most severe ${hs.themes.find((t) => t.id === themeId)?.label.toLowerCase()} need${isos[0] ? ` in ${COUNTRY_NAMES[isos[0]]}` : ' across BRICS'} (${hs.total} regions with regional data):`,
      bullets: hs.items.map((x) => `${x.region}, ${COUNTRY_NAMES[x.iso3]}: score ${x.score} (${x.tier}); ${x.detail} [${BASIS_NOTE[x.basis]}]`),
      source: 'DHS regional surveys and Fala.BR citizen requests',
      themeId,
    };
  }
  return null;
}

export async function askMap(question) {
  const grounded = await mapRuleBased(question);
  if (!grounded) {
    const exec = await apiGet('/executive', { months: 12 });
    return askAssistant(question, exec);
  }
  if (!isApiKeyConfigured()) return { ...grounded, engine: 'data' };
  try {
    const text = await answerPolicyQuestion(question, { retrieved: { text: grounded.text, facts: grounded.bullets } });
    return text ? { ...grounded, text, engine: 'gemini' } : { ...grounded, engine: 'data' };
  } catch {
    return { ...grounded, engine: 'data' };
  }
}

/** Recommendation-page questions: country actions, what a member can learn, who needs action. */
export async function askRecs(question) {
  const isos = findCountries(question);
  const themeId = findTheme(question);
  const recs = await apiGet('/recs/overview');
  let grounded = null;

  if (isos.length && /learn|study|borrow|adopt|copy|from others/i.test(question)) {
    const iso = isos[0];
    const t = recs.transfers.filter((x) => x.to === iso && (!themeId || x.theme === themeId));
    grounded = {
      text: t.length ? `${COUNTRY_NAMES[iso]} could learn from these members, matched on measured progress:` : `No knowledge-transfer match was found for ${COUNTRY_NAMES[iso]}${themeId ? ' on this theme' : ''}.`,
      bullets: t.map((x) => `${x.label}: ${COUNTRY_NAMES[x.from]} (${x.model}). ${x.match.problemNote}; context similarity ${x.match.context.toLowerCase()}, income similarity ${x.match.income.toLowerCase()}.`),
      source: 'World Bank WDI trends since 2010, curated programme list',
    };
  } else if (isos.length && !themeId) {
    const plan = recs.plans.find((p) => p.iso3 === isos[0]);
    grounded = {
      text: `Country actions for ${plan.name}, ranked by need:`,
      bullets: plan.top.map((x) => `${x.label} (need ${x.score}): ${x.action}${x.evidence.pilotRegions.length ? `. Start in ${x.evidence.pilotRegions.map((r) => r.name).join(', ')}` : ''}${x.learnFrom.length ? `. Learn from ${x.learnFrom.map((l) => COUNTRY_NAMES[l.iso3]).join(', ')}` : ''}.`),
      source: 'Country plan: regional surveys / citizen requests + World Bank indicators',
    };
  } else if (themeId && /need|which countries|who/i.test(question)) {
    const s = recs.shared.find((x) => x.theme === themeId);
    if (s) {
      grounded = {
        text: `${s.label} (${recs.types[s.type].label.toLowerCase()}, priority ${s.score}). Members needing action:`,
        bullets: [
          ...s.needCountries.map((c) => `${COUNTRY_NAMES[c]} needs action`),
          ...(s.mentorCountries.length ? [`Relevant experience: ${s.mentorCountries.map((c) => COUNTRY_NAMES[c]).join(', ')}`] : ['No member has yet shown the improvement needed to act as a model: a research opportunity.']),
          ...s.actions.map((a) => `Suggested BRICS action: ${a}`),
        ],
        source: 'World Bank WDI need scores (45+ = needs action)',
      };
    }
  }
  if (!grounded) return askMap(question);
  if (!isApiKeyConfigured()) return { ...grounded, engine: 'data' };
  try {
    const text = await answerPolicyQuestion(question, { retrieved: { text: grounded.text, facts: grounded.bullets } });
    return text ? { ...grounded, text, engine: 'gemini' } : { ...grounded, engine: 'data' };
  } catch {
    return { ...grounded, engine: 'data' };
  }
}
