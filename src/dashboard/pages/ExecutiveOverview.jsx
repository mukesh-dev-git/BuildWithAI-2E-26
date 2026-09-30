import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, ArrowUp, ChartNoAxesColumn, ChevronRight, ClipboardList, Database, FileText, Globe, Handshake,
  Info, MapPin, Maximize2, MessageCircle, Scale, Send, Sparkles, Target, TriangleAlert, Users, Network, ChartColumn,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { askAssistant } from '../assistant';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import HexMap from '../components/HexMap';
import Modal from '../components/Modal';
import ThemeIcon, { SECTOR_ICON } from '../components/ThemeIcon';
import { ErrorNote, Loading } from '../components/ui';
import { fmtCompact, fmtInt, fmtMonth, fmtPct, fmtUsd } from '../format';
import './executive.css';

const TIER_COLORS = { critical: '#e11d2e', high: '#f97316', moderate: '#eab308', low: '#22c55e' };
const INSIGHT_TONES = ['blue', 'red', 'green', 'amber'];
// Bold theme names and figures in brief sentences, as in the executive design
function Emph({ text, themes }) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const labels = themes.map((t) => t.label).sort((a, b) => b.length - a.length).map(escape);
  const figures = String.raw`\d+(?:\.\d+)?%?(?: of \d+)?(?: members| critical hotspots| countries)?`;
  const re = new RegExp(`(${[...labels, figures].join('|')})`, 'gi');
  return text.split(re).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

const SUGGESTIONS = ['Which countries face water scarcity?', 'Compare healthcare gaps', 'Why are these hotspots critical?'];

export default function ExecutiveOverview() {
  const { params, country, sector, setSector } = useDashboard();
  const exec = useApi('/executive', { months: params.months });
  const hex = useApi('/hexmap', { sector: params.sector });
  const [themeModal, setThemeModal] = useState(null);
  const [riskModal, setRiskModal] = useState(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);

  if (exec.error) return <ErrorNote error={exec.error} />;
  if (!exec.data) return <Loading label="Building the executive overview…" />;
  const d = exec.data;

  const ask = (q) => { setPendingQuestion(q); setBriefOpen(true); };

  return (
    <div className="exec">
      <Kpis k={d.kpis} />

      <div className="exec-row exec-row-a">
        <BriefCard d={d} onExpand={() => setBriefOpen(true)} onAsk={ask} />
        <RisksCard risks={d.risks} months={d.window.months} onExplore={setRiskModal} />
      </div>

      <div className="exec-row exec-row-a">
        <GoalsCard themes={d.themes} total={d.kpis.countries} onOpen={setThemeModal} highlight={sector} />
        <section className="ecard mapcard">
          <CardHead icon={<MapPin size={24} className="ic-blue" fill="#2563eb" color="#fff" />} title="Demand Hotspot Map"
            subtitle="Regional concentration of citizen demand and infrastructure need across BRICS"
            actions={(
              <label className="mini-select">
                <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Map sector">
                  <option value="all">All sectors</option>
                  {Object.entries(SECTOR_ICON).map(([id]) => <option key={id} value={id}>{d.risks.find((r) => r.sector === id)?.label || d.themes.find((t) => t.sector === id)?.label || 'Food & nutrition'}</option>)}
                </select>
              </label>
            )} />
          {hex.error ? <ErrorNote error={hex.error} /> : !hex.data ? <Loading label="Placing hexagons…" /> : <HexMap data={hex.data} country={country} height={320} />}
          <p className="ecard-foot">Brazil hexes show regional citizen-demand priority (Fala.BR). Other members show national need from World Bank indicators.</p>
        </section>
      </div>

      <Snapshots snaps={d.snapshots} country={country} />

      <div className="exec-row exec-row-c">
        <AlignmentCard rows={d.alignment} />
        <CooperationCard coop={d.cooperation} onOpen={setThemeModal} />
        <ConfidenceCard rows={d.confidence} />
      </div>

      <ThemeModal themeId={themeModal} onClose={() => setThemeModal(null)} />
      <RiskModal risk={riskModal} onClose={() => setRiskModal(null)} onTheme={(id) => { setRiskModal(null); setThemeModal(id); }} />
      <BriefModal open={briefOpen} onClose={() => { setBriefOpen(false); setPendingQuestion(null); }} exec={d} initialQuestion={pendingQuestion} />
    </div>
  );
}

