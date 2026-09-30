import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown, ArrowRight, ArrowUp, ChevronLeft, ChevronRight, CircleCheck, FileText, Globe2, Info, Layers, Layers3,
  Calendar, Search, Send, Sparkles, Table2, X, GitCompare, MapPin, ListChecks,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { apiPost, useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { askMap } from '../assistant';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import Modal from '../components/Modal';
import RegionHexMap, { tierOf } from '../components/RegionHexMap';
import ThemeIcon from '../components/ThemeIcon';
import { ErrorNote, Loading } from '../components/ui';
import { fmtCompact, fmtInt, fmtMonth, fmtUsd } from '../format';
import './executive.css';
import './map.css';

const QUESTIONS = [
  'Which countries have severe water scarcity?',
  'Where is healthcare demand increasing fastest?',
  'Which regions have high demand but low investment?',
  'How is Brazil addressing rural connectivity?',
];
const LAYER_LEGEND = { priority: 'Priority intensity (all evidence)', demand: 'Demand intensity (citizen requests)', need: 'Infrastructure need (surveys & indicators)' };
const CONFIDENCE = {
  'citizen-demand': { label: 'High', value: 0.9, note: 'Individual citizen requests for this region' },
  'regional-survey': { label: 'Medium', value: 0.65, note: 'Household survey estimate for this region' },
  'national-indicator': { label: 'Low', value: 0.3, note: 'National figure applied to every region' },
};
const SECTOR_TO_THEME = { water: 'water', health: 'health', digital: 'digital', transport: 'transport', energy: 'energy', education: 'education', social: 'jobs', environment: 'air', agriculture: 'nutrition' };

/** The dashboard's sector filter and the map's themes are two views of one choice. */
function useMapTheme() {
  const { sector, setSector, meta } = useDashboard();
  const theme = sector === 'all' ? 'all' : SECTOR_TO_THEME[sector] || 'all';
  const setTheme = (t, themes) => setSector(t === 'all' ? 'all' : themes.find((x) => x.id === t)?.sector || 'all');
  return { theme, setTheme, meta };
}

export default function DemandIntelligenceMap() {
  const { country, setCountry, months, setMonths, mapLayer, setMapLayer, refreshKey, setSector } = useDashboard();
  const { theme, setTheme } = useMapTheme();
  const navigate = useNavigate();
  const [showCities, setShowCities] = useState(true);
  const [selected, setSelected] = useState(null); // { regionId, theme }
  const [topTheme, setTopTheme] = useState('water');
  const [answer, setAnswer] = useState(null);
  const [asking, setAsking] = useState(false);
  const [q, setQ] = useState('');
  const [actionTick, setActionTick] = useState(0);

  const hex = useApi('/hotspots/hexmap', { theme, layer: mapLayer, r: refreshKey });
  const cities = useApi(showCities ? '/hotspots' : null, { country: 'BRA', limit: 120, r: refreshKey });
  const top6 = useApi('/hotspots/list', { theme: topTheme, country, size: 6, t: actionTick, r: refreshKey });
  const needs = useApi('/hotspots/topneeds', { r: refreshKey });
  const themes = top6.data?.themes || [];

  // Default the selected hotspot to the top critical one
  useEffect(() => {
    if (!selected && top6.data?.items[0]) setSelected({ regionId: top6.data.items[0].regionId, theme: top6.data.items[0].theme });
  }, [top6.data, selected]);

  const ask = async (question) => {
    if (!question.trim()) return;
    setQ(question);
    setAsking(true);
    setAnswer({ question, pending: true });
    const a = await askMap(question).catch((e) => ({ text: `Couldn't answer: ${e.message}`, bullets: [] }));
    setAnswer({ question, ...a });
    setAsking(false);
  };

  const toggleAction = async (item) => {
    await apiPost('/hotspots/action', { key: item.key, done: !item.addressed });
    setActionTick((t) => t + 1);
  };

  const maxCity = Math.max(1, ...(cities.data?.hotspots || []).map((c) => c.n));
  const dots = showCities && (mapLayer !== 'need') ? (cities.data?.hotspots || []).map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, r: 0.35 + 1.1 * Math.sqrt(c.n / maxCity) })) : [];

  const clearFilters = () => { setCountry('ALL'); setSector('all'); setMonths(12); setMapLayer('priority'); setShowCities(true); };

  return (
    <div className="exec dmap">
      {/* Ask row */}
      <div className="ask-row">
        <section className="ecard ask-card">
          <div className="ask-icon"><Sparkles size={22} color="#fff" fill="#fff" /></div>
          <div className="ask-body">
            <h2>Ask VikasDrishti about this map</h2>
            <form className="ask-form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
              <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Which countries have severe water scarcity?" aria-label="Ask about this map" />
              <button type="submit" disabled={asking || !q.trim()} aria-label="Ask"><Send size={17} /></button>
            </form>
          </div>
        </section>
        <section className="ecard try-card">
          <p className="try-label">Try these questions:</p>
          <div className="try-grid">
            {QUESTIONS.map((x) => <button key={x} className="try-q" onClick={() => ask(x)}>{x}</button>)}
          </div>
        </section>
      </div>

      {answer && (
        <section className="ecard answer-card">
          <header>
            <Sparkles size={18} color="#7c3aed" />
            <strong>{answer.question}</strong>
            <button className="dash-icon-btn" onClick={() => setAnswer(null)} aria-label="Close answer"><X size={16} /></button>
          </header>
          {answer.pending ? <Loading label="Checking the data…" /> : (
            <>
              <p>{answer.text}</p>
              {answer.bullets?.length > 0 && <ul>{answer.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
              {answer.source && <small>Source: {answer.source}{answer.engine === 'gemini' ? ' · written by Gemini' : ''}</small>}
              {answer.themeId && <button className="link-btn" onClick={() => setTheme(answer.themeId, themes)}>Show on the map <ArrowRight size={14} /></button>}
            </>
          )}
        </section>
      )}

      {/* Filter bar */}
      <div className="filterbar">
        <PillSelect icon={Globe2} value={country} onChange={setCountry} label="Country">
          <option value="ALL">BRICS members</option>
          {Object.entries(COUNTRY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </PillSelect>
        <PillSelect icon={Layers} value={theme} onChange={(v) => setTheme(v, themes)} label="Sector">
          <option value="all">All sectors</option>
          {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </PillSelect>
        <PillSelect icon={Calendar} value={months} onChange={(v) => setMonths(Number(v))} label="Time window">
          {[3, 6, 12, 24, 36].map((m) => <option key={m} value={m}>Last {m} months</option>)}
        </PillSelect>
        <PillSelect icon={Layers3} value={mapLayer} onChange={setMapLayer} label="Map layer">
          <option value="priority">Priority layer</option>
          <option value="demand">Demand layer</option>
          <option value="need">Need layer</option>
        </PillSelect>
        <label className="switch">
          <span>Show city hotspots</span>
          <input type="checkbox" checked={showCities} onChange={(e) => setShowCities(e.target.checked)} />
          <i aria-hidden="true" />
        </label>
        <button className="clear-btn" onClick={clearFilters}>Clear filters</button>
      </div>

      {/* Map + top 6 + selected */}
      <div className="dmap-main">
        <section className="ecard map-card">
          {hex.error ? <ErrorNote error={hex.error} /> : !hex.data ? <Loading label="Placing hexagons…" /> : (
            <RegionHexMap data={hex.data} country={country} height={380} dots={dots}
              selectedRegion={selected?.regionId}
              legendTitle={LAYER_LEGEND[mapLayer]}
              onSelect={(regionId) => setSelected({ regionId, theme: hex.data.regionBest[regionId]?.theme || (theme === 'all' ? 'water' : theme) })}
              footer={<Link to="/sources" className="map-src"><Info size={14} /> View data sources &amp; method</Link>} />
          )}
        </section>

        <section className="ecard top6">
          <header className="top6-head">
            <h2>Top 6 critical hotspots</h2>
            <label className="theme-pick">
              <ThemeIcon icon={themes.find((t) => t.id === topTheme)?.icon || 'droplet'} color={themes.find((t) => t.id === topTheme)?.color} size={14} />
              <select value={topTheme} onChange={(e) => setTopTheme(e.target.value)} aria-label="Hotspot sector">
                {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
          </header>
          {!top6.data ? <Loading /> : (
            <ol className="top6-list">
              {top6.data.items.map((x, i) => (
                <li key={x.key} className={`${selected?.regionId === x.regionId ? 'on' : ''} ${x.addressed ? 'done' : ''}`}>
                  <span className="top6-n">{i + 1}</span>
                  <button className="top6-name" onClick={() => setSelected({ regionId: x.regionId, theme: x.theme })}>
                    {x.region}, <span className="muted">{COUNTRY_NAMES[x.iso3]}</span>
                  </button>
                  <span className="tier-dot" style={{ '--c': tierOf(x.score)?.color }}>{tierOf(x.score)?.label}</span>
                  <span className="top6-val num">{x.requests12m ? fmtCompact(x.requests12m) : x.score}</span>
                  <Trend x={x} />
                  <input type="checkbox" className="tick" checked={x.addressed} onChange={() => toggleAction(x)}
                    aria-label={`Mark ${x.region} as addressed`} title={x.addressed ? 'Addressed — click to reopen' : 'Mark as addressed'} />
                </li>
              ))}
            </ol>
          )}
          <div className="top6-foot">
            <button className="outline-btn" onClick={() => document.getElementById('hotspot-table')?.scrollIntoView({ behavior: 'smooth' })}>View all hotspots <ArrowRight size={14} /></button>
          </div>
        </section>

        <SelectedHotspot sel={selected} onClose={() => setSelected(null)} actionTick={actionTick}
          onAsk={(txt) => ask(txt)} onToggle={toggleAction} />
      </div>

      <TopNeeds needs={needs} onOpen={(iso3, t) => navigate(`/map/${iso3}/${t}`)} />

      <AnalysisTabs themes={themes} theme={theme} setTheme={(t) => setTheme(t, themes)} country={country}
        actionTick={actionTick} onToggle={toggleAction} onSelect={(x) => { setSelected({ regionId: x.regionId, theme: x.theme }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </div>
  );
}

function PillSelect({ icon: Icon, value, onChange, label, children }) {
  return (
    <label className="pill-select">
      <Icon size={16} strokeWidth={1.8} />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>{children}</select>
    </label>
  );
}

function Trend({ x }) {
  if (x.growth === undefined || x.growth === null) return <span className="trend muted" title={x.source}>{x.basis === 'regional-survey' ? 'survey' : '—'}</span>;
  const up = x.growth >= 0;
  return <span className={`trend ${up ? 'up' : 'down'}`}>{up ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{Math.abs(x.growth * 100).toFixed(0)}%</span>;
}

/* ── Selected hotspot ─────────────────────────────── */
function Silhouette({ geometry, iso3 }) {
  const path = useMemo(() => {
    if (!geometry) return null;
    const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    const pts = polys.flatMap((p) => p[0]);
    const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const k = Math.cos((lat0 * Math.PI) / 180);
    const xs = pts.map((p) => p[0] * k);
    const ys = pts.map((p) => -p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const d = polys.map((p) => `M${p[0].map(([x, y]) => `${(x * k).toFixed(3)},${(-y).toFixed(3)}`).join('L')}Z`).join('');
    const pad = Math.max(x1 - x0, y1 - y0) * 0.12;
    return { d, vb: `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}` };
  }, [geometry]);
  return (
    <div className="sil">
      <div className="sil-flag"><Flag iso3={iso3} size={34} /></div>
      {path && <svg viewBox={path.vb} preserveAspectRatio="xMidYMid meet"><path d={path.d} /></svg>}
    </div>
  );
}

function SelectedHotspot({ sel, onClose, actionTick, onAsk, onToggle }) {
  const navigate = useNavigate();
  const [compare, setCompare] = useState(false);
  const d = useApi(sel ? `/hotspots/detail/${encodeURIComponent(sel.regionId)}/${sel.theme}` : null, { t: actionTick });

  if (!sel) {
    return (
      <section className="ecard selcard empty">
        <header className="sel-head"><MapPin size={18} color="#e11d2e" /><h2>Selected hotspot</h2></header>
        <p className="muted">Click any region on the map or a hotspot in the list.</p>
      </section>
    );
  }
  const x = d.data;
  const tier = x && tierOf(x.score);
  const conf = x && CONFIDENCE[x.basis];
  return (
    <section className="ecard selcard">
      <header className="sel-head"><MapPin size={18} color="#e11d2e" /><h2>Selected hotspot</h2></header>
      {d.error ? <ErrorNote error={d.error} /> : !x ? <Loading /> : (
        <>
          <div className="sel-banner">
            <Silhouette geometry={x.geometry} iso3={x.iso3} />
            <button className="sel-close" onClick={onClose} aria-label="Clear selection"><X size={15} /></button>
          </div>
          <div className="sel-title">
            <div>
              <strong>{x.region}, {COUNTRY_NAMES[x.iso3]}</strong>
              <span>{x.themeLabel}</span>
            </div>
            <span className="tier-pill-soft" style={{ '--c': tier?.color }}>{tier?.label}</span>
          </div>
          <div className="sel-grid">
            <div className="sel-stat">
              <small>{x.basis === 'citizen-demand' ? 'Citizen requests' : 'Measured situation'}</small>
              <b>{x.basis === 'citizen-demand' ? fmtInt(x.requests12m) : `${x.score} / 100 need`}</b>
            </div>
            <div className="sel-stat">
              <small>Population</small>
              <b>{x.population ? fmtCompact(x.population) : '—'}</b>
            </div>
            <div className="sel-stat trend-stat" style={{ gridRow: 'span 2' }}>
              <small>Trend</small>
              {x.growth !== undefined && x.growth !== null ? (
                <b className={x.growth >= 0 ? 'up' : 'down'}>{x.growth >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}{Math.abs(x.growth * 100).toFixed(0)}%</b>
              ) : <b className="muted" style={{ fontSize: 13 }}>Single survey</b>}
              {x.trend?.length > 1 && (
                <div style={{ height: 34 }}>
                  <ResponsiveContainer><LineChart data={x.trend}><Line dataKey="n" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="sel-stat">
              <small>Infrastructure score</small>
              <b>{x.infraScore ?? '—'} / 100</b>
            </div>
            <div className="sel-stat">
              <small>National investment, 10 yrs</small>
              <b>{x.nationalInvestment ? fmtUsd(x.nationalInvestment) : '—'}</b>
            </div>
          </div>
          <p className="sel-detail">{x.detail}</p>
          <div className="conf-row" title={conf.note}>
            <span>Data confidence</span>
            <span className="conf-track"><span style={{ width: `${conf.value * 100}%`, background: conf.value > 0.6 ? '#22c55e' : conf.value > 0.4 ? '#eab308' : '#f97316' }} /></span>
            <b>{conf.label}</b>
            <Info size={14} className="muted" />
          </div>
          <div className="sel-actions">
            <button className="btn-brand sm" onClick={() => (x.basis === 'citizen-demand' ? navigate(`/recommendations?focus=${encodeURIComponent(`${x.regionId}:${x.sector}`)}`) : navigate(`/map/${x.iso3}/${x.theme}`))}>
              <FileText size={14} /> View evidence
            </button>
            <button className="outline-btn sm" onClick={() => onAsk(`How is ${COUNTRY_NAMES[x.iso3]} addressing ${x.themeLabel.toLowerCase()}?`)}><Sparkles size={14} /> Ask AI</button>
            <button className="outline-btn sm" onClick={() => setCompare(true)}><GitCompare size={14} /> Compare similar regions</button>
          </div>
          <label className="addr-row">
            <input type="checkbox" className="tick" checked={x.addressed} onChange={() => onToggle(x)} />
            {x.addressed ? `Addressed${x.addressedAt ? ` on ${x.addressedAt.slice(0, 10)}` : ''}` : 'Mark as addressed'}
          </label>
          <Modal open={compare} onClose={() => setCompare(false)} title={`Regions similar to ${x.region}`} subtitle={`${x.themeLabel}: closest need scores in other members`}>
            <table className="dtable">
              <thead><tr><th>Region</th><th className="r">Score</th><th>Situation</th><th>Source</th></tr></thead>
              <tbody>
                {[x, ...x.similar].map((s, i) => (
                  <tr key={s.key} className={i === 0 ? 'selected' : ''}>
                    <td className="nowrap"><Flag iso3={s.iso3} /> {s.region}</td>
                    <td className="r"><span className="tier-pill" style={{ '--tier': tierOf(s.score)?.color }}>{s.score}</span></td>
                    <td style={{ fontSize: 12.5 }}>{s.detail}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{s.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Modal>
        </>
      )}
    </section>
  );
}

/* ── Top needs by country ─────────────────────────── */
function TopNeeds({ needs, onOpen }) {
  const [table, setTable] = useState(false);
  return (
    <section className="ecard">
      <header className="ecard-head">
        <div className="ecard-icon"><ListChecks size={26} color="#16a34a" /></div>
        <div className="ecard-titles"><h2>Top needs by country</h2><p>Click a need to see every region affected on its own map</p></div>
        <div className="ecard-actions"><button className="link-pill" onClick={() => setTable((t) => !t)}><Table2 size={15} /> {table ? 'View as cards' : 'View as table'}</button></div>
      </header>
      {!needs.data ? <Loading /> : table ? (
        <div className="table-wrap">
          <table className="dtable">
            <thead><tr><th>Country</th><th>Evidence</th><th>1st need</th><th>2nd need</th><th>3rd need</th></tr></thead>
            <tbody>
              {needs.data.map((c) => (
                <tr key={c.iso3}>
                  <td className="nowrap"><Flag iso3={c.iso3} /> <strong>{c.name}</strong></td>
                  <td className="muted" style={{ fontSize: 12 }}>{c.basis.replace('-', ' ')}</td>
                  {c.top.map((t) => <td key={t.theme}><button className="need-link" onClick={() => onOpen(c.iso3, t.theme)}>{t.label} <span className="muted">({t.score})</span></button></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="needs-rail">
          {needs.data.map((c) => (
            <div key={c.iso3} className="need-card">
              <button className="need-head" onClick={() => onOpen(c.iso3, c.top[0]?.theme)}>
                <Flag iso3={c.iso3} size={22} /><strong>{c.iso3 === 'ARE' ? 'UAE' : c.name}</strong><ChevronRight size={16} />
              </button>
              <ol>
                {c.top.map((t, i) => (
                  <li key={t.theme}>
                    <button className={i === 0 ? 'first' : ''} onClick={() => onOpen(c.iso3, t.theme)} title={`${t.label}: need ${t.score}${t.regions ? `, ${t.regions} regions affected` : ' (national estimate)'}`}>
                      <span className="need-n">{i + 1}</span>{t.label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── Analysis tabs ────────────────────────────────── */
const TABS = [
  ['hotspots', 'Hotspots by sector'], ['trend', 'Demand trend'], ['infra', 'Demand vs infrastructure'],
  ['invest', 'Demand vs investment'], ['compare', 'Cross-country comparison'],
];

function AnalysisTabs({ themes, theme, setTheme, country, actionTick, onToggle, onSelect }) {
  const [tab, setTab] = useState('hotspots');
  const active = theme === 'all' ? 'water' : theme;
  return (
    <section className="ecard tabs-card" id="hotspot-table">
      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
      {tab === 'hotspots' && <HotspotTable themes={themes} theme={active} setTheme={setTheme} country={country} actionTick={actionTick} onToggle={onToggle} onSelect={onSelect} />}
      {tab === 'trend' && <TrendTab themes={themes} theme={active} />}
      {tab === 'infra' && <InfraTab themes={themes} theme={active} />}
      {tab === 'invest' && <InvestTab />}
      {tab === 'compare' && <CompareTab themes={themes} theme={active} />}
    </section>
  );
}

const STATUS_OF = (x) => (x.addressed ? ['Addressed', 'st-ok'] : x.score >= 70 ? ['Potential gap', 'st-gap'] : x.score >= 45 ? ['Review', 'st-review'] : ['Monitor', 'st-neutral']);

function HotspotTable({ themes, theme, setTheme, country: globalCountry, actionTick, onToggle, onSelect }) {
  const [country, setCountry] = useState(globalCountry);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('score');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [national, setNational] = useState(false);

  useEffect(() => setCountry(globalCountry), [globalCountry]);
  useEffect(() => { const t = setTimeout(() => setQuery(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setPage(1), [theme, country, status, sort, query, size, national]);

  const list = useApi('/hotspots/list', { theme, country, status, sort, q: query, page, size, national: national ? 1 : '', t: actionTick });
  const current = themes.find((t) => t.id === theme);
  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / size)) : 1;

  return (
    <div className="ht">
      <aside className="ht-side">
        {themes.map((t) => (
          <button key={t.id} className={t.id === theme ? 'on' : ''} onClick={() => setTheme(t.id)}>
            <span className="ht-ic" style={{ background: `${t.color}1f` }}><ThemeIcon icon={t.icon} color={t.color} size={14} /></span>
            <span className="ht-name">{t.label}</span>
            <span className="ht-count">{list.data?.counts?.[t.id] ?? '·'}</span>
          </button>
        ))}
        <p className="muted small" style={{ padding: '8px 10px' }}>Counts: regions scoring moderate or above, with regional evidence.</p>
      </aside>
      <div className="ht-main">
        <header className="ht-head">
          {current && <ThemeIcon icon={current.icon} color={current.color} size={26} />}
          <div className="ht-titles">
            <h2>{current?.label} hotspots</h2>
            <p>Regions ranked by priority for {current?.label.toLowerCase()}. Tick a region once it has been addressed.</p>
          </div>
          <div className="ht-filters">
            <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
              <option value="ALL">All countries</option>
              {Object.entries(COUNTRY_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="">All regions</option>
              <option value="open">Open</option>
              <option value="addressed">Addressed</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="score">Priority: high to low</option>
              <option value="score-asc">Priority: low to high</option>
              <option value="requests">Citizen requests</option>
              <option value="growth">Fastest growth</option>
            </select>
            <label className="ht-search"><Search size={14} /><input type="search" placeholder="Search region…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          </div>
        </header>
        <label className="ht-national"><input type="checkbox" checked={national} onChange={(e) => setNational(e.target.checked)} /> Include regions that only have a national estimate (Russia, China, Iran, UAE)</label>
        {list.error ? <ErrorNote error={list.error} /> : !list.data ? <Loading /> : (
          <>
            <div className="table-wrap">
              <table className="dtable ht-table">
                <thead>
                  <tr>
                    <th aria-label="Addressed" title="Addressed"><CircleCheck size={15} /></th>
                    <th>#</th><th>Region / district</th><th>Country</th><th className="r">Citizen requests</th><th>Intensity</th>
                    <th>Trend (6 mo)</th><th className="r">Population</th><th className="r">Infrastructure score</th><th className="r">National investment</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((x, i) => {
                    const [label, cls] = STATUS_OF(x);
                    return (
                      <tr key={x.key} className={x.addressed ? 'done' : ''}>
                        <td><input type="checkbox" className="tick" checked={x.addressed} onChange={() => onToggle(x)} aria-label={`Mark ${x.region} as addressed`} /></td>
                        <td className="muted num">{(page - 1) * size + i + 1}</td>
                        <td><button className="need-link strong" onClick={() => onSelect(x)}>{x.region}</button><div className="muted" style={{ fontSize: 11.5 }}>{x.detail}</div></td>
                        <td className="nowrap"><Flag iso3={x.iso3} /> {COUNTRY_NAMES[x.iso3]}</td>
                        <td className="r num">{x.requests12m ? fmtInt(x.requests12m) : <span className="muted" title={x.source}>survey</span>}</td>
                        <td className="nowrap"><span className="tier-dot" style={{ '--c': tierOf(x.score)?.color }}>{tierOf(x.score)?.label}</span></td>
                        <td><Trend x={x} /></td>
                        <td className="r num">{x.population ? fmtCompact(x.population) : '—'}</td>
                        <td className="r num">{x.infraScore ?? '—'}</td>
                        <td className="r num">{x.nationalInvestment ? fmtUsd(x.nationalInvestment) : '—'}</td>
                        <td><span className={`status ${cls}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                  {!list.data.items.length && <tr><td colSpan={11} className="muted">No regions match. Try including national estimates or another sector.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="ht-pager">
              <div className="pages">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button>
                {pageList(page, pages).map((p, i) => (p === '…' ? <span key={`e${i}`}>…</span> : <button key={p} className={p === page ? 'on' : ''} onClick={() => setPage(p)}>{p}</button>))}
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} aria-label="Next page"><ChevronRight size={16} /></button>
              </div>
              <div className="rows">
                Rows per page
                <select value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Rows per page">{[10, 25, 50].map((n) => <option key={n}>{n}</option>)}</select>
                <span>{(page - 1) * size + 1}–{Math.min(page * size, list.data.total)} of {list.data.total}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function pageList(page, pages) {
  const set = new Set([1, 2, 3, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => { if (i && p - sorted[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

function TrendTab({ themes, theme }) {
  const t = themes.find((x) => x.id === theme);
  const data = useApi('/overview', { country: 'BRA', sector: t?.sector, months: 36 });
  const growth = useApi('/hotspots/list', { theme, basis: 'citizen-demand', sort: 'growth', size: 8 });
  const trend = (data.data?.trend || []).filter((r) => r.sector === t?.sector);
  return (
    <div className="tab-grid">
      <div>
        <h3 className="bm-h">Monthly citizen requests: {t?.label} (Brazil, Fala.BR)</h3>
        <div style={{ height: 260 }}>
          {!data.data ? <Loading /> : (
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 6, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="var(--d-border)" vertical={false} />
                <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} minTickGap={24} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip labelFormatter={fmtMonth} formatter={(v) => [fmtInt(v), 'Requests']} contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
                <Line dataKey="n" stroke={t?.color} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div>
        <h3 className="bm-h">Fastest-growing regions</h3>
        <ul className="list-plain">
          {(growth.data?.items || []).map((x) => (
            <li key={x.key}><span>{x.region}</span><Trend x={x} /></li>
          ))}
          {growth.data && !growth.data.items.length && <li className="muted">No citizen-demand data for this sector.</li>}
        </ul>
        <p className="bm-p muted" style={{ marginTop: 10 }}>Growth needs time-stamped citizen requests, which only Brazil publishes openly among BRICS members.</p>
      </div>
    </div>
  );
}

function InfraTab({ themes, theme }) {
  const t = themes.find((x) => x.id === theme);
  const list = useApi('/hotspots/list', { theme, size: 100, national: 1 });
  const points = (list.data?.items || []).map((x) => ({ x: x.infraScore, y: x.score, z: x.requests12m || 400, name: x.region, iso3: x.iso3, basis: x.basis }));
  const colors = { 'citizen-demand': '#e11d2e', 'regional-survey': '#2563eb', 'national-indicator': '#94a3b8' };
  return (
    <div>
      <h3 className="bm-h">{t?.label}: priority vs infrastructure score, by region</h3>
      <p className="bm-p muted" style={{ marginBottom: 8 }}>Top-left = high priority where infrastructure is weakest. Red: citizen demand (Brazil) · Blue: regional surveys · Grey: national estimates.</p>
      <div style={{ height: 320 }}>
        {!list.data ? <Loading /> : (
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 6, right: 16, left: -6, bottom: 12 }}>
              <CartesianGrid stroke="var(--d-border)" />
              <XAxis type="number" dataKey="x" name="Infrastructure score" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} label={{ value: 'Infrastructure score (100 = full coverage)', position: 'insideBottom', offset: -6, fontSize: 11, fill: 'var(--d-text-3)' }} />
              <YAxis type="number" dataKey="y" name="Priority" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} />
              <ZAxis type="number" dataKey="z" range={[30, 260]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => payload?.[0] ? (
                <div className="rhex-tip static"><strong>{payload[0].payload.name}</strong><span>{COUNTRY_NAMES[payload[0].payload.iso3]}</span><span>Priority {payload[0].payload.y} · infra {payload[0].payload.x}</span></div>
              ) : null} />
              <Scatter data={points}>{points.map((p, i) => <Cell key={i} fill={colors[p.basis]} fillOpacity={0.7} />)}</Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function InvestTab() {
  const exec = useApi('/executive', { months: 12 });
  const inv = useApi('/investment');
  const LABEL = { water: 'Water & sanitation', energy: 'Energy', transport: 'Transport', digital: 'Digital' };
  const STATUS = { gap: ['Potential gap', 'st-gap'], review: ['Review', 'st-review'], aligned: ['Aligned', 'st-ok'] };
  const ppiRows = useMemo(() => {
    if (!inv.data) return [];
    const maxYear = Math.max(...inv.data.ppi.map((r) => r.year));
    const acc = {};
    for (const r of inv.data.ppi) if (r.year > maxYear - 10) acc[r.iso3] = (acc[r.iso3] || 0) + r.value;
    return Object.entries(acc).map(([iso3, v]) => ({ iso3, name: COUNTRY_NAMES[iso3], v })).sort((a, b) => b.v - a.v);
  }, [inv.data]);
  return (
    <div className="tab-grid">
      <div>
        <h3 className="bm-h">Citizen demand share vs investment share (Brazil, 5 years)</h3>
        {!exec.data ? <Loading /> : (
          <table className="dtable">
            <thead><tr><th>Sector</th><th className="r">Demand share</th><th className="r">Investment share</th><th>Status</th></tr></thead>
            <tbody>
              {exec.data.alignment.map((a) => (
                <tr key={a.sector}>
                  <td>{LABEL[a.sector]}</td>
                  <td className="r">{(a.demandShare * 100).toFixed(1)}%</td>
                  <td className="r">{(a.investmentShare * 100).toFixed(1)}%</td>
                  <td><span className={`status ${STATUS[a.status][1]}`}>{STATUS[a.status][0]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="bm-p muted" style={{ marginTop: 10 }}>Regional investment plans aren’t published openly for any member, so the comparison is national.</p>
      </div>
      <div>
        <h3 className="bm-h">Infrastructure investment with private participation, last 10 years</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={ppiRows} layout="vertical" margin={{ top: 0, right: 16, left: 20, bottom: 0 }}>
              <XAxis type="number" tickFormatter={fmtUsd} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: 'var(--d-text-2)' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [fmtUsd(v), 'PPI commitments']} contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="v" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CompareTab({ themes, theme }) {
  const needs = useApi('/hotspots/topneeds');
  const exec = useApi('/executive', { months: 12 });
  const t = themes.find((x) => x.id === theme);
  const rows = useMemo(() => {
    if (!exec.data) return [];
    const th = exec.data.themes.find((x) => x.id === theme);
    return Object.entries(COUNTRY_NAMES).map(([iso3, name]) => ({ iso3, name: iso3 === 'ARE' ? 'UAE' : name, score: th?.scores?.[iso3] ?? null }))
      .filter((r) => r.score !== null).sort((a, b) => b.score - a.score);
  }, [exec.data, theme]);
  return (
    <div className="tab-grid">
      <div>
        <h3 className="bm-h">{t?.label}: national need score by member</h3>
        {theme === 'nutrition' ? <p className="bm-p muted">Food &amp; nutrition is measured only in regional surveys (child stunting), so there is no national comparison. See the hotspot table.</p> : (
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={rows} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--d-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--d-text-2)' }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--d-text-3)' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Need score']} contentStyle={{ background: 'var(--d-surface)', border: '1px solid var(--d-border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>{rows.map((r) => <Cell key={r.iso3} fill={tierOf(r.score)?.color || '#94a3b8'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div>
        <h3 className="bm-h">Where each member’s regional evidence comes from</h3>
        <ul className="list-plain">
          {(needs.data || []).map((c) => (
            <li key={c.iso3}><span><Flag iso3={c.iso3} /> {c.name}</span><span className="muted">{c.basis === 'citizen-demand' ? 'Citizen requests' : c.basis === 'regional-survey' ? 'Regional survey' : 'National only'}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

