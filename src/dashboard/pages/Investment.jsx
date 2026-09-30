import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, Note, Panel, SectorTag } from '../components/ui';
import { fmtInt, fmtPct, fmtUsd } from '../format';
import Flag from '../components/Flag';

const PPI = [
  ['ppi_transport', 'Transport', '#f97316'],
  ['ppi_energy', 'Energy', '#eab308'],
  ['ppi_water', 'Water & sanitation', '#0ea5e9'],
  ['ppi_ict', 'ICT', '#8b5cf6'],
];

export default function Investment() {
  const state = useApi('/investment');
  const { meta, country } = useDashboard();

  return (
    <Async state={state} label="Loading investment data…">
      {(d) => <InvestmentView d={d} meta={meta} country={country} />}
    </Async>
  );
}

function InvestmentView({ d, meta, country }) {
  // Sum of PPI commitments per country over the last 10 years, by sector
  const ppiByCountry = useMemo(() => {
    const maxYear = Math.max(...d.ppi.map((r) => r.year));
    const out = {};
    for (const r of d.ppi) {
      if (r.year <= maxYear - 10) continue;
      (out[r.iso3] ??= { iso3: r.iso3 })[r.key] = (out[r.iso3][r.key] || 0) + r.value;
    }
    return { rows: Object.values(out), from: maxYear - 9, to: maxYear };
  }, [d.ppi]);

  const name = (iso3) => meta?.countries.find((c) => c.iso3 === iso3)?.name || iso3;
  const rows = ppiByCountry.rows
    .filter((r) => country === 'ALL' || r.iso3 === country)
    .map((r) => ({ ...r, label: `$<Flag iso3={r.iso3} /> ${name(r.iso3)}` }))
    .sort((a, b) => PPI.reduce((s, [k]) => s + (b[k] || 0), 0) - PPI.reduce((s, [k]) => s + (a[k] || 0), 0));

  const gfcfLatest = useMemo(() => {
    const out = {};
    for (const r of d.gfcf) out[r.iso3] = r;
    return Object.values(out).sort((a, b) => b.value - a.value);
  }, [d.gfcf]);

  return (
    <>
      <Panel title="Where citizen demand and infrastructure investment diverge"
        subtitle="Share of citizen requests (last 5 years) vs share of private-participation infrastructure investment (last 5 years) across the four PPI sectors">
        {d.alignment.length === 0 ? <Note>No country with both open citizen data and PPI data.</Note> : d.alignment.map((c) => (
          <div key={c.iso3}>
            <div className="section-label" style={{ marginTop: 0 }}><Flag iso3={c.iso3} /> {c.name}</div>
            <div className="table-wrap">
              <table className="dtable">
                <thead><tr><th>Sector</th><th className="r">Citizen requests</th><th className="r">Demand share</th><th className="r">PPI investment</th><th className="r">Investment share</th><th className="r">Gap</th><th>Reading</th></tr></thead>
                <tbody>
                  {c.sectors.map((s) => {
                    const gap = s.demandShare - s.investmentShare;
                    return (
                      <tr key={s.sector}>
                        <td><SectorTag sector={s.sector} /></td>
                        <td className="r">{fmtInt(s.requests)}</td>
                        <td className="r">{fmtPct(s.demandShare, 1)}</td>
                        <td className="r">{fmtUsd(s.investmentUsd)}</td>
                        <td className="r">{fmtPct(s.investmentShare, 1)}</td>
                        <td className="r" style={{ fontWeight: 700, color: gap > 0.05 ? 'var(--d-bad)' : gap < -0.05 ? 'var(--d-good)' : undefined }}>
                          {gap > 0 ? '+' : ''}{(gap * 100).toFixed(1)} pts
                        </td>
                        <td style={{ fontSize: 12.5 }} className="muted">
                          {gap > 0.05 ? 'Under-invested relative to demand' : gap < -0.05 ? 'Investment ahead of demand' : 'Roughly aligned'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <Note>PPI covers infrastructure projects with private participation (World Bank PPI database, via WDI), not all public capital spending. Treat the gap as a directional signal. Adding national budget/CapEx plans would sharpen it.
            Most Digital &amp; Telecom demand is about government online services (gov.br accounts, agency IT systems), which is digital public infrastructure rather than telecom networks.</Note>
        </div>
      </Panel>

      <div className="grid grid-2">
        <Panel title="Infrastructure investment with private participation" subtitle={`Cumulative commitments ${ppiByCountry.from}–${ppiByCountry.to}, current US$`}>
          <div style={{ height: Math.max(220, rows.length * 38 + 60) }}>
            <ResponsiveContainer>
              <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--d-border)" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtUsd} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 12, fill: 'var(--d-text-2)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, k) => [fmtUsd(v), PPI.find((p) => p[0] === k)?.[1] || k]}
                  contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
                <Legend formatter={(k) => PPI.find((p) => p[0] === k)?.[1] || k} wrapperStyle={{ fontSize: 12 }} />
                {PPI.map(([k, , c]) => <Bar key={k} dataKey={k} stackId="a" fill={c} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Overall investment effort" subtitle="Gross fixed capital formation, % of GDP (latest year)" flush>
          <table className="dtable">
            <tbody>
              {gfcfLatest.map((r) => (
                <tr key={r.iso3} className={country === r.iso3 ? 'selected' : ''}>
                  <td className="nowrap"><Flag iso3={r.iso3} /> {name(r.iso3)}</td>
                  <td style={{ width: '45%' }}><div className="bar-track"><div className="bar-fill" style={{ width: `${(r.value / gfcfLatest[0].value) * 100}%`, background: 'var(--d-accent)' }} /></div></td>
                  <td className="r">{r.value.toFixed(1)}%</td>
                  <td className="muted num" style={{ fontSize: 12 }}>{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
