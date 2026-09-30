// Cross-country development themes scored from World Bank indicators.
// Each theme turns the latest indicator values into a 0–100 need score
// (0 = no gap, 100 = severe). A theme is a "priority" for a country at >= 25.

const clamp = (x) => Math.max(0, Math.min(100, x));
const avg = (xs) => {
  const v = xs.filter((x) => x !== null && x !== undefined && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export const PRIORITY_THRESHOLD = 25;

export const THEMES = [
  {
    id: 'water', label: 'Water security', sector: 'water', icon: 'droplet', color: '#3b82f6',
    headline: { key: 'water_pct', label: 'Basic drinking water', unit: '%', better: 'up' },
    score: (i) => avg([i.water_pct != null ? clamp(((100 - i.water_pct) / 40) * 100) : null,
      i.sanitation_pct != null ? clamp(((100 - i.sanitation_pct) / 40) * 100) : null]),
    describe: (i) => `${fmt(i.water_pct)}% basic water, ${fmt(i.sanitation_pct)}% basic sanitation`,
  },
  {
    id: 'health', label: 'Healthcare access', sector: 'health', icon: 'heart', color: '#ef4444',
    headline: { key: 'u5_mortality', label: 'Under-5 mortality', unit: 'per 1,000', better: 'down' },
    score: (i) => avg([i.u5_mortality != null ? clamp((i.u5_mortality / 40) * 100) : null,
      i.physicians != null ? clamp(((3 - i.physicians) / 3) * 100) : null]),
    describe: (i) => `under-5 mortality ${fmt(i.u5_mortality)} per 1,000, ${fmt(i.physicians)} physicians per 1,000`,
  },
  {
    id: 'digital', label: 'Digital connectivity', sector: 'digital', icon: 'wifi', color: '#8b5cf6',
    headline: { key: 'internet_pct', label: 'Internet users', unit: '%', better: 'up' },
    score: (i) => (i.internet_pct != null ? clamp(((100 - i.internet_pct) / 40) * 100) : null),
    describe: (i) => `${fmt(i.internet_pct)}% of people online`,
  },
  {
    id: 'transport', label: 'Transport & logistics', sector: 'transport', icon: 'bus', color: '#f97316',
    headline: { key: 'lpi_infra', label: 'Infrastructure quality (LPI)', unit: '1–5', better: 'up' },
    score: (i) => (i.lpi_infra != null ? clamp(((4 - i.lpi_infra) / 2) * 100) : null),
    describe: (i) => `logistics infrastructure score ${fmt(i.lpi_infra, 1)} of 5`,
  },
  {
    id: 'energy', label: 'Clean energy', sector: 'energy', icon: 'leaf', color: '#22c55e',
    headline: { key: 'renewable_pct', label: 'Renewable share of energy', unit: '%', better: 'up' },
    score: (i) => avg([i.electricity_pct != null ? clamp(((100 - i.electricity_pct) / 40) * 100) : null,
      i.renewable_pct != null ? clamp(((50 - i.renewable_pct) / 50) * 100) : null]),
    describe: (i) => `${fmt(i.electricity_pct)}% electricity access, ${fmt(i.renewable_pct)}% renewable energy`,
  },
  {
    id: 'education', label: 'Education access', sector: 'education', icon: 'graduation', color: '#eab308',
    headline: { key: 'literacy_pct', label: 'Adult literacy', unit: '%', better: 'up' },
    score: (i) => avg([i.literacy_pct != null ? clamp(((100 - i.literacy_pct) / 40) * 100) : null,
      i.secondary_enrol != null ? clamp(((100 - i.secondary_enrol) / 50) * 100) : null]),
    describe: (i) => `${fmt(i.literacy_pct)}% adult literacy, ${fmt(i.secondary_enrol)}% secondary enrolment`,
  },
  {
    id: 'jobs', label: 'Job opportunities', sector: 'social', icon: 'briefcase', color: '#ec4899',
    headline: { key: 'unemployment_pct', label: 'Unemployment', unit: '%', better: 'down' },
    score: (i) => (i.unemployment_pct != null ? clamp((i.unemployment_pct / 15) * 100) : null),
    describe: (i) => `${fmt(i.unemployment_pct)}% unemployment`,
  },
  {
    id: 'air', label: 'Clean air', sector: 'environment', icon: 'wind', color: '#14b8a6',
    headline: { key: 'pm25', label: 'PM2.5 exposure', unit: 'µg/m³', better: 'down' },
    score: (i) => (i.pm25 != null ? clamp(((i.pm25 - 5) / 45) * 100) : null),
    describe: (i) => `PM2.5 exposure ${fmt(i.pm25)} µg/m³ (WHO guideline: 5)`,
  },
];

function fmt(v, d = 0) {
  return v === null || v === undefined ? 'n/a' : Number(v).toFixed(d);
}

export const tierOf = (score) =>
  score === null ? null : score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= PRIORITY_THRESHOLD ? 'moderate' : 'low';

// Flagship public programmes addressing each theme. Curated from public sources for
// orientation; verify details before citing.
export const PROGRAMMES = {
  water: {
    IND: 'Jal Jeevan Mission (2019): piped tap water to every rural household',
    BRA: 'Água para Todos (2011): cisterns and water systems for the semi-arid north-east',
    ETH: 'One WASH National Programme (2013): integrated water, sanitation and hygiene',
    ZAF: 'Free Basic Water policy (2001): free lifeline water allowance per household',
    IDN: 'PAMSIMAS (2008): community-based rural water supply and sanitation',
    RUS: 'Clean Water federal project (2019): modernising municipal water supply',
    EGY: 'Hayah Karima / Decent Life (2019): rural infrastructure upgrade incl. water and sewage',
  },
  health: {
    IND: 'Ayushman Bharat (2018): health insurance plus primary health and wellness centres',
    BRA: 'Mais Médicos (2013): doctors placed in underserved municipalities',
    ETH: 'Health Extension Program (2003): community health extension workers',
    IDN: 'JKN (2014): national health insurance',
    EGY: 'Universal Health Insurance law (2018): phased universal coverage',
    CHN: 'Healthy China 2030 (2016): national health strategy',
    IRN: 'Health Transformation Plan (2014): reducing out-of-pocket spending',
  },
  digital: {
    IND: 'BharatNet (2011) and Digital India (2015): village broadband and e-services',
    IDN: 'Palapa Ring (2015): national fibre backbone to remote islands',
    CHN: 'Broadband China (2013): national broadband strategy',
    RUS: 'Digital Economy national programme (2019)',
    ZAF: 'SA Connect (2013): national broadband policy',
    BRA: 'Programa Nacional de Banda Larga (2010): national broadband plan',
  },
  energy: {
    BRA: 'Luz para Todos (2003): rural electrification',
    ZAF: 'REIPPPP (2011): competitive renewable energy procurement',
    IND: 'Saubhagya (2017): household electrification',
    ETH: 'National Electrification Program (2017): grid and off-grid access',
    EGY: 'Benban Solar Park (2019): utility-scale solar',
    ARE: 'UAE Energy Strategy 2050 (2017): clean energy targets',
  },
  education: {
    IND: 'Samagra Shiksha (2018): integrated school education scheme',
    BRA: 'FUNDEB (2007): basic education financing fund',
    ETH: 'GEQIP (2008): general education quality improvement',
    EGY: 'Education 2.0 (2018): curriculum and assessment reform',
  },
  transport: {
    IND: 'PMGSY (2000): all-weather rural road connectivity',
    RUS: 'Safe and Quality Roads national project (2017)',
    BRA: 'PAC growth acceleration programme (2007): infrastructure investment',
    ETH: 'Universal Rural Road Access Program (2011)',
  },
  jobs: {
    IND: 'MGNREGA (2005): guaranteed rural wage employment',
    ZAF: 'Expanded Public Works Programme (2004)',
    ETH: 'Productive Safety Net Programme (2005): public works for food-insecure households',
  },
  air: {
    IND: 'National Clean Air Programme (2019)',
    CHN: 'Air Pollution Prevention and Control Action Plan (2013)',
  },
};