function CardHead({ icon, title, subtitle, actions }) {
  return (
    <header className="ecard-head">
      {icon && <div className="ecard-icon">{icon}</div>}
      <div className="ecard-titles">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="ecard-actions">{actions}</div>}
    </header>
  );
}

/* ── KPI tiles ─────────────────────────────────────────── */
function Kpis({ k }) {
  const tiles = [
    { tone: 'blue', icon: <Users size={26} />, deco: <Globe size={40} strokeWidth={1.3} />, label: 'Countries covered', value: k.countries, sub: 'All BRICS members' },
    { tone: 'red', icon: <TriangleAlert size={26} />, deco: <ChartColumn size={34} strokeWidth={1.6} />, label: 'Critical hotspots', value: k.criticalHotspots, sub: 'Regions needing urgent attention' },
    { tone: 'green', icon: <ClipboardList size={26} />, deco: <FileText size={34} strokeWidth={1.4} />, label: 'Priority projects', value: k.priorityProjects, sub: 'High-priority recommendations' },
    { tone: 'purple', icon: <Target size={26} />, deco: <Network size={34} strokeWidth={1.4} />, label: 'Shared goals', value: k.sharedGoals, sub: 'Themes shared by half the members' },
    { tone: 'amber', icon: <Database size={26} />, deco: <ChartNoAxesColumn size={34} strokeWidth={1.8} />, label: 'Records analysed', value: fmtCompact(k.recordsAnalysed), sub: 'Citizen feedback + public data' },
  ];
  return (
    <div className="kpi-row">
      {tiles.map((t) => (
        <div key={t.label} className={`ktile tone-${t.tone}`}>
          <div className="ktile-icon">{t.icon}</div>
          <div className="ktile-body">
            <div className="ktile-label">{t.label}</div>
            <div className="ktile-value">{t.value}</div>
            <div className="ktile-sub">{t.sub}</div>
          </div>
          <div className="ktile-deco" aria-hidden="true">{t.deco}</div>
        </div>
      ))}
    </div>
  );
}

/* ── AI executive brief ───────────────────────────────── */
function BriefCard({ d, onExpand, onAsk }) {
  const navigate = useNavigate();
  return (
    <section className="ecard brief">
      <CardHead icon={<Sparkles size={28} color="#7c3aed" fill="#7c3aed" />}
        title={<>AI Executive Brief <span className="pill-soft">For senior policymakers</span></>}
        subtitle={`Key insights from cross-country analysis (last ${d.window.months} months)`}
        actions={<button className="btn-brand" onClick={onExpand}>Expand AI Brief <Maximize2 size={15} /></button>} />
      <div className="brief-grid">
        <ol className="brief-list">
          {d.brief.map((b, i) => (
            <li key={i}><span className={`brief-num tone-${INSIGHT_TONES[i % 4]}`}>{i + 1}</span><span><Emph text={b.text} themes={d.themes} /></span></li>
          ))}
        </ol>
        <div className="brief-actions">
          <p className="brief-hint">Ask questions about countries, sectors and hotspots</p>
          <button className="row-btn" onClick={onExpand}><MessageCircle size={17} /> Explain this analysis <ChevronRight size={16} /></button>
          <button className="row-btn" onClick={() => navigate('/recommendations/regional')}><FileText size={17} /> View evidence <ChevronRight size={16} /></button>
          <button className="row-btn" onClick={() => navigate('/countries')}><ChartNoAxesColumn size={17} /> Compare countries <ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="brief-chips">
        <span>Try asking:</span>
        {SUGGESTIONS.map((q) => <button key={q} className="chip" onClick={() => onAsk(q)}>{q}</button>)}
      </div>
    </section>
  );
}

