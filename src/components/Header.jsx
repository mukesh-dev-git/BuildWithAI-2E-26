import { Link, useLocation } from 'react-router-dom';
import { 
  Globe, Menu, X, Sparkles, Flame, BarChart3, Radio, Cpu, 
  Search, Sun, Moon 
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import GoogleTechModal from './GoogleTechModal';
import CrisisWarRoomModal from './CrisisWarRoomModal';
import './Header.css';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'mr', label: 'मराठी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

export default function Header() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [lang, setLang] = useState('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showWarRoom, setShowWarRoom] = useState(false);

  const handleOpenCopilot = () => {
    window.dispatchEvent(new CustomEvent('open-neural-copilot'));
  };

  return (
    <header className={`header ${theme === 'dark' ? 'header-dark' : 'header-light'}`}>
      <div className="header-inner container-wide">
        {/* ── Brand Console Section ─────────────────────── */}
        <div className="header-brand-group">
          <Link to="/" className="header-brand">
            <div className="brand-icon">
              <span className="brand-icon-text">वि</span>
            </div>
            <div className="brand-text">
              <div className="brand-title-row">
                <span className="brand-name">VikasDrishti AI</span>
                <span className="brand-badge-cloud">DPI Console</span>
              </div>
              <span className="brand-tagline">BRICS National Infrastructure Public Good</span>
            </div>
          </Link>
        </div>

        {/* ── Center Quick-Action Search Bar (AWS/GCP Console Style) ── */}
        <button 
          className="header-console-search"
          onClick={handleOpenCopilot}
          title="Open Neural Policy Copilot (Ctrl + K)"
        >
          <Search size={14} className="search-icon" />
          <span className="search-placeholder">Ask Neural Copilot or search 768 districts...</span>
          <kbd className="search-kbd">Ctrl K</kbd>
        </button>

        {/* ── Segmented Navigation Controls ────────────── */}
        <nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' || location.pathname === '/policymaker' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <BarChart3 size={15} />
            <span>Command Studio</span>
          </Link>
          <Link 
            to="/ingestion" 
            className={`nav-link ${location.pathname === '/ingestion' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <Radio size={15} />
            <span>Ingestion Feed</span>
          </Link>
          <Link 
            to="/analytics" 
            className={`nav-link ${location.pathname === '/analytics' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <Cpu size={15} />
            <span>AI/ML Dataset Lab</span>
          </Link>
        </nav>

        {/* ── Header Right Tools ───────────────────────── */}
        <div className="header-actions">
          {/* Real-time telemetry indicator */}
          <div className="telemetry-pill-header" title="SQLite WAL Database Cluster & Realtime Sync Active">
            <span className="telemetry-dot-pulse"></span>
            <span className="telemetry-pill-text">768 Districts Active</span>
          </div>

          <div className="lang-selector">
            <Globe size={14} />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              className="lang-select"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Theme Toggle Button */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} className="theme-icon sun" /> : <Moon size={15} className="theme-icon moon" />}
          </button>

          <button 
            className="crisis-badge-btn" 
            onClick={() => setShowWarRoom(true)}
            title="Launch Emergency Decision Matrix & Stress Simulator"
          >
            <Flame size={13} color="#f87171" />
            <span>War Room</span>
          </button>

          <button 
            className="google-badge-btn" 
            onClick={() => setShowGoogleModal(true)}
            title="Google AI Studio & Cloud Architecture"
          >
            <Sparkles size={13} color="#60a5fa" />
            <span>Google Stack</span>
          </button>

          <button 
            className="menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <GoogleTechModal 
        isOpen={showGoogleModal} 
        onClose={() => setShowGoogleModal(false)} 
        theme={theme}
      />

      <CrisisWarRoomModal 
        isOpen={showWarRoom} 
        onClose={() => setShowWarRoom(false)} 
        theme={theme}
      />
    </header>
  );
}
