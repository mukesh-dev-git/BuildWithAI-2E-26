const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en');

export const fmtCompact = (n) => (n === null || n === undefined ? '—' : compact.format(n));
export const fmtInt = (n) => (n === null || n === undefined ? '—' : whole.format(Math.round(n)));
export const fmtPct = (x, digits = 0) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(digits)}%`);
export const fmtUsd = (n) => (n === null || n === undefined ? '—' : `$${compact.format(n)}`);

export function fmtDelta(curr, prev) {
  if (!prev) return null;
  const d = (curr - prev) / prev;
  return { value: d, label: `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%` };
}

export function fmtMonth(m) {
  if (!m) return '';
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export const TYPE_LABELS = {
  complaint: 'Complaint', request: 'Service request', report: 'Report', denunciation: 'Denunciation',
  praise: 'Praise', suggestion: 'Suggestion', simplify: 'Simplification', other: 'Other',
};

export const FLAGS = {
  BRA: '🇧🇷', RUS: '🇷🇺', IND: '🇮🇳', CHN: '🇨🇳', ZAF: '🇿🇦', EGY: '🇪🇬', ETH: '🇪🇹', IRN: '🇮🇷', ARE: '🇦🇪', IDN: '🇮🇩',
};
