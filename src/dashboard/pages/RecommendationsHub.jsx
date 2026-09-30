import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight, ArrowRight, Building2, ChartColumnIncreasing, Check, ClipboardCopy, Download, FileText, Globe2,
  Layers, Lightbulb, ListChecks, Search, Sparkles, Table2, TrendingUp, Users, UsersRound, Wrench,
} from 'lucide-react';
import { apiPost, useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { askRecs } from '../assistant';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import Modal from '../components/Modal';
import ThemeIcon from '../components/ThemeIcon';
import { ErrorNote, Loading } from '../components/ui';
import { fmtInt, fmtUsd } from '../format';
import { ThemeModal } from './ExecutiveOverview';
import './executive.css';
import './map.css';
import './recs.css';

const CHIPS = ['Which countries need water security action?', 'How is Brazil addressing rural connectivity?', 'Show country actions for India', 'What can South Africa learn from others?'];
const TYPE_CLASS = { shared: 'ty-shared', joint: 'ty-joint', transfer: 'ty-transfer', national: 'ty-national', research: 'ty-research' };
const SECTOR_TO_THEME = { water: 'water', health: 'health', digital: 'digital', transport: 'transport', energy: 'energy', education: 'education', social: 'jobs', environment: 'air' };
const LEVEL_CLASS = { High: 'lv-high', Medium: 'lv-med', Low: 'lv-low', Unknown: 'lv-low' };
const short = (iso3) => (iso3 === 'ARE' ? 'UAE' : COUNTRY_NAMES[iso3]);

export default function RecommendationsHub() {
  const { country, sector, refreshKey } = useDashboard();
  const [tick, setTick] = useState(0);
  const data = useApi('/recs/overview', { t: tick, r: refreshKey });
  const [tab, setTab] = useState('shared');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [themeModal, setThemeModal] = useState(null);
  const [adapt, setAdapt] = useState(null); // { theme, from, to }
  const [planIso, setPlanIso] = useState(null);
  const [lifeFor, setLifeFor] = useState(null);
  const [brief, setBrief] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [q, setQ] = useState('');

  const d = data.data;
  const themeFilter = sector === 'all' ? null : SECTOR_TO_THEME[sector];

  const shared = useMemo(() => (d?.shared || []).filter((r) =>
    (!themeFilter || r.theme === themeFilter)
    && (country === 'ALL' || r.needCountries.includes(country) || r.mentorCountries.includes(country))), [d, themeFilter, country]);
  const shown = typeFilter === 'all' ? shared : shared.filter((r) => r.type === typeFilter);
  const plans = useMemo(() => (d?.plans || []).filter((p) => country === 'ALL' || p.iso3 === country), [d, country]);
  const transfers = useMemo(() => (d?.transfers || []).filter((t) =>
    (!themeFilter || t.theme === themeFilter) && (country === 'ALL' || t.to === country || t.from === country)), [d, themeFilter, country]);

  const allRecs = useMemo(() => (d ? [...d.shared, ...d.plans.flatMap((p) => p.all), ...d.transfers] : []), [d]);
  const selected = allRecs.find((r) => r.id === selectedId) || shown[0] || null;

  useEffect(() => { if (selectedId && !allRecs.some((r) => r.id === selectedId)) setSelectedId(null); }, [allRecs, selectedId]);

  const ask = async (question) => {
    if (!question.trim()) return;
    setQ(question);
    setAnswer({ question, pending: true });
    const a = await askRecs(question).catch((e) => ({ text: `Couldn't answer: ${e.message}`, bullets: [] }));
    setAnswer({ question, ...a });
  };

  const toggleStage = async (recId, stage, done) => {
    await apiPost('/recs/lifecycle', { recId, stage, done });
    setTick((t) => t + 1);
  };

  if (data.error) return <ErrorNote error={data.error} />;
  if (!d) return <Loading label="Matching needs with experience…" />;

  const typeCounts = shared.reduce((acc, r) => ({ ...acc, [r.type]: (acc[r.type] || 0) + 1 }), {});

  return (
    <div className="exec recs">
      {/* Ask bar */}
      <section className="ecard recs-ask">
        <div className="recs-ask-icon"><Sparkles size={26} color="#2563eb" fill="#2563eb" /></div>
        <h2>Ask VikasDrishti for recommendation insights</h2>
        <div className="recs-ask-right">
          <div className="recs-ask-row">
            <form className="recs-search" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
              <Search size={16} />
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which countries need water security action?" aria-label="Ask about recommendations" />
            </form>
            <button className="btn-brand" onClick={() => setBrief(true)}>Generate brief <ArrowRight size={15} /></button>
          </div>
          <div className="recs-chips">
            {CHIPS.map((c) => <button key={c} className="chip" onClick={() => ask(c)}>{c}{c.startsWith('What can') ? <ArrowRight size={13} /> : null}</button>)}
          </div>
        </div>
      </section>

      {answer && (
        <section className="ecard answer-card">
          <header>
            <Sparkles size={18} color="#7c3aed" /><strong>{answer.question}</strong>
            <button className="dash-icon-btn" onClick={() => setAnswer(null)} aria-label="Close answer">×</button>
          </header>
          {answer.pending ? <Loading label="Checking the data…" /> : (
            <>
              <p>{answer.text}</p>
              {answer.bullets?.length > 0 && <ul>{answer.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
              {answer.source && <small>Source: {answer.source}{answer.engine === 'gemini' ? ' · written by Gemini' : ''}</small>}
            </>
          )}
        </section>
      )}

      {/* KPIs */}
      <div className="recs-kpis">
        <Kpi tone="blue" icon={<UsersRound size={30} />} label="Shared BRICS priorities" value={d.kpis.sharedPriorities} sub="Goals several members share" />
        <Kpi tone="green" icon={<FileText size={30} />} label="Country action plans" value={d.kpis.countryPlans} sub="One per member country" />
        <Kpi tone="teal" icon={<ArrowLeftRight size={30} />} label="Knowledge transfer matches" value={d.kpis.transferMatches} sub={`${d.kpis.transferLearners} members can learn from others`} />
        <Kpi tone="purple" icon={<ChartColumnIncreasing size={30} />} label="Tracked recommendations" value={d.kpis.tracked} sub={`${d.kpis.inProgress} moving through the lifecycle`} />
      </div>

      {/* Main: tabs + detail */}
      <div className="recs-main">
        <section className="ecard recs-list">
          <nav className="recs-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'shared'} className={tab === 'shared' ? 'on' : ''} onClick={() => setTab('shared')}><Users size={18} /> Shared priorities</button>
            <button role="tab" aria-selected={tab === 'country'} className={tab === 'country' ? 'on' : ''} onClick={() => setTab('country')}><FileText size={18} /> Country recommendations</button>
            <button role="tab" aria-selected={tab === 'transfer'} className={tab === 'transfer' ? 'on' : ''} onClick={() => setTab('transfer')}><ArrowLeftRight size={18} /> Knowledge transfer</button>
          </nav>

          {tab === 'shared' && (
            <>
              <div className="recs-filters">
                <button className={`fchip ${typeFilter === 'all' ? 'on' : ''}`} onClick={() => setTypeFilter('all')}>All ({shared.length})</button>
                {Object.entries(d.types).filter(([k]) => typeCounts[k]).map(([k, t]) => (
                  <button key={k} className={`fchip ${typeFilter === k ? 'on' : ''}`} onClick={() => setTypeFilter(k)} title={t.note}>{t.label} ({typeCounts[k]})</button>
                ))}
                <Link to="/explorer" className="outline-btn sm browse"><Table2 size={15} /> Browse all records</Link>
              </div>
              <div className="table-wrap">
                <table className="dtable recs-table">
                  <thead><tr><th>#</th><th>Recommendation</th><th>Type</th><th>Countries</th><th>Why it matters</th><th /></tr></thead>
                  <tbody>
                    {shown.map((r, i) => (
                      <tr key={r.id} className={selected?.id === r.id ? 'selected' : ''} onClick={() => setSelectedId(r.id)}>
                        <td className="muted num">{i + 1}</td>
                        <td><span className="rec-name"><ThemeIcon icon={r.icon} color={r.color} size={17} />{r.label}</span></td>
                        <td><TypePill type={r.type} types={d.types} /></td>
                        <td><Flags isos={r.needCountries} /></td>
                        <td className="why-cell">{r.why}</td>
                        <td><button className="view-btn" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}>View recommendation <ArrowRight size={13} /></button></td>
                      </tr>
                    ))}
                    {!shown.length && <tr><td colSpan={6} className="muted">No shared recommendation matches these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === 'country' && (
            <div className="table-wrap">
              <table className="dtable recs-table">
                <thead><tr><th>Country</th><th>Top need</th><th className="r">Need</th><th>Recommended action</th><th>Learn from</th><th /></tr></thead>
                <tbody>
                  {plans.flatMap((p) => p.top.slice(0, country === 'ALL' ? 1 : 3).map((x) => (
                    <tr key={x.id} className={selected?.id === x.id ? 'selected' : ''} onClick={() => setSelectedId(x.id)}>
                      <td className="nowrap"><Flag iso3={p.iso3} /> <strong>{short(p.iso3)}</strong></td>
                      <td><span className="rec-name"><ThemeIcon icon={x.icon} color={x.color} size={16} />{x.label}</span></td>
                      <td className="r"><span className="tier-pill" style={{ '--tier': tierColor(x.score) }}>{x.score}</span></td>
                      <td className="why-cell">{x.action}{x.evidence.pilotRegions.length ? `, starting in ${x.evidence.pilotRegions.map((r) => r.name).slice(0, 2).join(' and ')}` : ''}</td>
                      <td><Flags isos={x.learnFrom.map((l) => l.iso3)} names={false} /></td>
                      <td><button className="view-btn" onClick={(e) => { e.stopPropagation(); setPlanIso(p.iso3); }}>Open plan <ArrowRight size={13} /></button></td>
                    </tr>
                  )))}
                </tbody>
              </table>
              {country === 'ALL' && <p className="muted small" style={{ padding: '8px 12px' }}>Showing each member’s top need. Pick a country in the filter to see its top three.</p>}
            </div>
          )}

          {tab === 'transfer' && (
            <div className="table-wrap">
              <table className="dtable recs-table">
                <thead><tr><th>From</th><th /><th>To</th><th>Theme</th><th>Model</th><th>Problem match</th><th>Context</th><th /></tr></thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className={selected?.id === t.id ? 'selected' : ''} onClick={() => setSelectedId(t.id)}>
                      <td className="nowrap"><Flag iso3={t.from} /> {short(t.from)}</td>
                      <td className="muted"><ArrowRight size={14} /></td>
                      <td className="nowrap"><Flag iso3={t.to} /> {short(t.to)}</td>
                      <td><span className="rec-name"><ThemeIcon icon={t.icon} color={t.color} size={15} />{t.label}</span></td>
                      <td className="why-cell">{t.model}</td>
                      <td><span className={`lv ${LEVEL_CLASS[t.match.problem]}`} title={t.match.problemNote}>{t.match.problem}</span></td>
                      <td><span className={`lv ${LEVEL_CLASS[t.match.context]}`} title={t.match.contextNote}>{t.match.context}</span></td>
                      <td><button className="view-btn" onClick={(e) => { e.stopPropagation(); setAdapt({ theme: t.theme, from: t.from, to: t.to }); }}>Adapt <ArrowRight size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Detail rec={selected} d={d} onTheme={setThemeModal} onAdapt={setAdapt} onLife={setLifeFor} onToggle={toggleStage} onPlan={setPlanIso} />
      </div>

      {/* Bottom row */}
      <div className="recs-bottom">
        <section className="ecard">
          <header className="mini-head">
            <FileText size={20} color="#2563eb" /><h2>Country action plans</h2>
            <button className="outline-btn sm" onClick={() => setTab('country')}>View all countries <ArrowRight size={13} /></button>
          </header>
          <div className="plan-rail">
            {plans.map((p) => (
              <div key={p.iso3} className="plan-card">
                <div className="plan-head"><Flag iso3={p.iso3} size={22} /><strong>{short(p.iso3)}</strong></div>
                <ul>{p.top.map((x) => <li key={x.theme}>{x.label}</li>)}</ul>
                <button className="outline-btn sm" onClick={() => setPlanIso(p.iso3)}>Open plan <ArrowRight size={13} /></button>
              </div>
            ))}
          </div>
        </section>

        <section className="ecard">
          <header className="mini-head">
            <ArrowLeftRight size={20} color="#2563eb" /><h2>Knowledge transfer opportunities</h2>
            <button className="outline-btn sm" onClick={() => setTab('transfer')}>View all matches <ArrowRight size={13} /></button>
          </header>
          <ul className="kt-list">
            {transfers.slice(0, 5).map((t, i) => (
              <li key={t.id}>
                <span className="nowrap"><Flag iso3={t.from} /> {short(t.from)}</span>
                <ArrowRight size={14} className="muted" />
                <span className="nowrap"><Flag iso3={t.to} /> {short(t.to)}</span>
                <span className="kt-model" title={t.model}>{t.label}: {t.model}</span>
                <button className="outline-btn xs" onClick={() => setAdapt({ theme: t.theme, from: t.from, to: t.to })}>{i % 2 ? 'View fit' : 'Compare approaches'} <ArrowRight size={12} /></button>
              </li>
            ))}
          </ul>
        </section>

        <Tracker d={d} onOpen={(id) => { setSelectedId(id); setLifeFor(id); }} />
      </div>

      <section className="ecard conf-strip">
        <div className="conf-title"><Layers size={22} color="#1d4ed8" /><div><strong>Data confidence and sources</strong><small>Several open sources inform these recommendations</small></div></div>
        {d.confidence.map((c, i) => {
          const lvl = c.value >= 0.8 ? 'High' : c.value >= 0.5 ? 'Medium' : 'Low';
          const Icon = [Users, Building2, Layers, Globe2][i];
          return (
            <div key={c.id} className="conf-item" title={`${Math.round(c.value * 100)}% coverage`}>
              <Icon size={20} className="muted" />
              <div>
                <small>{c.label}</small>
                <div className="conf-line"><span className="conf-track"><span style={{ width: `${c.value * 100}%`, background: lvl === 'High' ? '#22c55e' : lvl === 'Medium' ? '#f59e0b' : '#f97316' }} /></span><span className={`lv ${LEVEL_CLASS[lvl]}`}>{lvl}</span></div>
              </div>
            </div>
          );
        })}
      </section>

      <ThemeModal themeId={themeModal} onClose={() => setThemeModal(null)} />
      {adapt && <AdaptModal {...adapt} onClose={() => setAdapt(null)} />}
      {planIso && <PlanModal plan={d.plans.find((p) => p.iso3 === planIso)} onClose={() => setPlanIso(null)} onAdapt={(a) => { setPlanIso(null); setAdapt(a); }} />}
      {lifeFor && <LifecycleModal rec={allRecs.find((r) => r.id === lifeFor)} stages={d.stages} onToggle={toggleStage} onClose={() => setLifeFor(null)} />}
      {brief && <BriefModal d={d} shared={shared} transfers={transfers} plans={plans} country={country} onClose={() => setBrief(false)} />}
    </div>
  );
}

const tierColor = (s) => (s >= 70 ? '#e11d2e' : s >= 45 ? '#f97316' : s >= 25 ? '#eab308' : '#22c55e');

function Kpi({ tone, icon, label, value, sub }) {
  return (
    <div className={`rkpi tone-${tone}`}>
      <div className="rkpi-icon">{icon}</div>
      <div><div className="rkpi-label">{label}</div><div className="rkpi-value">{value}</div><div className="rkpi-sub">{sub}</div></div>
    </div>
  );
}

function TypePill({ type, types }) {
  return <span className={`type-pill ${TYPE_CLASS[type]}`} title={types[type]?.note}>{types[type]?.label}</span>;
}

function Flags({ isos, names = true }) {
  if (!isos.length) return <span className="muted">—</span>;
  return (
    <span className="flags-cell">
      <span className="flags">{isos.slice(0, 3).map((c) => <Flag key={c} iso3={c} size={20} />)}</span>
      {names && <span className="flag-names">{isos.slice(0, 2).map(short).join(', ')}{isos.length > 2 ? ` +${isos.length - 2}` : ''}</span>}
    </span>
  );
}

/* ── Detail panel ─────────────────────────────────── */
function Detail({ rec, d, onTheme, onAdapt, onLife, onToggle, onPlan }) {
  const navigate = useNavigate();
  if (!rec) return <section className="ecard recs-detail"><p className="muted">Select a recommendation.</p></section>;

  const isShared = rec.id.startsWith('shared:');
  const isTransfer = rec.id.startsWith('transfer:');
  const needIsos = isShared ? rec.needCountries : isTransfer ? [rec.to] : [rec.iso3];
  const expIsos = isShared ? rec.mentorCountries : isTransfer ? [rec.from] : rec.learnFrom.map((l) => l.iso3);
  const bars = isShared
    ? [['Demand intensity', rec.components.demand], ['Infrastructure gap', rec.components.gap], ['Population affected', rec.components.population], ['Investment mismatch', rec.components.mismatch]]
    : isTransfer ? [['Need in receiving member', rec.need]]
      : [['Regional need (peak)', rec.score], ['National gap', rec.evidence.nationalScore], ['Regions affected', rec.evidence.regionsMeasured ? Math.round((rec.evidence.regionsAffected / rec.evidence.regionsMeasured) * 100) : null]];
  const actions = isShared ? rec.actions : isTransfer
    ? [`Study ${short(rec.from)}’s ${rec.model}`, `Check fit against ${short(rec.to)}’s context before piloting`, 'Agree outcome measures with both ministries']
    : [rec.action, ...(rec.evidence.pilotRegions.length ? [`Pilot first in ${rec.evidence.pilotRegions.map((r) => r.name).join(', ')}`] : []), ...(rec.learnFrom.length ? [`Draw on ${rec.learnFrom.map((l) => `${short(l.iso3)} (${l.model})`).join(', ')}`] : [])];
  const impl = isShared ? rec.implementations.slice(0, 3) : expIsos.slice(0, 2).map((iso) => ({ iso3: iso, role: 'mentor', status: 'Mature model', text: (isTransfer ? rec.model : rec.learnFrom.find((l) => l.iso3 === iso)?.model) || '' }))
    .concat(needIsos.slice(0, 1).map((iso) => ({ iso3: iso, role: 'need', status: 'Emerging', text: 'Needs region-level adaptation' })));
  const title = isShared ? rec.label : isTransfer ? `${rec.label}: ${short(rec.from)} → ${short(rec.to)}` : `${short(rec.iso3)}: ${rec.label}`;
  const type = isShared ? rec.type : isTransfer ? 'transfer' : 'national';

  return (
    <section className="ecard recs-detail">
      <header className="rd-head">
        <div className="rd-title">
          <ThemeIcon icon={rec.icon} color={rec.color} size={26} />
          <h2>{title}</h2>
          <TypePill type={type} types={d.types} />
        </div>
        <div className="rd-score"><small>Priority score</small><b>{rec.score ?? rec.need}</b></div>
      </header>
      <p className="rd-line"><Globe2 size={16} /> Countries needing action: <Flags isos={needIsos} /></p>
      <p className="rd-line"><Globe2 size={16} /> Countries with relevant implementation experience: {expIsos.length ? <Flags isos={expIsos} /> : <span className="muted">none yet: a research opportunity</span>}</p>

      <div className="rd-grid">
        <div>
          <h3 className="bm-h">Why this recommendation?</h3>
          <ul className="why-bars">
            {bars.filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => (
              <li key={k}><span>{k}</span><span className="wb-track"><span style={{ width: `${v}%` }} /></span><b>{v}</b></li>
            ))}
          </ul>
          {!isShared && !isTransfer && rec.evidence.requests12m && <p className="muted small" style={{ marginTop: 6 }}>{fmtInt(rec.evidence.requests12m)} citizen requests in 12 months</p>}
        </div>
        <div className="rd-action">
          <h3 className="bm-h"><Lightbulb size={16} color="#1d4ed8" /> {isShared ? 'Recommended BRICS action' : 'Recommended action'}</h3>
          <ul>{actions.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      </div>

      <h3 className="bm-h">How countries are implementing this</h3>
      <div className="impl-grid">
        {impl.map((x) => (
          <div key={`${x.iso3}-${x.role}`} className="impl-card">
            <div className="impl-head"><Flag iso3={x.iso3} size={22} /><strong>{short(x.iso3)}</strong></div>
            <p>{x.text || 'Improvement since 2010'}</p>
            <span className={`impl-status ${x.status === 'Mature model' ? 'st-mature' : x.status === 'Active' ? 'st-active' : 'st-emerging'}`}>{x.status}</span>
            {x.role === 'mentor'
              ? <button className="outline-btn xs" onClick={() => onTheme(rec.theme)}>View implementation <ArrowRight size={12} /></button>
              : x.status === 'Active'
                ? <button className="outline-btn xs" onClick={() => onTheme(rec.theme)}>Compare outcomes <ArrowRight size={12} /></button>
                : <button className="outline-btn xs" onClick={() => expIsos[0] && onAdapt({ theme: rec.theme, from: expIsos[0], to: x.iso3 })} disabled={!expIsos[0]}>Adapt for {short(x.iso3)} <ArrowRight size={12} /></button>}
          </div>
        ))}
      </div>

      <h3 className="bm-h">Recommendation lifecycle</h3>
      <ol className="stepper">
        {d.stages.map(([k, label], i) => {
          const done = !!rec.lifecycle?.[k];
          return (
            <li key={k} className={done ? 'done' : ''}>
              <button onClick={() => onToggle(rec.id, k, !done)} aria-pressed={done} title={done ? `Done ${rec.lifecycle[k].slice(0, 10)}. Click to undo` : 'Mark this stage done'}>
                {done ? <Check size={13} strokeWidth={3} /> : null}
              </button>
              <span>{label}</span>
              {i < d.stages.length - 1 && <i className={done ? 'on' : ''} />}
            </li>
          );
        })}
      </ol>

      <div className="rd-buttons">
        <button className="outline-btn" onClick={() => (isShared ? navigate(`/map/${rec.needCountries[0]}/${rec.theme}`) : isTransfer ? navigate(`/map/${rec.to}/${rec.theme}`) : navigate(`/map/${rec.iso3}/${rec.theme}`))}><FileText size={15} /> View evidence</button>
        <button className="outline-btn" onClick={() => onTheme(rec.theme)}><ChartColumnIncreasing size={15} /> Compare countries</button>
        <button className="outline-btn" onClick={() => (!isShared && !isTransfer ? onPlan(rec.iso3) : expIsos[0] && onAdapt({ theme: rec.theme, from: expIsos[0], to: needIsos[0] }))} disabled={isShared && !expIsos[0]}><Wrench size={15} /> Adapt solution</button>
        <button className="btn-brand" onClick={() => onLife(rec.id)}><TrendingUp size={15} /> Track progress</button>
      </div>
    </section>
  );
}

/* ── Tracker ──────────────────────────────────────── */
function Tracker({ d, onOpen }) {
  const rows = d.tracker.length ? d.tracker : d.shared.slice(0, 4).map((r) => ({ id: r.id, label: r.label, icon: r.icon, color: r.color, stage: null, progress: 0 }));
  const color = (p) => (p >= 0.8 ? '#8b5cf6' : p >= 0.5 ? '#22c55e' : p > 0 ? '#f59e0b' : '#94a3b8');
  return (
    <section className="ecard">
      <header className="mini-head">
        <ListChecks size={20} color="#2563eb" /><h2>Implementation tracker</h2>
      </header>
      <table className="tracker">
        <thead><tr><th>Recommendation</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r.id)}>
              <td><span className="rec-name sm"><ThemeIcon icon={r.icon} color={r.color} size={14} />{r.iso3 ? `${short(r.iso3)}: ` : r.from ? `${short(r.from)}→${short(r.to)}: ` : ''}{r.label}</span></td>
              <td><span className="trk-status"><i style={{ background: color(r.progress) }} />{r.stage || 'Not started'}</span></td>
              <td className="trk-bar"><span className="wb-track"><span style={{ width: `${r.progress * 100}%`, background: color(r.progress) }} /></span><b>{Math.round(r.progress * 100)}%</b></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!d.tracker.length && <p className="muted small" style={{ marginTop: 8 }}>Nothing tracked yet. Tick a lifecycle stage on any recommendation to start.</p>}
    </section>
  );
}

/* ── Modals ───────────────────────────────────────── */
export function AdaptModal({ theme, from, to, onClose }) {
  const s = useApi('/recs/adapt', { theme, from, to });
  const [proposal, setProposal] = useState(false);
  const x = s.data;
  const fmt = (v, unit) => (v === null || v === undefined ? '—' : unit === 'US$' ? fmtUsd(v) : unit === 'people' ? fmtInt(v) : `${v.toFixed(1)}${unit.startsWith('%') ? '%' : ''}`);
  return (
    <Modal open onClose={onClose} wide icon={x && <ThemeIcon icon={x.theme.icon} color={x.theme.color} size={22} />}
      title={x ? `Adapt ${x.from.name}’s approach for ${x.to.name}` : 'Loading…'}
      subtitle={x && `${x.theme.label}: context check before any pilot. Nothing is copied as-is.`}>
      {s.error ? <ErrorNote error={s.error} /> : !x ? <Loading /> : (
        <>
          <div className="adapt-flow">
            <div className="af-box">
              <small>{x.from.name} model</small>
              <strong><Flag iso3={x.from.iso3} /> {x.from.model || `${x.theme.label} improvement since 2010`}</strong>
            </div>
            <ArrowRight className="muted" />
            <div className="af-box">
              <small>{x.to.name} context check</small>
              <strong>{x.context.length} indicators compared</strong>
            </div>
            <ArrowRight className="muted" />
            <div className="af-box af-out">
              <small>Adapted recommendation</small>
              <strong>{x.recommendation}</strong>
            </div>
          </div>
          <div className="adapt-grid">
            <div>
              <h3 className="bm-h">Context check</h3>
              <table className="dtable">
                <thead><tr><th>Indicator</th><th className="r"><Flag iso3={x.from.iso3} /> {x.from.name}</th><th className="r"><Flag iso3={x.to.iso3} /> {x.to.name}</th></tr></thead>
                <tbody>{x.context.map((r) => <tr key={r.key}><td>{r.label}</td><td className="r num">{fmt(r.from, r.unit)}</td><td className="r num">{fmt(r.to, r.unit)}</td></tr>)}</tbody>
              </table>
            </div>
            <div>
              <h3 className="bm-h">Why this match?</h3>
              <ul className="match-list">
                <li><span>Problem similarity</span><span className={`lv ${LEVEL_CLASS[x.match.problem]}`}>{x.match.problem}</span><small>{x.match.problemNote}</small></li>
                <li><span>Rural context</span><span className={`lv ${LEVEL_CLASS[x.match.context]}`}>{x.match.context}</span><small>{x.match.contextNote}</small></li>
                <li><span>Income level</span><span className={`lv ${LEVEL_CLASS[x.match.income]}`}>{x.match.income}</span><small>{x.match.incomeNote}</small></li>
                <li><span>Implementation maturity</span><span className={`lv ${LEVEL_CLASS[x.match.maturity]}`}>{x.match.maturity}</span></li>
                <li><span>Outcome evidence</span><small>{x.match.evidence}</small></li>
              </ul>
              <h3 className="bm-h">Adjustments for {x.to.name}</h3>
              <ul className="consider">{x.considerations.map((c) => <li key={c}>{c}</li>)}</ul>
              {x.pilots.length > 0 && (
                <>
                  <h3 className="bm-h">Suggested pilot regions</h3>
                  <ul className="list-plain">{x.pilots.map((p) => <li key={p.region}><span>{p.region}</span><span className="muted small">need {p.score} · {p.detail}</span></li>)}</ul>
                </>
              )}
            </div>
          </div>
          <div className="rd-buttons" style={{ marginTop: 14 }}>
            <Link className="outline-btn" to={`/map/${x.to.iso3}/${x.theme.id}`}><FileText size={15} /> View evidence</Link>
            <button className="btn-brand" onClick={() => setProposal(true)}><FileText size={15} /> Create project proposal</button>
          </div>
          {proposal && <ProposalModal a={x} onClose={() => setProposal(false)} />}
        </>
      )}
    </Modal>
  );
}

function proposalText(a) {
  return `# Project proposal: ${a.theme.label} in ${a.to.name}

## Problem
${a.pilots.length ? a.pilots.map((p) => `- ${p.region}: need score ${p.score} (${p.detail}; ${p.source})`).join('\n') : `- National need in ${a.to.name} (no regional data available)`}

## Reference model
${a.from.name}: ${a.from.model || `${a.theme.label} improvement since 2010`}
- ${a.match.problemNote}
- ${a.match.evidence}

## Proposed pilot
${a.recommendation}

## Adjustments for ${a.to.name}
${a.considerations.map((c) => `- ${c}`).join('\n')}

## Context comparison
${a.context.map((r) => `- ${r.label}: ${a.from.name} ${r.from ?? 'n/a'} vs ${a.to.name} ${r.to ?? 'n/a'} ${r.unit}`).join('\n')}

## Next steps
1. Review with the relevant ministry in ${a.to.name}
2. Confirm funding and pilot sites
3. Agree outcome measures with ${a.from.name}'s implementing agency

Generated by VikasDrishti from World Bank WDI, DHS regional surveys and Fala.BR data. Validate locally before adoption.
`;
}

function ProposalModal({ a, onClose }) {
  const text = proposalText(a);
  const [copied, setCopied] = useState(false);
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown' }));
    const el = document.createElement('a');
    el.href = url; el.download = `proposal-${a.to.iso3}-${a.theme.id}.md`; el.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal open onClose={onClose} title="Project proposal draft" subtitle={`${a.theme.label}: ${a.to.name}, drawing on ${a.from.name}`}>
      <pre className="proposal">{text}</pre>
      <div className="rd-buttons">
        <button className="outline-btn" onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); }}><ClipboardCopy size={15} /> {copied ? 'Copied' : 'Copy'}</button>
        <button className="btn-brand" onClick={download}><Download size={15} /> Download .md</button>
      </div>
    </Modal>
  );
}

