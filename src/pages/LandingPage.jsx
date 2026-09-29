import { Link } from 'react-router-dom';
import { 
  Mic, BarChart3, Shield, Globe2, Users, ArrowRight, Sparkles, 
  MapPin, Volume2, Camera, Eye, Brain, Coins, ShieldCheck 
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing page-enter">
      {/* ── Hero Section ─────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        
        <div className="container hero-content">
          <div className="hero-badge animate-fade-in">
            <Sparkles size={14} />
            <span>AI for Digital Public Infrastructure & Governance</span>
          </div>
          
          <h1 className="hero-title animate-fade-in-up stagger-1">
            <span className="text-gradient">VikasDrishti AI</span>
            <br />
            <span className="hero-title-hindi">विकास दृष्टि</span>
          </h1>
          
          <p className="hero-subtitle animate-fade-in-up stagger-2">
            Voice-first, multilingual Digital Public Good that bridges the gap between 
            <strong> citizen infrastructure demands</strong> and <strong>national policy decisions</strong> — 
            powered by Google Gemini AI.
          </p>

          <div className="hero-actions animate-fade-in-up stagger-3">
            <Link to="/citizen" className="btn btn-saffron btn-lg">
              <Mic size={20} />
              Report an Issue
              <ArrowRight size={18} />
            </Link>
            <Link to="/policymaker" className="btn btn-primary btn-lg">
              <BarChart3 size={20} />
              Decision Studio
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="hero-stats animate-fade-in-up stagger-4">
            <div className="hero-stat">
              <span className="hero-stat-value">10+</span>
              <span className="hero-stat-label">Languages</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-value">45+</span>
              <span className="hero-stat-label">Districts</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-value">200+</span>
              <span className="hero-stat-label">Grievances</span>
            </div>
            <div className="hero-stat-divider"></div>
            <div className="hero-stat">
              <span className="hero-stat-value">5</span>
              <span className="hero-stat-label">AI Tasks</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Problem ──────────────────── */}
      <section className="section problem-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">The Problem We Solve</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              India's citizen demands are fragmented. ₹Lakh Crores in public infrastructure 
              spending is misaligned. We fix this gap with AI.
            </p>
          </div>

          <div className="problem-cards grid grid-3 gap-6">
            <div className="problem-card card animate-fade-in-up stagger-1">
              <div className="problem-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                <Users size={28} />
              </div>
              <h4>Fragmented Citizen Voices</h4>
              <p>Development requests scattered across helplines, paper petitions, and social media — never reaching the right policymaker.</p>
            </div>
            <div className="problem-card card animate-fade-in-up stagger-2">
              <div className="problem-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                <MapPin size={28} />
              </div>
              <h4>Misaligned Spending</h4>
              <p>Centralized planners allocate budgets using outdated, top-down demographic assumptions — ignoring real demand on the ground.</p>
            </div>
            <div className="problem-card card animate-fade-in-up stagger-3">
              <div className="problem-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--violet)' }}>
                <BarChart3 size={28} />
              </div>
              <h4>No Impact Measurement</h4>
              <p>No way to measure whether infrastructure spending actually resolved citizen needs or reached the most vulnerable districts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Dual Portal ──────────────────── */}
      <section className="section portals-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Two Portals, One Intelligence</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Citizen demands flow in. AI-powered policy insights flow out.
            </p>
          </div>

          <div className="portals-grid">
            <div className="portal-card citizen-portal animate-slide-left stagger-1">
              <div className="portal-header">
                <span className="portal-icon-wrapper saffron"><Users size={24} /></span>
                <h3>Citizen Portal</h3>
                <span className="badge badge-saffron">Mobile-First</span>
              </div>
              <p className="portal-desc">
                Speak, type, or upload a photo in any Indian language. Our AI understands 
                your grievance, verifies the issue, and creates an actionable ticket.
              </p>
              <ul className="portal-features">
                <li><Mic size={16} /> Voice-first input in 10+ languages</li>
                <li><Camera size={16} /> Photo verification via Gemini Vision</li>
                <li><Volume2 size={16} /> Audio acknowledgment in your language</li>
                <li><MapPin size={16} /> Automatic GPS geo-tagging</li>
              </ul>
              <Link to="/citizen" className="btn btn-saffron w-full">
                Open Citizen Portal <ArrowRight size={16} />
              </Link>
            </div>

            <div className="portal-card policy-portal animate-slide-right stagger-2">
              <div className="portal-header">
                <span className="portal-icon-wrapper blue"><BarChart3 size={24} /></span>
                <h3>Policymaker Studio</h3>
                <span className="badge badge-info">AI Dashboard</span>
              </div>
              <p className="portal-desc">
                Interactive intelligence platform for district collectors and planners. 
                See demand hotspots, AI-ranked priorities, and simulate budget impacts.
              </p>
              <ul className="portal-features">
                <li><MapPin size={16} /> GIS heatmap of demand hotspots</li>
                <li><BarChart3 size={16} /> Explainable Priority Index (EPI)</li>
                <li><Sparkles size={16} /> AI policy recommendations</li>
                <li><Shield size={16} /> What-If budget simulator</li>
              </ul>
              <Link to="/policymaker" className="btn btn-primary w-full">
                Open Decision Studio <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Google AI Integration ─────────── */}
      <section className="section ai-section">
        <div className="container">
          <div className="section-header text-center">
            <h2 className="section-title">Powered by Google AI</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              5 distinct Gemini AI tasks — not just a chatbot wrapper
            </p>
          </div>

          <div className="ai-grid grid grid-3 gap-6">
            {[
              { icon: Mic, iconColor: '#f97316', title: 'Multilingual Transcription', desc: 'Gemini transcribes voice in Hindi, Tamil, Marathi, Telugu, Bengali, and 5+ more languages', tag: 'Speech-to-Text' },
              { icon: Eye, iconColor: '#0ea5e9', title: 'Visual Damage Verification', desc: 'Gemini Vision inspects citizen photos to confirm actual civic damage and prevent spam', tag: 'Computer Vision' },
              { icon: Brain, iconColor: '#8b5cf6', title: 'Intent Extraction', desc: 'Semantic understanding of grievance category, severity, urgency, and department routing', tag: 'NLP' },
              { icon: BarChart3, iconColor: '#10b981', title: 'Priority Reasoning', desc: 'EPI formula scoring with Gemini generating explainable audit rationales for each district', tag: 'GenAI Reasoning' },
              { icon: Coins, iconColor: '#f59e0b', title: 'Budget Simulation', desc: 'What-If policy agent computes projected impact of budget allocation changes', tag: 'Predictive' },
              { icon: Globe2, iconColor: '#06b6d4', title: 'Cross-Border Scaling', desc: 'Modular architecture designed for BRICS nations — India, Brazil, South Africa', tag: 'DPG' },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="ai-card card animate-fade-in-up" style={{ animationDelay: `${0.1 * i}s`, opacity: 0 }}>
                  <div className="ai-card-icon" style={{ color: item.iconColor }}>
                    <ItemIcon size={26} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                      <h5>{item.title}</h5>
                    </div>
                    <span className="badge badge-info">{item.tag}</span>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-icon" style={{ width: 32, height: 32 }}>
                <span className="brand-icon-text" style={{ fontSize: '0.9rem' }}>वि</span>
              </div>
              <span className="brand-name" style={{ fontSize: '1rem' }}>VikasDrishti AI</span>
            </div>
            <p className="footer-text">
              Digital Public Good · Built for India · Powered by Google Gemini AI
            </p>
            <div className="footer-badges">
              <span className="badge badge-success">Open Source</span>
              <span className="badge badge-info">Apache 2.0</span>
              <span className="badge badge-saffron">DPG Standard</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
