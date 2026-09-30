import { Link, useLocation } from 'react-router-dom';
import { Globe, Menu, X, Sparkles, Flame, BarChart3, Radio, Cpu } from 'lucide-react';
import { useState } from 'react';
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
  const [lang, setLang] = useState('en');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showWarRoom, setShowWarRoom] = useState(false);
  const isPolicymaker = location.pathname.startsWith('/policymaker');

  return (
    <header className={`header ${isPolicymaker ? 'header-dark' : ''}`}>
      <div className="header-inner container-wide">
        <Link to="/" className="header-brand">
          <div className="brand-icon">
            <span className="brand-icon-text">वि</span>
          </div>
          <div className="brand-text">
            <span className="brand-name">VikasDrishti AI</span>
            <span className="brand-tagline">BRICS Digital Public Good</span>
          </div>
        </Link>

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

        <div className="header-actions">
          <div className="lang-selector">
            <Globe size={16} />
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

          <button 
            className="crisis-badge-btn" 
            onClick={() => setShowWarRoom(true)}
            title="Launch Emergency Decision Matrix & Stress Simulator"
          >
            <Flame size={14} color="#ef4444" />
            <span>Crisis War Room</span>
          </button>

          <button 
            className="google-badge-btn" 
            onClick={() => setShowGoogleModal(true)}
            title="Google AI Studio & Cloud Architecture"
          >
            <Sparkles size={14} />
            <span>Google AI Stack</span>
          </button>

          <button 
            className="menu-toggle" 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <GoogleTechModal 
        isOpen={showGoogleModal} 
        onClose={() => setShowGoogleModal(false)} 
      />

      <CrisisWarRoomModal 
        isOpen={showWarRoom} 
        onClose={() => setShowWarRoom(false)} 
      />
    </header>
  );
}