function BriefModal({ open, onClose, exec, initialQuestion }) {
  const [messages, setMessages] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const asked = useRef(null);
  const listRef = useRef(null);

  const send = async (question) => {
    if (!question.trim() || busy) return;
    setQ('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: question }]);
    const a = await askAssistant(question, exec).catch((e) => ({ text: `Couldn't answer: ${e.message}`, bullets: [] }));
    setMessages((m) => [...m, { role: 'assistant', ...a }]);
    setBusy(false);
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  // A suggestion chip on the card opens the modal with its question already asked
  useEffect(() => {
    if (!open) { asked.current = null; return; }
    if (initialQuestion && asked.current !== initialQuestion) {
      asked.current = initialQuestion;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestion]);

  const top = exec.themes.slice(0, 4);
  return (
    <Modal open={open} onClose={onClose} wide icon={<Sparkles size={22} color="#7c3aed" fill="#7c3aed" />}
      title="AI Executive Brief" subtitle={`Cross-country analysis · citizen data through ${fmtMonth(exec.window.to)}`}>
      <div className="bm-grid">
        <div>
          <h3 className="bm-h">Key insights</h3>
          <ol className="brief-list">
            {exec.brief.map((b, i) => <li key={i}><span className={`brief-num tone-${INSIGHT_TONES[i % 4]}`}>{i + 1}</span><span><Emph text={b.text} themes={exec.themes} /></span></li>)}
          </ol>
          <h3 className="bm-h">Where the shared priorities are</h3>
          <ul className="bm-themes">
            {top.map((t) => (
              <li key={t.id}>
                <ThemeIcon icon={t.icon} color={t.color} size={16} />
                <strong>{t.label}</strong>
                <span className="bm-flags">{t.priorityCountries.slice(0, 6).map((c) => <Flag key={c.iso3} iso3={c.iso3} size={18} />)}</span>
              </li>
            ))}
          </ul>
          <h3 className="bm-h">How this is calculated</h3>
          <p className="bm-p">Theme need scores (0–100) come from the latest World Bank indicators for each member; 25+ counts as a priority. Hotspots and projects come from the priority engine over {fmtCompact(exec.kpis.feedbackRecords)} Fala.BR citizen records located to Brazilian states. Only {exec.kpis.countriesWithFeedback} of {exec.kpis.countries} members publish open record-level citizen feedback.</p>
        </div>
        <div className="bm-chat">
          <h3 className="bm-h">Ask about countries, sectors and hotspots</h3>
          <div className="bm-messages" ref={listRef}>
            {!messages.length && (
              <div className="bm-empty">
                {SUGGESTIONS.concat(['Which countries need digital connectivity most?', 'What are India’s top needs?']).map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <p>{m.text}</p>
                {m.bullets?.length > 0 && <ul>{m.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>}
                {m.source && <small>Source: {m.source}{m.engine === 'gemini' ? ' · written by Gemini' : ''}</small>}
              </div>
            ))}
            {busy && <div className="msg assistant"><p className="muted">Checking the data…</p></div>}
          </div>
          <form className="bm-input" onSubmit={(e) => { e.preventDefault(); send(q); }}>
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which countries have water scarcity?" aria-label="Question" />
            <button className="btn-brand" type="submit" disabled={busy || !q.trim()}><Send size={15} /> Ask</button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

/* ── Emerging risks ───────────────────────────────────── */
function RisksCard({ risks, months, onExplore }) {
  const navigate = useNavigate();
  return (
    <section className="ecard">
      <CardHead icon={<TriangleAlert size={28} color="#fff" fill="#e11d2e" />} title="Emerging Risks"
        subtitle={`Fastest-rising citizen demand (last ${months} months vs the ${months} before)`}
        actions={<button className="link-btn" onClick={() => navigate('/recommendations/regional')}>View all risks <ArrowRight size={15} /></button>} />
      <ul className="risk-list">
        {risks.slice(0, 4).map((r) => (
          <li key={r.theme}>
            <span className="risk-icon" style={{ background: `${r.color}18` }}><ThemeIcon icon={r.icon} color={r.color} size={18} /></span>
            <strong className="risk-name">{r.label} demand</strong>
            <span className={`risk-growth ${r.growth >= 0 ? 'up' : 'down'}`}>
              {r.growth >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}{r.growth >= 0 ? '+' : ''}{(r.growth * 100).toFixed(0)}%
            </span>
            <span className="risk-aff">{r.countriesAffected} countries affected</span>
            <button className="explore-btn" onClick={() => onExplore(r)}>Explore <ArrowRight size={14} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RiskModal({ risk, onClose, onTheme }) {
  const detail = useApi(risk ? '/overview' : null, risk ? { country: 'BRA', sector: risk.sector, months: 36 } : {});
  const recs = useApi(risk ? '/recommendations' : null, risk ? { sector: risk.sector, basis: 'citizen-demand', limit: 5 } : {});
  const navigate = useNavigate();
  if (!risk) return null;
  const trend = (detail.data?.trend || []).filter((t) => t.sector === risk.sector);
  return (
    <Modal open onClose={onClose} wide icon={<ThemeIcon icon={risk.icon} color={risk.color} size={22} />}
      title={`${risk.label} demand`} subtitle={`${risk.growth >= 0 ? '+' : ''}${(risk.growth * 100).toFixed(0)}% change in citizen requests · ${fmtInt(risk.requests)} requests in the latest period`}>
      <div className="rm-grid">
        <div>
          <h3 className="bm-h">Monthly citizen requests (Brazil, Fala.BR)</h3>
          <div style={{ height: 200 }}>
            {detail.loading ? <Loading /> : (
              <ResponsiveContainer>
                <LineChart data={trend} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} minTickGap={24} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
                  <Tooltip labelFormatter={fmtMonth} formatter={(v) => [fmtInt(v), 'Requests']} contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
                  <Line dataKey="n" stroke={risk.color} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <h3 className="bm-h">Where demand is concentrated</h3>
          <ul className="list-plain">
            {(recs.data?.items || []).map((r) => (
              <li key={r.id}><span>{r.region}</span><span className="muted num">score {r.score} · {fmtInt(r.requests12m)} requests</span></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="bm-h">Members where this is a priority</h3>
          <ul className="rm-countries">
            {risk.countries.map((c) => <li key={c}><Flag iso3={c} size={22} /> {COUNTRY_NAMES[c]}</li>)}
            {!risk.countries.length && <li className="muted">No member scores 25+ on this theme.</li>}
          </ul>
          <div className="rm-actions">
            <button className="btn-brand" onClick={() => onTheme(risk.theme)}>See how countries are responding</button>
            <button className="row-btn" onClick={() => navigate('/map')}><MapPin size={16} /> Open demand map <ChevronRight size={16} /></button>
          </div>
          <p className="bm-p muted">Growth is measured in Brazil’s open citizen data, the only record-level source among BRICS members.</p>
        </div>
      </div>
    </Modal>
  );
}

/* ── Common goals ─────────────────────────────────────── */
function GoalsCard({ themes, total, onOpen, highlight }) {
  const shown = themes.slice(0, 6);
  return (
    <section className="ecard goals">
      <CardHead icon={<Target size={30} color="#16a34a" />} title="Common development goals across countries"
        subtitle="Number of BRICS members where the issue is a high priority"
        actions={<span className="muted small">See how countries are responding</span>} />
      <ul className="goal-list">
        {shown.map((t, i) => (
          <li key={t.id} className={highlight !== 'all' && highlight === t.sector ? 'hl' : ''}>
            <ThemeIcon icon={t.icon} color={t.color} size={18} />
            <span className="goal-name">{t.label}</span>
            <span className="goal-track"><span className="goal-fill" style={{ width: `${(t.priorityCount / total) * 100}%`, background: t.color }} /></span>
            <span className="goal-count"><b>{t.priorityCount}</b> countries</span>
            <button className="goal-btn" onClick={() => onOpen(t.id)}>{i % 2 ? 'View country approaches' : 'Compare implementations'} <ChevronRight size={14} /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ThemeModal({ themeId, onClose }) {
  const state = useApi(themeId ? `/themes/${themeId}` : null);
  if (!themeId) return null;
  const t = state.data?.theme;
  return (
    <Modal open onClose={onClose} wide icon={t && <ThemeIcon icon={t.icon} color={t.color} size={22} />}
      title={t ? `${t.label}: how members are responding` : 'Loading…'}
      subtitle={t && `Need score, progress on ${t.headline.label.toLowerCase()}, infrastructure investment and flagship programmes`}>
      {!state.data ? <Loading /> : (
        <div className="table-wrap">
          <table className="dtable tm-table">
            <thead>
              <tr><th>Member</th><th className="r">Need</th><th>Current situation</th><th>{t.headline.label} trend</th><th className="r">Change</th>{state.data.ppiSector && <th className="r">PPI investment, 10 yrs</th>}<th>Flagship programme</th></tr>
            </thead>
            <tbody>
              {state.data.rows.map((r) => (
                <tr key={r.iso3}>
                  <td className="nowrap"><Flag iso3={r.iso3} size={20} /> <strong>{r.name}</strong></td>
                  <td className="r"><span className="tier-pill" style={{ '--tier': TIER_COLORS[r.tier] || '#94a3b8' }}>{r.score ?? '—'}</span></td>
                  <td style={{ minWidth: 180, fontSize: 12.5 }}>{r.summary}</td>
                  <td style={{ width: 120 }}><Spark series={r.series} color={t.color} /></td>
                  <td className="r nowrap" style={{ color: r.improvement ? (r.improvement.improved ? 'var(--d-good)' : 'var(--d-bad)') : undefined }}>
                    {r.improvement ? `${r.improvement.change >= 0 ? '+' : ''}${r.improvement.change.toFixed(1)} since ${r.improvement.from.year}` : '—'}
                  </td>
                  {state.data.ppiSector && <td className="r">{r.investment10y ? fmtUsd(r.investment10y) : '—'}</td>}
                  <td style={{ minWidth: 220, fontSize: 12.5 }}>{r.programme || <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="bm-p muted" style={{ marginTop: 10 }}>Need scores and trends: World Bank WDI. Investment: World Bank PPI (private participation in infrastructure). Programmes are curated from public sources for orientation. Verify details before citing.</p>
        </div>
      )}
    </Modal>
  );
}

function Spark({ series, color }) {
  if (!series?.length) return <span className="muted">—</span>;
  return (
    <div style={{ height: 30 }}>
      <ResponsiveContainer>
        <LineChart data={series}><Line dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Country snapshots ────────────────────────────────── */
function Snapshots({ snaps, country }) {
  const rail = useRef(null);
  return (
    <section className="ecard">
      <CardHead icon={<ChartNoAxesColumn size={28} color="#2563eb" strokeWidth={2.6} />} title="Country snapshots"
        subtitle="Top 3 observed development needs in each BRICS member"
        actions={<Link className="link-pill" to="/countries">View all countries <ArrowRight size={15} /></Link>} />
      <div className="snap-wrap">
        <div className="snap-rail" ref={rail}>
          {snaps.map((s) => (
            <Link to="/countries" key={s.iso3} className={`snap ${country !== 'ALL' && country !== s.iso3 ? 'dim' : ''}`}>
              <div className="snap-head"><Flag iso3={s.iso3} size={24} /><strong>{s.name}</strong></div>
              <ul>
                {s.top.map((t) => <li key={t.theme}><i style={{ background: TIER_COLORS[t.tier] }} />{t.label}</li>)}
              </ul>
            </Link>
          ))}
        </div>
        <button className="snap-next" onClick={() => rail.current?.scrollBy({ left: 360, behavior: 'smooth' })} aria-label="Scroll countries"><ChevronRight size={20} /></button>
      </div>
    </section>
  );
}

/* ── Bottom row ───────────────────────────────────────── */
const STATUS = { gap: ['Potential gap', 'st-gap'], review: ['Review', 'st-review'], aligned: ['Aligned', 'st-ok'] };
const SECTOR_LABEL = { water: 'Water', energy: 'Energy', transport: 'Transport', digital: 'Digital' };

function AlignmentCard({ rows }) {
  const max = Math.max(...rows.flatMap((r) => [r.demandShare, r.investmentShare]), 0.01);
  return (
    <section className="ecard">
      <CardHead icon={<Scale size={28} color="#1d4ed8" />} title="Demand vs investment alignment"
        subtitle="Share of citizen demand vs share of infrastructure investment (Brazil, 5 years)" />
      <table className="align-table">
        <thead><tr><th>Area</th><th>Citizen demand</th><th>Public investment</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sector}>
              <td><span className="align-area"><ThemeIcon icon={SECTOR_ICON[r.sector]} color={SECTOR_COLOR[r.sector]} size={15} />{SECTOR_LABEL[r.sector]}</span></td>
              <td><span className="abar" title={fmtPct(r.demandShare, 1)}><span style={{ width: `${(r.demandShare / max) * 100}%`, background: '#f25c6e' }} /></span></td>
              <td><span className="abar" title={fmtPct(r.investmentShare, 1)}><span style={{ width: `${(r.investmentShare / max) * 100}%`, background: '#3b82f6' }} /></span></td>
              <td><span className={`status ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
const SECTOR_COLOR = { water: '#3b82f6', energy: '#22c55e', transport: '#f97316', digital: '#8b5cf6' };

function CooperationCard({ coop, onOpen }) {
  const cards = [...coop.shared.slice(0, 2), ...coop.exchanges.filter((e) => !coop.shared.slice(0, 2).some((s) => s.theme === e.theme)).slice(0, 2)];
  return (
    <section className="ecard">
      <CardHead icon={<Handshake size={30} color="#1d4ed8" />} title="Cooperation opportunities" subtitle="Where BRICS members can learn from one another" />
      <div className="coop-grid">
        {cards.map((c) => (
          <button key={`${c.kind}-${c.theme}`} className="coop" onClick={() => onOpen(c.theme)}>
            <span className="coop-icon" style={{ background: `${c.color}18` }}><ThemeIcon icon={c.icon} color={c.color} size={20} /></span>
            <span className="coop-body">
              <strong>{c.label}</strong>
              <small>{c.kind === 'shared' ? 'Shared challenge' : 'Knowledge exchange'}</small>
              <small className="coop-who">
                {c.kind === 'shared'
                  ? c.countries.map((x) => COUNTRY_NAMES[x]).join(', ')
                  : `${c.mentors.map((x) => COUNTRY_NAMES[x]).join(', ')} → ${c.learners.map((x) => COUNTRY_NAMES[x]).join(', ')}`}
              </small>
            </span>
            <ChevronRight size={16} className="coop-caret" />
          </button>
        ))}
      </div>
    </section>
  );
}

function ConfidenceCard({ rows }) {
  const colors = ['#22c55e', '#0ea5e9', '#8b5cf6', '#0891b2'];
  return (
    <section className="ecard">
      <CardHead icon={<Database size={26} color="#1d4ed8" />} title="Data confidence and sources" subtitle="Coverage of the data used for recommendations"
        actions={<Link to="/sources" className="icon-link" aria-label="Data sources"><Info size={17} /></Link>} />
      <ul className="conf-list">
        {rows.map((r, i) => (
          <li key={r.id} title={r.note}>
            <span className="conf-label">{r.label}</span>
            <span className="conf-track"><span style={{ width: `${r.value * 100}%`, background: colors[i] }} /></span>
            <span className="conf-val">{Math.round(r.value * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
