import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Calendar, CalendarClock, ChartColumnIncreasing, ChevronRight, CircleCheck, Download, FileText,
  Loader, MapPin, Pencil, PlayCircle, Search, Target, Users, Coins,
} from 'lucide-react';
import { apiPost, useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import RegionHexMap from '../components/RegionHexMap';
import { Donut, GoalSelect, Mark, MilestoneModal, ProgressBar, SOURCE_LABEL, STATE_LABEL, progressColor } from '../components/goals';
import { ErrorNote, Loading } from '../components/ui';
import { ThemeModal } from './ExecutiveOverview';
import { AdaptModal } from './RecommendationsHub';
import { EvidenceList, InvestmentList, REGION_STATUS, RegionTable, reportMarkdown } from './GoalTracker';
import './executive.css';
import './map.css';
import './recs.css';
import './goals.css';

const MILESTONE_ICON = { need: Search, strategy: FileText, funding: Coins, pilot: PlayCircle, full: ChartColumnIncreasing, impact: BarChart3 };
const short = (iso3) => (iso3 === 'ARE' ? 'UAE' : COUNTRY_NAMES[iso3]);

export default function CountryGoal() {
  const { iso3, goal } = useParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { months, refreshKey } = useDashboard();
  const [tick, setTick] = useState(0);
  const [compare, setCompare] = useState('ALL');
  const [draftGoal, setDraftGoal] = useState(goal);
  const [draftCompare, setDraftCompare] = useState('ALL');
  const [tab, setTab] = useState(hash === '#regional' ? 'regional' : 'overview');
  const [editing, setEditing] = useState(null);
  const [themeModal, setThemeModal] = useState(null);
  const [adapt, setAdapt] = useState(null);

  useEffect(() => setDraftGoal(goal), [goal]);
  const d = useApi(`/goals/country/${iso3}/${goal}`, { t: tick, r: refreshKey });
  const goals = useApi('/goals/overview', { goal });
  const hex = useApi('/hotspots/hexmap', { country: iso3, theme: goal });
  const x = d.data;

  const apply = () => { setCompare(draftCompare); if (draftGoal !== goal) navigate(`/goals/${iso3}/${draftGoal}`); };
  const setRegion = async (r, status) => { await apiPost('/goals/region', { iso3, goal, regionId: r.regionId, status }); setTick((t) => t + 1); };

  if (d.error) return <ErrorNote error={d.error} />;
  if (!x || !goals.data) return <Loading label="Loading country progress…" />;

  const statusByRegion = Object.fromEntries(x.regions.map((r) => [r.regionId, r.status]));
  const counts = Object.fromEntries(Object.keys(REGION_STATUS).map((k) => [k, x.regions.filter((r) => r.status === k).length]));
  const others = x.others.filter((o) => compare === 'ALL' || o.iso3 === compare || o.iso3 === iso3);
  const nextOpen = x.milestones.find((m) => m.status !== 'done' && m.status !== 'na') || x.milestones[0];
  const download = () => {
    const url = URL.createObjectURL(new Blob([reportMarkdown(x)], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = `goal-report-${iso3}-${goal}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="exec goals">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">BRICS</Link><ChevronRight size={14} /><Link to="/goals">Goal Tracker</Link><ChevronRight size={14} /><span>{x.country.name}</span>
      </nav>
      <div className="cg-title">
        <h1>Country Goal Progress: {short(iso3)}</h1>
        <p>Track {x.country.name}’s implementation status, compare with other BRICS members, and review regional strategies.</p>
      </div>

      <section className="ecard gfilters cg">
        <div className="gf goal-f"><span className="gf-label">Select goal</span><GoalSelect goals={goals.data.goals} value={draftGoal} onChange={setDraftGoal} /></div>
        <div className="gf"><span className="gf-label">Time period</span>
          <label className="pill-select wide"><Calendar size={16} /><select value={months} disabled aria-label="Time period"><option>Last {months} months</option></select></label>
        </div>
        <div className="gf"><span className="gf-label">Compare with</span>
          <label className="pill-select wide"><Users size={16} />
            <select value={draftCompare} onChange={(e) => setDraftCompare(e.target.value)} aria-label="Compare with">
              <option value="ALL">All BRICS members</option>
              {Object.entries(COUNTRY_NAMES).filter(([k]) => k !== iso3).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <button className="btn-brand apply" onClick={apply}>Apply filters</button>
      </section>

      {/* KPI strip */}
      <div className="cg-kpis">
        <div className="cgk cgk-country">
          <Flag iso3={iso3} size={56} />
          <div><h2>{short(iso3)}</h2><p>{x.goal.label}</p><Link to="/countries" className="link-btn">View country profile <ArrowRight size={13} /></Link></div>
        </div>
        <div className="cgk"><Donut value={x.progress} size={72} color={progressColor(x.progress)} /><div><small>Overall progress</small><b className="lg">{Math.round(x.progress * 100)}%</b><span>{x.state === 'na' ? 'Not a priority goal here' : 'of the six milestones'}</span></div></div>
        <div className="cgk"><span className="cgk-ic green"><CircleCheck size={30} /></span><div><small>Milestones completed</small><b className="lg">{x.done} / 6</b><span>Implementation steps</span></div></div>
        <div className="cgk"><span className="cgk-ic blue"><MapPin size={28} /></span><div><small>Regions covered</small><b className="lg">{x.regionsCovered} / {x.regionsNeeding || x.regions.length || 0}</b><ProgressBar value={x.regionsNeeding ? Math.min(1, x.regionsCovered / x.regionsNeeding) : 0} width={120} /></div></div>
        <div className="cgk"><span className="cgk-ic sky"><Loader size={28} /></span><div><small>Current status</small><b className="st" style={{ color: progressColor(x.progress) }}>{STATE_LABEL[x.state]}</b><span>Need score {x.needScore}</span></div></div>
        <div className="cgk"><span className="cgk-ic indigo"><CalendarClock size={28} /></span><div><small>Next review date</small><b className="lg">{x.nextReview || '—'}</b><span>{x.nextReview ? '6 months after the last update' : 'Set when a status is first reported'}</span></div></div>
      </div>

      <div className="cg-main">
        <div className="cg-left">
          {/* Master checklist */}
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><Target size={26} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>{short(iso3)} master checklist: {x.goal.label}</h2><p>Click a milestone to update its status. Updates are shared with everyone.</p></div>
              <div className="ecard-actions cg-count"><span>{x.done} of 6 completed</span><ProgressBar value={x.done / 6} width={120} /></div>
            </header>
            <div className="checklist">
              {x.milestones.map((m) => {
                const Icon = MILESTONE_ICON[m.id];
                return (
                  <button key={m.id} className={`ck ck-${m.status}`} onClick={() => setEditing(m)} title={m.evidence}>
                    <Icon size={28} color="#2563eb" strokeWidth={1.7} />
                    <strong>{m.label}</strong>
                    <Mark status={m.status} size={24} />
                    <span className="ck-state">{m.status === 'done' ? 'Completed' : m.status === 'in_progress' ? 'In progress' : m.status === 'na' ? 'Not applicable' : 'Not started'}</span>
                    <small>{m.date || (m.updatedAt ? m.updatedAt.slice(0, 10) : '—')}</small>
                    <span className={`src src-${m.source}`}>{SOURCE_LABEL[m.source]}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Other countries */}
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><Users size={26} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>Other BRICS countries: {x.goal.label}</h2><p>Compare milestones and progress across members. Click a card to open its plan.</p></div>
              <div className="ecard-actions"><Link className="outline-btn sm" to="/goals">View all countries <ArrowRight size={13} /></Link></div>
            </header>
            <div className="oc-rail">
              {others.map((o) => (
                <button key={o.iso3} className={`oc ${o.iso3 === iso3 ? 'me' : ''}`} onClick={() => navigate(`/goals/${o.iso3}/${goal}`)}>
                  <span className="oc-head"><Flag iso3={o.iso3} size={20} /><strong>{short(o.iso3)}</strong></span>
                  <span className="oc-prog"><b>{o.state === 'na' ? '—' : `${Math.round(o.progress * 100)}%`}</b><ProgressBar value={o.state === 'na' ? 0 : o.progress} width="100%" /></span>
                  <ul>{o.milestones.map((m) => <li key={m.id}><Mark status={m.status} size={13} /> {m.label}</li>)}</ul>
                  <span className={`oc-state s-${o.state}`}><Mark status={o.state === 'completed' ? 'done' : o.state === 'in_progress' ? 'in_progress' : o.state === 'na' ? 'na' : 'not_started'} size={14} /> {STATE_LABEL[o.state]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Learn from others */}
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><ChartColumnIncreasing size={24} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>Learn from other countries</h2><p>Approaches from members that improved on this goal, and a context check before adapting them for {short(iso3)}</p></div>
            </header>
            {x.learn.length ? (
              <div className="learn-grid">
                {x.learn.map((l) => (
                  <div key={l.iso3} className="learn">
                    <div className="learn-head"><Flag iso3={l.iso3} size={30} /><div><strong>{short(l.iso3)}</strong><span>{l.model}</span></div></div>
                    <p>{l.programme || `Measured improvement in ${x.goal.headline.label.toLowerCase()} since 2010`}</p>
                    <div className="rd-buttons">
                      <button className="outline-btn xs" onClick={() => setThemeModal(goal)}>Compare outcomes <ArrowRight size={12} /></button>
                      <button className="outline-btn xs" onClick={() => setAdapt({ theme: goal, from: l.iso3, to: iso3 })}>Adapt for {short(iso3)} <ArrowRight size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="muted small">No member has yet shown measurable progress on this goal from a similar starting point.</p>}
          </section>
        </div>

        <div className="cg-right">
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><FileText size={24} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>How {short(iso3)} is implementing this goal</h2></div>
            </header>
            <nav className="gp-tabs" role="tablist">
              {[['overview', 'Overview'], ['regional', 'Regional strategy'], ['investments', 'Investments'], ['evidence', 'Evidence']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
              ))}
            </nav>
            {tab === 'overview' && <RegionTable x={x} limit={5} onStatus={setRegion} />}
            {tab === 'regional' && <RegionTable x={x} onStatus={setRegion} />}
            {tab === 'investments' && <InvestmentList x={x} />}
            {tab === 'evidence' && <EvidenceList x={x} />}
            {x.programme && <p className="small cg-prog"><strong>National programme:</strong> {x.programme}</p>}
          </section>

          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><MapPin size={24} color="#2563eb" /></div>
              <div className="ecard-titles"><h2>{short(iso3)}: regional view ({x.goal.label})</h2><p>Coloured by implementation status. Set a status in the table above.</p></div>
            </header>
            {!x.regions.length ? <p className="muted small">No open regional data for {x.country.name} on this goal.</p> : !hex.data ? <Loading /> : (
              <div className="cg-map">
                <RegionHexMap data={hex.data} height={360} labels="regions"
                  legendTitle="Implementation status"
                  colorOf={(regionId) => (statusByRegion[regionId] ? REGION_STATUS[statusByRegion[regionId]].color : null)}
                  legendItems={Object.entries(REGION_STATUS).map(([k, v]) => ({ id: k, label: `${v.label} (${counts[k]})`, color: v.color }))} />
                <p className="muted small" style={{ marginTop: 8 }}>{x.regionsCovered} of {x.regionsNeeding} regions needing action have a status beyond “not started”.</p>
              </div>
            )}
          </section>

          <section className="ecard">
            <h3 className="bm-h">Quick actions</h3>
            <div className="rd-buttons">
              <button className="outline-btn sm" onClick={() => navigate(`/goals?goal=${goal}`)}><BarChart3 size={14} /> Compare countries</button>
              <button className="outline-btn sm" onClick={() => setEditing(nextOpen)}><Pencil size={14} /> Update status</button>
              <button className="outline-btn sm" onClick={() => navigate(`/map/${iso3}/${goal}`)}><FileText size={14} /> View evidence</button>
              <button className="outline-btn sm" onClick={download}><Download size={14} /> Download report</button>
            </div>
          </section>
        </div>
      </div>

      <footer className="ecard gfoot">
        <span><strong>Data confidence:</strong> {x.regions.length ? 'Medium' : 'Low'}</span>
        <span className="muted small">Sources: World Bank WDI/PPI, {x.regions[0]?.source || 'national indicators'}, curated programme records, status updates in this dashboard</span>
        <span className="muted small">Last updated: {x.lastUpdated ? x.lastUpdated.slice(0, 10) : 'no status reported yet'}</span>
      </footer>

      {editing && <MilestoneModal iso3={iso3} name={x.country.name} goal={x.goal} milestone={editing} onClose={() => setEditing(null)} onSaved={() => setTick((t) => t + 1)} />}
      <ThemeModal themeId={themeModal} onClose={() => setThemeModal(null)} />
      {adapt && <AdaptModal {...adapt} onClose={() => setAdapt(null)} />}
    </div>
  );
}
