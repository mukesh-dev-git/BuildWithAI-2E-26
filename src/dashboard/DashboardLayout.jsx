import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutGrid, Map, ClipboardList, ChartColumn, Handshake, Database, MessageSquarePlus, Moon, Sun, Menu, X,
  Globe2, Layers, Calendar, ChevronDown, Layers3, RefreshCw,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDashboard } from './DashboardContext';
import { fmtMonth } from './format';
import './dashboard.css';

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true, title: 'BRICS Executive Overview', subtitle: 'Shared development priorities, hotspots and cooperation opportunities across BRICS members' },
  { to: '/map', label: 'Demand Map', icon: Map, title: 'Demand Intelligence Map', subtitle: 'Where citizen demand, infrastructure gaps and investment mismatches concentrate across BRICS', mapControls: true },
  { to: '/recommendations', label: 'Recommendations', icon: ClipboardList, title: 'Recommendations', subtitle: 'Shared BRICS priorities, country actions and transferable implementation models' },
  { to: '/countries', label: 'Country Insights', icon: ChartColumn },
  { to: '/cooperation', label: 'Cooperation', icon: Handshake },
  { to: '/investment', label: 'Investment Alignment', icon: Database },
  { to: '/intake', label: 'Citizen Intake', icon: MessageSquarePlus },
  { to: '/sources', label: 'Data Sources', icon: Database },
];

// Pages reachable by link but not listed in the sidebar
const EXTRA_TITLES = { '/explorer': 'Request Explorer', '/recommendations/regional': 'Regional priorities' };

// Pages where the time window filter has no effect
const NO_WINDOW = ['/countries', '/investment', '/sources', '/intake', '/explorer', '/cooperation'];

function FilterSelect({ icon: Icon, value, onChange, label, children }) {
  return (
    <label className="fselect">
      <Icon size={17} strokeWidth={1.8} className="fselect-icon" />
      <select value={value} onChange={onChange} aria-label={label}>{children}</select>
      <ChevronDown size={16} className="fselect-caret" />
    </label>
  );
}

// Decorative dotted globe for the sidebar foot
function DotGlobe() {
  const dots = [];
  for (let lat = -80; lat <= 80; lat += 10) {
    const r = Math.cos((lat * Math.PI) / 180);
    const n = Math.max(4, Math.round(36 * r));
    for (let i = 0; i < n; i++) {
      const lon = (i / n) * 2 * Math.PI;
      const x = Math.sin(lon) * r;
      const z = Math.cos(lon) * r;
      if (z < 0) continue;
      dots.push(<circle key={`${lat}-${i}`} cx={100 + x * 95} cy={100 - Math.sin((lat * Math.PI) / 180) * 95} r={0.9 + z * 0.9} />);
    }
  }
  return <svg className="dot-globe" viewBox="0 0 200 200" aria-hidden="true">{dots}</svg>;
}

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const { country, setCountry, sector, setSector, months, setMonths, mapLayer, setMapLayer, refresh, meta, metaError } = useDashboard();
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname === n.to || pathname.startsWith(`${n.to}/`)));
  const title = current?.title || current?.label || EXTRA_TITLES[pathname];

  return (
    <div className="dash" data-theme={theme}>
      <aside className={`dash-sidebar ${navOpen ? 'open' : ''}`}>
        <div className="dash-brand">
          <div className="dash-logo">VD</div>
          <div>
            <div className="dash-brand-name">VikasDrishti</div>
            <div className="dash-brand-sub">BRICS Development Intelligence</div>
          </div>
          <button className="dash-icon-btn dash-nav-close" onClick={() => setNavOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="dash-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setNavOpen(false)}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={20} strokeWidth={1.7} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dash-sidebar-foot">
          <p className="dash-tagline">Better insights.<br />Stronger partnerships.<br />A more prosperous BRICS.</p>
          {meta && <p className="dash-foot-label">Citizen data through {fmtMonth(meta.latestMonth)}</p>}
          <DotGlobe />
        </div>
      </aside>
      {navOpen && <div className="dash-scrim" onClick={() => setNavOpen(false)} />}

      <div className="dash-main">
        <header className={`dash-topbar ${current?.subtitle ? 'tall' : ''}`}>
          <button className="dash-icon-btn dash-nav-open" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="dash-heading">
            <h1 className="dash-title">{title}</h1>
            {current?.subtitle && <p className="dash-subtitle">{current.subtitle}</p>}
          </div>
          <div className="dash-filters">
            <FilterSelect icon={Globe2} label="Country" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="ALL">All BRICS members</option>
              {meta?.countries.map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
            </FilterSelect>
            <FilterSelect icon={Layers} label="Sector" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="all">All sectors</option>
              {meta && Object.entries(meta.sectors).filter(([, s]) => s.development).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </FilterSelect>
            {!NO_WINDOW.includes(pathname) && (
              <FilterSelect icon={Calendar} label="Time window" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[3, 6, 12, 24, 36].map((m) => <option key={m} value={m}>Last {m} months</option>)}
              </FilterSelect>
            )}
            {current?.mapControls && (
              <>
                <label className="fselect fselect-stacked">
                  <Layers3 size={17} strokeWidth={1.8} className="fselect-icon" />
                  <span className="fselect-cap">Map layer</span>
                  <select value={mapLayer} onChange={(e) => setMapLayer(e.target.value)} aria-label="Map layer">
                    <option value="priority">Combined priority</option>
                    <option value="demand">Citizen demand</option>
                    <option value="need">Infrastructure need</option>
                  </select>
                  <ChevronDown size={16} className="fselect-caret" />
                </label>
                <button className="dash-icon-btn big" onClick={refresh} aria-label="Refresh data" title="Refresh data"><RefreshCw size={17} /></button>
              </>
            )}
            <button className="dash-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>
        <main className="dash-content">
          {metaError ? (
            <div className="dash-empty"><strong>Data not loaded.</strong> {metaError.message}</div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
