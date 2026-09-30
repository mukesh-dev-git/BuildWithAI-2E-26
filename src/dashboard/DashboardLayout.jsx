import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, Target, Table2, Globe2, Landmark, MessageSquarePlus, Database, Moon, Sun, Menu, X,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDashboard } from './DashboardContext';
import { FLAGS, fmtMonth } from './format';
import './dashboard.css';

export const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'Demand Map', icon: Map },
  { to: '/recommendations', label: 'Recommendations', icon: Target },
  { to: '/explorer', label: 'Request Explorer', icon: Table2 },
  { to: '/countries', label: 'Country Compare', icon: Globe2 },
  { to: '/investment', label: 'Investment Alignment', icon: Landmark },
  { to: '/intake', label: 'Citizen Intake', icon: MessageSquarePlus },
  { to: '/sources', label: 'Data Sources', icon: Database },
];

// Pages where the time window filter has no effect
const NO_WINDOW = ['/countries', '/investment', '/sources', '/intake', '/explorer'];

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const { country, setCountry, sector, setSector, months, setMonths, meta, metaError } = useDashboard();
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const current = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));

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
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="dash-sidebar-foot">
          {meta && (
            <>
              <div className="dash-foot-label">Citizen data through</div>
              <div className="dash-foot-value">{fmtMonth(meta.latestMonth)}</div>
            </>
          )}
        </div>
      </aside>
      {navOpen && <div className="dash-scrim" onClick={() => setNavOpen(false)} />}

      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-icon-btn dash-nav-open" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <h1 className="dash-title">{current?.label}</h1>
          <div className="dash-filters">
            <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="Country">
              <option value="ALL">All BRICS members</option>
              {meta?.countries.map((c) => (
                <option key={c.iso3} value={c.iso3}>{FLAGS[c.iso3]} {c.name}</option>
              ))}
            </select>
            <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
              <option value="all">All sectors</option>
              {meta && Object.entries(meta.sectors).filter(([, s]) => s.development).map(([id, s]) => (
                <option key={id} value={id}>{s.label}</option>
              ))}
            </select>
            {!NO_WINDOW.includes(pathname) && (
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Time window">
                {[3, 6, 12, 24, 36].map((m) => <option key={m} value={m}>Last {m} months</option>)}
              </select>
            )}
            <button className="dash-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>
        <main className="dash-content">
          {metaError ? (
            <div className="dash-empty">
              <strong>Data not loaded.</strong> {metaError.message}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
