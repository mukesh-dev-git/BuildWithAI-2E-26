import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Calendar, CircleCheck, CircleDashed, ClipboardList, Download, Globe2, Info, Loader, MapPin,
  MapPinned, Pencil, Target, Users,
} from 'lucide-react';
import { apiGet, useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import RegionHexMap from '../components/RegionHexMap';
import ThemeIcon from '../components/ThemeIcon';
import { Donut, GoalSelect, Mark, MarkLegend, ProgressBar, STATE_LABEL, progressColor } from '../components/goals';
import { ErrorNote, Loading } from '../components/ui';
import { fmtUsd } from '../format';
import './executive.css';
import './map.css';
import './recs.css';
import './goals.css';

const SECTOR_TO_GOAL = { water: 'water', health: 'health', digital: 'digital', transport: 'transport', energy: 'energy', education: 'education', social: 'jobs', environment: 'air' };
export const REGION_STATUS = {
  completed: { label: 'Completed', color: '#16a34a' }, in_progress: { label: 'In progress', color: '#3b82f6' },
  planned: { label: 'Planned', color: '#f59e0b' }, not_started: { label: 'Not started', color: '#9aa7b8' },
};
const short = (iso3) => (iso3 === 'ARE' ? 'UAE' : COUNTRY_NAMES[iso3]);

export default function GoalTracker() {
  const { country, setCountry, sector, months, refreshKey } = useDashboard();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [goal, setGoal] = useState(search.get('goal') || SECTOR_TO_GOAL[sector] || 'water');
  const [draft, setDraft] = useState({ goal, country, status: 'all' });
  const [applied, setApplied] = useState({ status: 'all' });
  const [selected, setSelected] = useState(null);
  const matrixRef = useRef(null);

  useEffect(() => { if (SECTOR_TO_GOAL[sector]) setGoal(SECTOR_TO_GOAL[sector]); }, [sector]);
  useEffect(() => setDraft((d) => ({ ...d, goal, country })), [goal, country]);

  const data = useApi('/goals/overview', { goal, r: refreshKey });
  const d = data.data;

  const rows = useMemo(() => (d?.countries || []).filter((c) =>
    (country === 'ALL' || c.iso3 === country)
    && (applied.status === 'all' || c.state === applied.status)), [d, country, applied]);
  const sel = selected && rows.some((r) => r.iso3 === selected) ? selected : rows.find((r) => r.inScope)?.iso3 || rows[0]?.iso3;

  const apply = () => { setGoal(draft.goal); setCountry(draft.country); setApplied({ status: draft.status }); };

  if (data.error) return <ErrorNote error={data.error} />;
  if (!d) return <Loading label="Collecting milestones…" />;

  return (
    <div className="exec goals">
      {/* Filters */}
      <section className="ecard gfilters">
        <div className="gf goal-f"><span className="gf-label">Select goal</span><GoalSelect goals={d.goals} value={draft.goal} onChange={(v) => setDraft({ ...draft, goal: v })} /></div>
        <div className="gf"><span className="gf-label">Countries</span>
          <label className="pill-select wide"><Globe2 size={16} />
            <select value={draft.country} onChange={(e) => setDraft({ ...draft, country: e.target.value })} aria-label="Countries">
              <option value="ALL">All BRICS members</option>
              {Object.entries(COUNTRY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <div className="gf"><span className="gf-label">Time period</span>
          <label className="pill-select wide"><Calendar size={16} />
            <select value={months} disabled aria-label="Time period" title="Milestones are cumulative; the period applies to citizen-demand figures">
              <option value={months}>Last {months} months</option>
            </select>
          </label>
        </div>
        <div className="gf"><span className="gf-label">Status</span>
          <label className="pill-select wide"><ClipboardList size={16} />
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} aria-label="Status">
              <option value="all">All status</option>
              {Object.entries(STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <button className="btn-brand apply" onClick={apply}>Apply filters</button>
      </section>

      {/* KPIs */}
      <div className="gkpis">
        <GKpi icon={<Users size={28} />} tone="blue" label="Countries in scope" value={d.kpis.inScope} sub="Members where this goal is a priority" />
        <GKpi icon={<CircleCheck size={30} />} tone="green" label="Fully implemented" value={d.kpis.completed} sub="All six milestones done" />
        <GKpi icon={<Loader size={28} />} tone="sky" label="In progress" value={d.kpis.inProgress} sub="Countries" />
        <GKpi icon={<CircleDashed size={28} />} tone="rose" label="Not started" value={d.kpis.notStarted} sub={d.kpis.notStarted === 1 ? 'Country' : 'Countries'} />
        <GKpi icon={<MapPinned size={28} />} tone="indigo" label="Regions covered" value={d.kpis.regionsCovered} sub="States / provinces with measured need" />
      </div>

      <div className="gmain">
        <div className="gleft">
          {/* Tracker */}
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><Target size={26} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>Country implementation tracker</h2><p>Progress by key milestone for {d.goal.label.toLowerCase()}. Click a country for detail.</p></div>
              <div className="ecard-actions"><MarkLegend /></div>
            </header>
            <div className="table-wrap">
              <table className="dtable gtable">
                <thead>
                  <tr><th>#</th><th>Country</th><th>Overall progress</th>{d.milestones.map((m) => <th key={m.id} className="c" title={m.auto ? `Default: ${m.auto}` : 'Reported only'}>{m.label}</th>)}<th className="c">View plan</th></tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={c.iso3} className={`${sel === c.iso3 ? 'selected' : ''} ${c.state === 'na' ? 'out' : ''}`} onClick={() => setSelected(c.iso3)}>
                      <td className="muted num">{i + 1}</td>
                      <td className="nowrap"><Flag iso3={c.iso3} size={24} /> <strong>{short(c.iso3)}</strong></td>
                      <td className="nowrap">
                        {c.state === 'na' ? <span className="muted small">Not a priority</span> : <><span className="pct">{Math.round(c.progress * 100)}%</span> <ProgressBar value={c.progress} width={48} /></>}
                      </td>
                      {c.milestones.map((m) => <td key={m.id} className="c"><Mark status={m.status} title={`${m.label}: ${m.evidence}`} /></td>)}
                      <td className="c"><button className="view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/goals/${c.iso3}/${d.goal.id}`); }}>View plan <ArrowRight size={13} /></button></td>
                    </tr>
                  ))}
                  {!rows.length && <tr><td colSpan={10} className="muted">No member matches these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="muted small gnote"><Info size={13} /> Pilot and full implementation are only ever set by status updates. Other milestones start from open data or programme records until someone updates them.</p>
          </section>

          {/* Matrix across goals */}
          <section className="ecard" ref={matrixRef}>
            <header className="ecard-head">
              <div className="ecard-icon"><BarChart3 size={26} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>Country comparison matrix</h2><p>Implementation progress for every shared goal, by member. Click a cell to open that country’s plan.</p></div>
            </header>
            <GoalMatrix goals={d.goals} current={d.goal.id} country={country} onOpen={(iso3, g) => navigate(`/goals/${iso3}/${g}`)} />
          </section>
        </div>

        <CountryPanel iso3={sel} goal={d.goal} refreshKey={refreshKey} matrixRef={matrixRef} />
      </div>

      {/* Pipeline */}
      <section className="ecard">
        <header className="ecard-head">
          <div className="ecard-icon"><Users size={24} color="#2563eb" /></div>
          <div className="ecard-titles"><h2>Goal pipeline</h2><p>Every shared goal and how many members have it as a priority</p></div>
        </header>
        <div className="pipe-rail">
          {d.pipeline.map((p) => (
            <button key={p.id} className={`pipe ${p.id === d.goal.id ? 'on' : ''}`} onClick={() => setGoal(p.id)}>
              <ThemeIcon icon={p.icon} color={p.color} size={30} />
              <span className="pipe-body">
                <strong>{p.label}</strong>
                <small><b>{p.inScope.length} / {p.total}</b> countries · {Math.round(p.avgProgress * 100)}% avg progress</small>
                <span className="pipe-flags">{Object.keys(COUNTRY_NAMES).map((c) => <span key={c} className={p.inScope.includes(c) ? '' : 'off'}><Flag iso3={c} size={16} /></span>)}</span>
              </span>
              <ArrowRight size={16} className="muted" />
            </button>
          ))}
        </div>
      </section>

      <footer className="ecard gfoot">
        <span><Info size={14} /> <strong>Data confidence and sources</strong></span>
        <span className="muted small">Need, funding and outcome trends: World Bank WDI and PPI. Regional need: DHS surveys and Fala.BR. Strategy: curated programme records. Pilot and implementation: status updates.</span>
        <span className="muted small">Last status update: {d.lastUpdate ? d.lastUpdate.slice(0, 10) : 'none yet'}</span>
        <Link to="/sources" className="outline-btn sm">View details <ArrowRight size={13} /></Link>
      </footer>
    </div>
  );
}

function GKpi({ icon, tone, label, value, sub }) {
  return (
    <div className={`gkpi gt-${tone}`}>
      <div className="gkpi-icon">{icon}</div>
      <div><div className="gkpi-label">{label}</div><div className="gkpi-value">{value}</div><div className="gkpi-sub">{sub}</div></div>
    </div>
  );
}

function GoalMatrix({ goals, current, country, onOpen }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.all(goals.map((g) => apiGet('/goals/overview', { goal: g.id }))).then((all) => {
      if (!live) return;
      const byCountry = {};
      all.forEach((o) => o.countries.forEach((c) => { (byCountry[c.iso3] ??= {})[o.goal.id] = c; }));
      setRows(byCountry);
    }).catch(() => live && setRows({}));
    return () => { live = false; };
  }, [goals]);
  if (!rows) return <Loading label="Comparing goals…" />;
  const isos = Object.keys(COUNTRY_NAMES).filter((c) => country === 'ALL' || c === country);
  return (
    <div className="table-wrap">
      <table className="dtable matrix">
        <thead><tr><th>Country</th>{goals.map((g) => <th key={g.id} className={`c ${g.id === current ? 'cur' : ''}`} title={g.label}><ThemeIcon icon={g.icon} color={g.color} size={16} /><span>{g.label}</span></th>)}</tr></thead>
        <tbody>
          {isos.map((iso) => (
            <tr key={iso}>
              <td className="nowrap"><Flag iso3={iso} size={20} /> {short(iso)}</td>
              {goals.map((g) => {
                const c = rows[iso]?.[g.id];
                if (!c) return <td key={g.id} />;
                return (
                  <td key={g.id} className={`c ${g.id === current ? 'cur' : ''}`}>
                    <button className={`cell ${c.state === 'na' ? 'na' : ''}`} onClick={() => onOpen(iso, g.id)} title={`${g.label}: ${STATE_LABEL[c.state]}, ${Math.round(c.progress * 100)}%`}
                      style={c.state === 'na' ? undefined : { '--p': progressColor(c.progress), '--w': `${c.progress * 100}%` }}>
                      {c.state === 'na' ? '—' : `${Math.round(c.progress * 100)}%`}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Right panel: one member ─────────────────────── */
function CountryPanel({ iso3, goal, refreshKey, matrixRef }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const d = useApi(iso3 ? `/goals/country/${iso3}/${goal.id}` : null, { r: refreshKey });
  const hex = useApi(iso3 ? '/hotspots/hexmap' : null, { country: iso3, theme: goal.id });
  if (!iso3) return <section className="ecard gpanel"><p className="muted">Select a country.</p></section>;
  const x = d.data;

  const statusByRegion = Object.fromEntries((x?.regions || []).map((r) => [r.regionId, r.status]));
  const counts = Object.fromEntries(Object.keys(REGION_STATUS).map((k) => [k, (x?.regions || []).filter((r) => r.status === k).length]));

  const download = () => {
    const md = reportMarkdown(x);
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = `goal-report-${x.country.iso3}-${x.goal.id}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="ecard gpanel">
      {d.error ? <ErrorNote error={d.error} /> : !x ? <Loading /> : (
        <>
          <header className="gp-head">
            <Flag iso3={x.country.iso3} size={46} />
            <div><h2>{short(x.country.iso3)}</h2><p>{x.goal.label}</p></div>
            <Link className="outline-btn" to={`/goals/${x.country.iso3}/${x.goal.id}`}>View country plan <ArrowRight size={14} /></Link>
          </header>
          <nav className="gp-tabs" role="tablist">
            {[['overview', 'Overview'], ['regional', 'Regional strategy'], ['investments', 'Investments'], ['evidence', 'Evidence']].map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </nav>

          {tab === 'overview' && (
            <>
              <div className="gp-top">
                <div className="gp-status">
                  <small>Overall status</small>
                  <div className="gp-status-row">
                    <Donut value={x.progress} color={progressColor(x.progress)} />
                    <div><b style={{ color: progressColor(x.progress) }}>{STATE_LABEL[x.state]}</b><span>{x.done} of 6 milestones complete</span></div>
                  </div>
                </div>
                <div className="gp-regions">
                  <small><MapPin size={16} color="#2563eb" /> Regions covered</small>
                  <b>{x.regionsCovered} / {x.regionsNeeding || x.regions.length}</b>
                  <span className="muted small">{x.regions.length ? 'regions with a recorded status' : 'no regional data for this member'}</span>
                  <ProgressBar value={x.regionsNeeding ? Math.min(1, x.regionsCovered / x.regionsNeeding) : 0} width="100%" />
                </div>
              </div>
              <RegionTable x={x} limit={4} />
            </>
          )}
          {tab === 'regional' && <RegionTable x={x} />}
          {tab === 'investments' && <InvestmentList x={x} />}
          {tab === 'evidence' && <EvidenceList x={x} />}

          {x.regions.length > 0 && hex.data && (
            <div className="gp-map">
              <h3 className="bm-h">Regional view: {short(x.country.iso3)}</h3>
              <div className="gp-map-grid">
                <RegionHexMap data={hex.data} height={250} labels="regions" expandable={false}
                  legendTitle="Implementation status"
                  colorOf={(regionId) => (statusByRegion[regionId] ? REGION_STATUS[statusByRegion[regionId]].color : null)}
                  legendItems={Object.entries(REGION_STATUS).map(([k, v]) => ({ id: k, label: `${v.label} (${counts[k]})`, color: v.color }))} />
              </div>
              <button className="outline-btn sm" onClick={() => navigate(`/map/${x.country.iso3}/${x.goal.id}`)}>View interactive map <ArrowRight size={13} /></button>
            </div>
          )}

          <div className="gp-quick">
            <h3 className="bm-h">Quick actions</h3>
            <div className="rd-buttons">
              <button className="outline-btn sm" onClick={() => matrixRef.current?.scrollIntoView({ behavior: 'smooth' })}><BarChart3 size={14} /> Compare countries</button>
              <button className="outline-btn sm" onClick={() => navigate(`/goals/${x.country.iso3}/${x.goal.id}`)}><Pencil size={14} /> Update status</button>
              <button className="outline-btn sm" onClick={() => navigate(`/goals/${x.country.iso3}/${x.goal.id}#regional`)}><MapPinned size={14} /> View regional strategy</button>
              <button className="outline-btn sm" onClick={download}><Download size={14} /> Download report</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function RegionTable({ x, limit, onStatus }) {
  const rows = limit ? x.regions.slice(0, limit) : x.regions;
  if (!x.regions.length) return <p className="muted small" style={{ margin: '10px 0' }}>{short(x.country.iso3)} publishes no open regional data for this goal, so there is no regional strategy table. Track progress at national level above.</p>;
  return (
    <div className="table-wrap">
      <table className="dtable rtable">
        <thead><tr><th>#</th><th>Region / state</th><th>Key action (from measured gap)</th><th>Status</th><th>Progress</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.regionId}>
              <td className="muted num">{i + 1}</td>
              <td><strong>{r.region}</strong><div className="muted" style={{ fontSize: 11 }}>need {r.score}</div></td>
              <td style={{ fontSize: 12.5 }}>{r.action}</td>
              <td className="nowrap">
                {onStatus ? (
                  <select className="rstatus" value={r.status} onChange={(e) => onStatus(r, e.target.value)} aria-label={`Status for ${r.region}`} style={{ '--c': REGION_STATUS[r.status].color }}>
                    {Object.entries(REGION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                ) : <span className="rs-pill" style={{ '--c': REGION_STATUS[r.status].color }}>{REGION_STATUS[r.status].label}</span>}
              </td>
              <td className="nowrap"><span className="pct sm">{r.progress}%</span> <ProgressBar value={r.progress / 100} width={60} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {limit && x.regions.length > limit && <p className="muted small" style={{ marginTop: 6 }}>{x.regions.length - limit} more regions under Regional strategy.</p>}
    </div>
  );
}

export function InvestmentList({ x }) {
  if (!x.investments.length) return <p className="muted small" style={{ margin: '10px 0' }}>No infrastructure investment series is published for this goal and member. Record funding through Update status when it is confirmed.</p>;
  const max = Math.max(...x.investments.map((r) => r.value));
  return (
    <ul className="inv-list">
      {x.investments.map((r) => (
        <li key={r.year}><span>{r.year}</span><span className="wb-track"><span style={{ width: `${(r.value / max) * 100}%`, background: '#3b82f6' }} /></span><b>{fmtUsd(r.value)}</b></li>
      ))}
      <li className="muted small">World Bank PPI: infrastructure projects with private participation (current US$)</li>
    </ul>
  );
}

export function EvidenceList({ x }) {
  return (
    <ul className="ev-list">
      {x.milestones.map((m) => (
        <li key={m.id}><Mark status={m.status} size={18} /><div><strong>{m.label}</strong><small>{m.evidence}{m.date ? ` (${m.date})` : ''}</small></div></li>
      ))}
      {x.outcome.length > 1 && <li className="muted small">{x.goal.headline.label}: {x.outcome[0].value.toFixed(1)} in {x.outcome[0].year} → {x.outcome.at(-1).value.toFixed(1)} in {x.outcome.at(-1).year}</li>}
    </ul>
  );
}

export function reportMarkdown(x) {
  return `# ${x.country.name}: ${x.goal.label} progress report

Overall progress: ${Math.round(x.progress * 100)}% (${x.done} of 6 milestones) · ${STATE_LABEL[x.state]}

## Milestones
${x.milestones.map((m) => `- [${m.status === 'done' ? 'x' : ' '}] ${m.label}: ${m.status.replace('_', ' ')}${m.date ? ` (${m.date})` : ''}. ${m.evidence}`).join('\n')}

## Regions
${x.regions.length ? x.regions.map((r) => `- ${r.region} (need ${r.score}): ${r.action}. Status: ${REGION_STATUS[r.status].label}`).join('\n') : '- No open regional data'}

## Learn from
${x.learn.map((l) => `- ${l.iso3}: ${l.programme || l.model}`).join('\n') || '- None identified'}

Generated ${new Date().toISOString().slice(0, 10)} by VikasDrishti. Sources: World Bank WDI/PPI, DHS regional surveys, Fala.BR, curated programme records, dashboard status updates.
`;
}

