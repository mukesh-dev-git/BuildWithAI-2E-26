import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, Panel } from '../components/ui';
import { FLAGS, fmtCompact, fmtInt } from '../format';

const COUNTRY_COLORS = {
  BRA: '#16a34a', RUS: '#2563eb', IND: '#f97316', CHN: '#dc2626', ZAF: '#ca8a04',
  EGY: '#9333ea', ETH: '#0d9488', IRN: '#db2777', ARE: '#475569', IDN: '#b91c1c',
};

const SERIES = [
  ['electricity_pct', 'Access to electricity (%)'],
  ['water_pct', 'Basic drinking water (%)'],
  ['sanitation_pct', 'Basic sanitation (%)'],
  ['internet_pct', 'Internet users (%)'],
  ['poverty_pct', 'Extreme poverty (%)'],
  ['gdp_pc', 'GDP per capita (US$)'],
  ['gfcf_pct_gdp', 'Gross fixed capital formation (% GDP)'],
];

const gapColor = (g) => {
  if (g === undefined || g === null) return 'transparent';
  const t = Math.min(g, 50) / 50;
  return `rgba(234, 88, 12, ${0.08 + t * 0.8})`;
};

export default function CountryCompare() {
  const { meta, country, setCountry } = useDashboard();
  const state = useApi('/countries');
  const [series, setSeries] = useState('electricity_pct');
  const seriesState = useApi('/indicators/series', { key: series });
  const gapSectors = meta ? Object.entries(meta.sectors).filter(([, s]) => s.indicators.length) : [];

  const seriesData = useMemo(() => {
    const byYear = {};
    for (const r of seriesState.data || []) (byYear[r.year] ??= { year: r.year })[r.iso3] = r.value;
    return Object.values(byYear);
  }, [seriesState.data]);

  return (
    <Async state={state} label="Loading country profiles…">
      {(rows) => (
        <>
          <div className="country-grid">
            {rows.map((c) => {
              const ind = c.indicators;
              return (
                <div key={c.iso3} className={`country-card ${country === c.iso3 ? 'on' : ''}`}
                  onClick={() => setCountry(country === c.iso3 ? 'ALL' : c.iso3)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3>{FLAGS[c.iso3]} {c.name}</h3>
                    <span className="muted" style={{ fontSize: 11.5 }}>since {c.joined}</span>
                  </div>
                  <div className="mini-metrics">
                    <div><span className="muted">Population</span><b>{fmtCompact(ind.population?.value)}</b></div>
                    <div><span className="muted">GDP / capita</span><b>${fmtCompact(ind.gdp_pc?.value)}</b></div>
                    <div><span className="muted">Regions</span><b>{c.regions}</b></div>
                    <div><span className="muted">Citizen requests 12 mo</span><b>{c.requests12m ? fmtCompact(c.requests12m) : '—'}</b></div>
                  </div>
                  {c.feedback_source
                    ? <span className="badge badge-demand" style={{ alignSelf: 'flex-start' }}>Open citizen data</span>
                    : <span className="badge badge-need" style={{ alignSelf: 'flex-start' }}>No open citizen data</span>}
                </div>
              );
            })}
          </div>

          <Panel title="Infrastructure gap matrix" subtitle="Points below full coverage, from the latest World Bank observation — darker = larger gap" flush>
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Country</th>
                    {gapSectors.map(([id, s]) => <th key={id} className="r">{s.label}</th>)}
                    <th className="r">Poverty ($2.15/day)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.iso3} className={country === c.iso3 ? 'selected' : ''}>
                      <td className="nowrap"><strong>{FLAGS[c.iso3]} {c.name}</strong></td>
                      {gapSectors.map(([id]) => (
                        <td key={id} className="r" style={{ background: gapColor(c.gaps[id]) }}>
                          {c.gaps[id] === undefined ? <span className="muted">n/a</span> : c.gaps[id].toFixed(1)}
                        </td>
                      ))}
                      <td className="r">{c.indicators.poverty_pct ? `${c.indicators.poverty_pct.value.toFixed(1)}% (${c.indicators.poverty_pct.year})` : <span className="muted">n/a</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Indicator trends, 2000 – latest" subtitle="World Bank World Development Indicators"
            actions={(
              <select value={series} onChange={(e) => setSeries(e.target.value)} aria-label="Indicator">
                {SERIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}>
            <div style={{ height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={seriesData} margin={{ top: 6, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--d-border)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip formatter={(v, k) => [v >= 1000 ? fmtInt(v) : v.toFixed(1),rows.find((r) => r.iso3 === k)?.name || k]}
                    contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} itemSorter={(i) => -i.value} />
                  <Legend formatter={(k) => rows.find((r) => r.iso3 === k)?.name || k} wrapperStyle={{ fontSize: 12 }} />
                  {rows.map((c) => (
                    <Line key={c.iso3} dataKey={c.iso3} stroke={COUNTRY_COLORS[c.iso3]} dot={false} connectNulls
                      strokeWidth={country === c.iso3 ? 3 : 1.6} strokeOpacity={country === 'ALL' || country === c.iso3 ? 1 : 0.25} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </>
      )}
    </Async>
  );
}
