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