function PlanModal({ plan, onClose, onAdapt }) {
  const navigate = useNavigate();
  return (
    <Modal open onClose={onClose} wide icon={<Flag iso3={plan.iso3} size={28} />} title={`${plan.name}: priority recommendations`}
      subtitle="Generated only from this member’s own evidence. Other members appear as reference solutions.">
      <div className="plan-list">
        {plan.top.map((x) => (
          <div key={x.id} className="plan-item">
            <div className="pi-head">
              <ThemeIcon icon={x.icon} color={x.color} size={20} /><strong>{x.label}</strong>
              <span className="tier-pill" style={{ '--tier': tierColor(x.score) }}>{x.score}</span>
            </div>
            <div className="pi-grid">
              <div>
                <h4>Evidence</h4>
                <ul className="list-plain">
                  <li><span>Source</span><span className="muted">{x.evidence.basis === 'citizen-demand' ? 'Citizen requests' : x.evidence.basis === 'regional-survey' ? 'Regional survey' : 'National estimate'}</span></li>
                  {x.evidence.requests12m && <li><span>Citizen requests, 12 mo</span><b>{fmtInt(x.evidence.requests12m)}</b></li>}
                  <li><span>Regions affected</span><b>{x.evidence.regionsMeasured ? `${x.evidence.regionsAffected} of ${x.evidence.regionsMeasured}` : 'n/a'}</b></li>
                  <li><span>National gap</span><b>{x.evidence.nationalScore ?? '—'}</b></li>
                  <li><span>Investment, 10 yrs</span><b>{x.evidence.investment ? fmtUsd(x.evidence.investment) : '—'}</b></li>
                  <li><span>Trend</span><b className={x.evidence.trend?.improving ? 'good' : 'bad'}>{x.evidence.trend ? `${x.evidence.trend.improving ? 'Improving' : 'Worsening'} since ${x.evidence.trend.since}` : '—'}</b></li>
                </ul>
                {x.evidence.nationalText && <p className="muted small" style={{ marginTop: 6 }}>{x.evidence.nationalText}</p>}
              </div>
              <div>
                <h4>Recommended action</h4>
                <p>{x.action}.</p>
                {x.evidence.pilotRegions.length > 0 && <p className="muted small" style={{ marginTop: 6 }}>Start in: {x.evidence.pilotRegions.map((r) => `${r.name} (${r.score})`).join(', ')}</p>}
                {x.programme && <p className="small" style={{ marginTop: 6 }}>Existing programme: {x.programme}</p>}
                <h4>Relevant BRICS learning</h4>
                <ul className="consider">{x.learnFrom.length ? x.learnFrom.map((l) => <li key={l.iso3}><Flag iso3={l.iso3} /> {short(l.iso3)}: {l.model}</li>) : <li>No member has a proven model yet</li>}</ul>
              </div>
            </div>
            <div className="rd-buttons">
              <button className="outline-btn sm" onClick={() => navigate(`/map/${plan.iso3}/${x.theme}`)}><FileText size={14} /> View evidence</button>
              <button className="outline-btn sm" disabled={!x.learnFrom[0]} onClick={() => onAdapt({ theme: x.theme, from: x.learnFrom[0].iso3, to: plan.iso3 })}><ArrowLeftRight size={14} /> Compare solutions</button>
              <button className="btn-brand sm" disabled={!x.learnFrom[0]} onClick={() => onAdapt({ theme: x.theme, from: x.learnFrom[0].iso3, to: plan.iso3 })}><FileText size={14} /> Create project proposal</button>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LifecycleModal({ rec, stages, onToggle, onClose }) {
  if (!rec) return null;
  const label = rec.id.startsWith('country:') ? `${short(rec.iso3)}: ${rec.label}` : rec.id.startsWith('transfer:') ? `${short(rec.from)} → ${short(rec.to)}: ${rec.label}` : rec.label;
  return (
    <Modal open onClose={onClose} title="Track progress" subtitle={label}>
      <ul className="life-list">
        {stages.map(([k, l]) => {
          const done = !!rec.lifecycle?.[k];
          return (
            <li key={k}>
              <label><input type="checkbox" className="tick" checked={done} onChange={() => onToggle(rec.id, k, !done)} /> {l}</label>
              <span className="muted small">{done ? `Done ${rec.lifecycle[k].slice(0, 10)}` : 'Pending'}</span>
            </li>
          );
        })}
      </ul>
      <p className="muted small" style={{ marginTop: 10 }}>Progress is saved for everyone using this dashboard.</p>
    </Modal>
  );
}

function BriefModal({ d, shared, transfers, plans, country, onClose }) {
  const [gem, setGem] = useState(null);
  const text = `# BRICS recommendation brief${country !== 'ALL' ? `: ${COUNTRY_NAMES[country]}` : ''}

## Top shared priorities
${shared.slice(0, 4).map((r) => `- ${r.label} (${d.types[r.type].label}, priority ${r.score}): needs action in ${r.needCountries.map(short).join(', ')}${r.mentorCountries.length ? `; experience in ${r.mentorCountries.map(short).join(', ')}` : ''}. Suggested: ${r.actions[0] || '—'}`).join('\n')}

## Knowledge transfer
${transfers.slice(0, 5).map((t) => `- ${short(t.from)} → ${short(t.to)}: ${t.label}, ${t.model}. ${t.match.problemNote}`).join('\n')}

## Country actions
${plans.map((p) => `- ${p.name}: ${p.top[0]?.label} (need ${p.top[0]?.score}): ${p.top[0]?.action}`).join('\n')}

Sources: World Bank WDI, DHS regional surveys, Fala.BR citizen requests.
`;
  useEffect(() => {
    let live = true;
    import('../../services/gemini').then(async (g) => {
      if (!g.isApiKeyConfigured()) return;
      const t = await g.answerPolicyQuestion('Write a 5-sentence executive summary of these recommendations for senior BRICS policymakers.', { brief: text }).catch(() => null);
      if (live) setGem(t);
    });
    return () => { live = false; };
  }, [text]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([gem ? `${gem}\n\n${text}` : text], { type: 'text/markdown' }));
    const el = document.createElement('a');
    el.href = url; el.download = 'brics-recommendation-brief.md'; el.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Modal open onClose={onClose} wide icon={<Sparkles size={22} color="#2563eb" />} title="Recommendation brief" subtitle="Built from the current filters">
      {gem && <div className="note" style={{ marginBottom: 12 }}><div>{gem}</div></div>}
      <pre className="proposal">{text}</pre>
      <div className="rd-buttons">
        <button className="outline-btn" onClick={() => navigator.clipboard?.writeText(text)}><ClipboardCopy size={15} /> Copy</button>
        <button className="btn-brand" onClick={download}><Download size={15} /> Download .md</button>
      </div>
    </Modal>
  );
}

