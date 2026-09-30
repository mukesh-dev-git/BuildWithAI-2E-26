import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Async, BasisBadge, CountryName, Loading, Note, Panel, ScoreBar, SectorTag } from '../components/ui';
import { fmtCompact, fmtInt, fmtMonth, fmtPct, TYPE_LABELS } from '../format';

const COMPONENTS = [
  ['demand', 'Demand intensity', 'Requests per capita and volume, ranked within the sector (45%)'],
  ['growth', 'Growth', 'Last 6 months vs the 6 before (20%)'],
  ['unresolved', 'Unresolved share', 'Requests not yet concluded (15%)'],
  ['infraGap', 'Infrastructure gap', 'National shortfall from World Bank indicators (20%)'],
];

export default function Recommendations() {
  const { params } = useDashboard();
  const [search, setSearch] = useSearchParams();
  const [basis, setBasis] = useState('');
  const [limit, setLimit] = useState(50);
  const state = useApi('/recommendations', { country: params.country, sector: params.sector, basis, limit });
  const focus = search.get('focus');

  // Default the detail pane to the top item
  useEffect(() => {
    if (!focus && state.data?.items.length) setSearch({ focus: state.data.items[0].id }, { replace: true });
  }, [focus, state.data, setSearch]);

  const selected = state.data?.items.find((i) => i.id === focus);

  return (
    <div className="grid grid-rec">
      <Panel
        title="Recommended development priorities"
        subtitle={state.data ? `${fmtInt(state.data.total)} region × sector candidates` : ' '}
        actions={(
          <>
          <Link className="btn" to="/explorer">Browse all records</Link>
          <div className="seg">
            {[['', 'All'], ['citizen-demand', 'Citizen demand'], ['infrastructure-need', 'Indicator need']].map(([v, l]) => (
              <button key={v} className={basis === v ? 'on' : ''} onClick={() => setBasis(v)}>{l}</button>
            ))}
          </div>
          </>
        )}
        flush
      >
        <Async state={state} label="Scoring priorities…">
          {(d) => (
            <>
              <div className="table-wrap">
                <table className="dtable">
                  <thead>
                    <tr><th>#</th><th>Region</th><th>Sector</th><th className="r">Requests</th><th className="r">Growth</th><th style={{ width: 140 }}>Priority</th></tr>
                  </thead>
                  <tbody>
                    {d.items.map((r, i) => (
                      <tr key={r.id} className={`clickable ${r.id === focus ? 'selected' : ''}`} onClick={() => setSearch({ focus: r.id })}>
                        <td className="muted num">{i + 1}</td>
                        <td><strong>{r.region}</strong><div className="muted" style={{ fontSize: 12 }}><CountryName iso3={r.iso3} /></div></td>
                        <td><SectorTag sector={r.sector} />{r.basis !== 'citizen-demand' && <div style={{ marginTop: 3 }}><BasisBadge basis={r.basis} /></div>}</td>
                        <td className="r">{r.requests12m ? fmtCompact(r.requests12m) : '—'}</td>
                        <td className="r" style={{ color: r.growth > 0 ? 'var(--d-bad)' : r.growth < 0 ? 'var(--d-good)' : undefined }}>
                          {r.growth === undefined ? '—' : `${r.growth > 0 ? '+' : ''}${(r.growth * 100).toFixed(0)}%`}
                        </td>
                        <td><ScoreBar score={r.score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {d.total > d.items.length && (
                <div className="pager">
                  <span>Showing {d.items.length} of {fmtInt(d.total)}</span>
                  <button className="btn" onClick={() => setLimit((l) => l + 50)}>Show more</button>
                </div>
              )}
            </>
          )}
        </Async>
      </Panel>

      <div className="map-side">
        {selected ? <Evidence rec={selected} /> : <Panel title="Evidence"><Note>Select a recommendation to see why it ranks where it does.</Note></Panel>}
      </div>
    </div>
  );
}

function Evidence({ rec }) {
  const { meta } = useDashboard();
  const detail = useApi(rec.regionId ? `/recommendations/${encodeURIComponent(rec.regionId)}/${rec.sector}` : null);
  const sectorColor = meta?.sectors[rec.sector]?.color;

  return (
    <Panel title={rec.region} subtitle={<span><CountryName iso3={rec.iso3} /> · {rec.sectorLabel}</span>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}><ScoreBar score={rec.score} /></div>
        <BasisBadge basis={rec.basis} />
      </div>

      <div className="section-label" style={{ marginTop: 4 }}>Why this score</div>
      <div className="components">
        {COMPONENTS.map(([k, label, hint]) => rec.components[k] !== null && rec.components[k] !== undefined && (
          <div key={k} title={hint}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
              <span>{label}</span><span className="num muted">{Math.round(rec.components[k] * 100)}</span>
            </div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${rec.components[k] * 100}%`, background: sectorColor }} /></div>
          </div>
        ))}
      </div>

      {rec.basis === 'citizen-demand' ? (
        detail.loading || !detail.data?.trend ? <Loading /> : <DemandEvidence rec={rec} d={detail.data} color={sectorColor} />
      ) : (
        <Note>
          {rec.region.replace(' (national)', '')} publishes no open citizen-feedback data. This priority is based on the national
          {' '}{rec.sectorLabel.toLowerCase()} gap of <strong>{rec.infraGap} pts</strong> (World Bank). Collecting requests through
          Citizen Intake would let the engine confirm it and place it at state/province level.
        </Note>
      )}
    </Panel>
  );
}

function DemandEvidence({ rec, d, color }) {
  return (
    <>
      <div className="detail-grid" style={{ marginTop: 14 }}>
        <div className="stat"><div className="stat-label">Requests · 12 mo</div><div className="stat-value">{fmtInt(rec.requests12m)}</div></div>
        <div className="stat"><div className="stat-label">Per 100k residents</div><div className="stat-value">{rec.per100k ?? '—'}</div></div>
        <div className="stat"><div className="stat-label">Unresolved</div><div className="stat-value">{fmtPct(rec.unresolved)}</div></div>
        <div className="stat"><div className="stat-label">Avg. days to answer</div><div className="stat-value">{rec.avgDays ?? '—'}</div></div>
      </div>

      <div className="section-label">Monthly requests</div>
      <div style={{ height: 150 }}>
        <ResponsiveContainer>
          <BarChart data={d.trend} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--d-border)" vertical={false} />
            <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 10, fill: 'var(--d-text-3)' }} minTickGap={20} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 10, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={fmtMonth} formatter={(v) => [fmtInt(v), 'Requests']}
              contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="n" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-label">What citizens are asking about</div>
      <ul className="list-plain">
        {d.subjects.map((s) => <li key={s.subject}><span>{s.subject}</span><span className="num muted">{fmtInt(s.n)}</span></li>)}
      </ul>

      {d.municipalities.length > 0 && (
        <>
          <div className="section-label">Cities with most requests</div>
          <ul className="list-plain">
            {d.municipalities.map((m) => <li key={m.name}><span>{m.name}</span><span className="num muted">{fmtInt(m.n)}</span></li>)}
          </ul>
        </>
      )}

      <div className="section-label">Request mix</div>
      <ul className="list-plain">
        {d.byType.map((t) => <li key={t.type}><span>{TYPE_LABELS[t.type] || t.type}</span><span className="num muted">{fmtInt(t.n)}</span></li>)}
      </ul>

      {d.samples.length > 0 && (
        <>
          <div className="section-label">Latest individual records</div>
          <div className="table-wrap">
            <table className="dtable">
              <tbody>
                {d.samples.slice(0, 8).map((s, i) => (
                  <tr key={i}>
                    <td className="nowrap muted num">{s.date}</td>
                    <td>{s.subject}<div className="muted" style={{ fontSize: 11.5 }}>{s.agency}</div></td>
                    <td className="nowrap" style={{ fontSize: 12 }}>{TYPE_LABELS[s.type]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
