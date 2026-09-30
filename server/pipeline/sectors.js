// Development sectors used across the platform, and the rules that map
// source-specific subjects (e.g. Fala.BR "assunto") onto them.

export const SECTORS = {
  water: { label: 'Water & Sanitation', color: '#0ea5e9', development: true, indicators: ['water_pct', 'sanitation_pct'] },
  transport: { label: 'Roads & Transport', color: '#f59e0b', development: true, indicators: [] },
  energy: { label: 'Energy', color: '#eab308', development: true, indicators: ['electricity_pct'] },
  health: { label: 'Health', color: '#ef4444', development: true, indicators: ['hospital_beds'] },
  education: { label: 'Education', color: '#8b5cf6', development: true, indicators: ['literacy_pct'] },
  housing: { label: 'Housing & Urban', color: '#f97316', development: true, indicators: [] },
  digital: { label: 'Digital & Telecom', color: '#06b6d4', development: true, indicators: ['internet_pct'] },
  safety: { label: 'Public Safety & Disaster', color: '#64748b', development: true, indicators: [] },
  environment: { label: 'Environment', color: '#22c55e', development: true, indicators: [] },
  agriculture: { label: 'Agriculture & Food', color: '#84cc16', development: true, indicators: [] },
  social: { label: 'Social Services & Jobs', color: '#ec4899', development: true, indicators: ['poverty_pct'] },
  benefits: { label: 'Benefits & Pensions Admin', color: '#a78bfa', development: false, indicators: [] },
  governance: { label: 'Administration & Other', color: '#94a3b8', development: false, indicators: [] },
};

// Order matters: first match wins.
const RULES = [
  // Postal service and agency-website feedback are service administration, not digital infrastructure
  ['governance', /^correios$|comunicações postais|site do órgão/i],
  ['agriculture', /saúde animal|sanidade vegetal/i],
  ['environment', /educação ambiental/i],
  ['water', /saneamento|^água$|irrigação|infraestrutura hídrica|rejeitos e resíduos/i],
  ['transport', /transporte|trânsito|rodovia|^frete$|aeroporto|ponto de parada/i],
  ['energy', /energia|petróleo, gás/i],
  ['health', /saúde|hospitalar|hospitais|medicament|consulta|cirurgia|vacinação|vigilância em saúde|vigilância sanitária|endemias|farmácia|farmacêutica|coronavírus|câncer|atendimento básico|planos de saúde/i],
  ['education', /educação|ensino|enem|fies|prouni|sisu|universidade|curso técnico|matrícula|bolsas|estudantil|docente|escolar|diploma|cotas|tecnológica/i],
  ['housing', /habitação|minha casa|infraestrutura urbana|infraestrutura rural|serviços urbanos|urbanismo|fundiária|assentamento|acesso à terra|infraestrutura e fomento|capacitação das cidades/i],
  ['digital', /telecomunica|comunicações|governo digital|inclusão digital|transformação digital|gov\.br|tecnologia da informação|radiodifusão|redes sociais/i],
  ['safety', /policiamento|segurança e ordem|defesa civil|calamidade|desastre|violência|penitenciário|denúncia crime|armamento/i],
  ['environment', /ambient|biodiversidade|clima|^animais$|cop30|rio doce|meteorologia/i],
  ['agriculture', /agricult|agropecuária|abastecimento|pesca|aquicultura|animal|sanidade vegetal|política agrícola|extrativismo|segurança alimentar/i],
  // Individual pension / cash-transfer case handling: service administration, not development demand
  ['benefits', /previdência|benefícios e serviços|^auxílio$|auxílio emergencial|auxílio brasil|bolsa família|abono salarial|aposentadoria|^seguro$|cadastro único|^benefícios sociais$|programas e benefícios sociais/i],
  ['social', /previdência|benefício|auxílio|bolsa família|auxílio brasil|cadastro único|assistência social|assistência à|assistência ao|proteção social|desigualdade|pobreza|abono|aposentadoria|trabalhador|em trabalho|emprego|fomento ao trabalho|^seguro$|cuidado e acolhimento|pessoa com deficiência/i],
];

const cache = new Map();
export function sectorFor(subject) {
  if (cache.has(subject)) return cache.get(subject);
  const hit = RULES.find(([, re]) => re.test(subject));
  const sector = hit ? hit[0] : 'governance';
  cache.set(subject, sector);
  return sector;
}

/** Sector ids excluded from demand totals and priorities. */
export const NON_DEVELOPMENT = Object.entries(SECTORS).filter(([, v]) => !v.development).map(([k]) => k);
