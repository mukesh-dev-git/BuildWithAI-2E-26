import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, BasisBadge, CountryName, Kpi, Note, Panel, ScoreBar, SectorTag } from '../components/ui';
import { fmtCompact, fmtDelta, fmtInt, fmtMonth, fmtPct, TYPE_LABELS } from '../format';

export default function Overview() {
  const { params, meta, country } = useDashboard();
  const state = useApi('/overview', params);
  const selected = meta?.countries.find((c) => c.iso3 === country);

  return (
    <Async state={state} label="Aggregating citizen demand…">
      {(d) => (
        <>
          {selected && !selected.feedback_source && (
            <Note>
              <strong>{selected.name}</strong> does not publish open citizen-feedback data, so there are no request counts below.
              Recommendations for {selected.name} are based on national infrastructure indicators (World Bank) only.
              Requests submitted through <em>Citizen Intake</em> will appear here as they arrive.
            </Note>
          )}
          <div className="grid grid-kpi">
            <Kpi label={`Citizen requests · last ${d.window.months} mo`} value={fmtCompact(d.kpis.requests)}
              delta={fmtDelta(d.kpis.requests, d.kpis.requestsPrev)} hint="vs prior period" invertDelta />
            <Kpi label="Resolved" value={fmtPct(d.kpis.resolvedPct)} hint={d.kpis.avgDays ? `${Math.round(d.kpis.avgDays)} days avg.` : null} />
            <Kpi label="Priority hotspots (score ≥ 70)" value={fmtInt(d.kpis.hotspots)} hint="region × sector" />
            <Kpi label="Regions reporting demand" value={fmtInt(d.kpis.regionsWithDemand)} />
            <Kpi label="Records analysed (all time)" value={fmtCompact(d.kpis.allTimeRecords)}
              hint={`${d.kpis.countriesWithFeedback} of ${d.kpis.countries} countries open`} />
          </div>

          <div className="grid grid-2">
            <Panel title="Demand trend by sector" subtitle={`Monthly citizen requests, ${fmtMonth(d.trend[0]?.month)} – ${fmtMonth(d.window.to)}`}>
              <TrendChart trend={d.trend} sectors={meta?.sectors} />
            </Panel>
            <Panel title="Where demand concentrates" subtitle={`Share of requests by development sector, last ${d.window.months} months`}>
              <SectorBars rows={d.bySector.filter((r) => meta?.sectors[r.sector]?.development)} sectors={meta?.sectors} />
              {d.byType.length > 0 && (
                <>
                  <div className="section-label">Request type</div>
                  <ul className="list-plain">
                    {d.byType.slice(0, 5).map((t) => (
                      <li key={t.type}><span>{TYPE_LABELS[t.type] || t.type}</span><span className="num muted">{fmtInt(t.n)}</span></li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          <TopRecommendations items={d.topRecommendations} />
        </>
      )}
    </Async>
  );
}

function TrendChart({ trend, sectors }) {
  const { data, keys } = useMemo(() => {
    const byMonth = {};
    const totals = {};
    for (const r of trend) {
      if (!sectors?.[r.sector]?.development) continue;
      (byMonth[r.month] ??= { month: r.month })[r.sector] = r.n;
      totals[r.sector] = (totals[r.sector] || 0) + r.n;
    }
    return { data: Object.values(byMonth), keys: Object.keys(totals).sort((a, b) => totals[b] - totals[a]) };
  }, [trend, sectors]);

  if (!data.length) return <div className="dash-empty">No citizen requests in this selection.</div>;
  return (
    <div style={{ height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 6, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--d-border)" vertical={false} />
          <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} minTickGap={24} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            labelFormatter={fmtMonth}
            formatter={(v, k) => [fmtInt(v), sectors?.[k]?.label || k]}
            contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }}
            itemSorter={(i) => -i.value}
          />
          {keys.map((k) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={sectors?.[k]?.color} fill={sectors?.[k]?.color} fillOpacity={0.75} strokeWidth={0} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectorBars({ rows, sectors }) {
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (!total) return <div className="dash-empty">No citizen requests in this selection.</div>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.sector}>
          <SectorTag sector={r.sector} />
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.n / rows[0].n) * 100}%`, background: sectors?.[r.sector]?.color }} /></div>
          <span className="num muted" style={{ fontSize: 12 }}>{fmtPct(r.n / total, 1)}</span>
        </div>
      ))}
    </div>
  );
}

function TopRecommendations({ items }) {
  const navigate = useNavigate();
  return (
    <Panel title="Top recommended priorities" subtitle="Ranked by the priority engine — click a row for the evidence"
      actions={<button className="btn" onClick={() => navigate('/recommendations')}>View all</button>} flush>
      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr><th>Region</th><th>Sector</th><th>Basis</th><th className="r">Requests (12 mo)</th><th className="r">Per 100k</th><th style={{ width: 160 }}>Priority</th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => navigate(`/recommendations?focus=${encodeURIComponent(r.id)}`)}>
                <td><strong>{r.region}</strong><div className="muted" style={{ fontSize: 12 }}><CountryName iso3={r.iso3} /></div></td>
                <td><SectorTag sector={r.sector} /></td>
                <td><BasisBadge basis={r.basis} /></td>
                <td className="r">{fmtInt(r.requests12m)}</td>
                <td className="r">{r.per100k ?? '—'}</td>
                <td><ScoreBar score={r.score} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
