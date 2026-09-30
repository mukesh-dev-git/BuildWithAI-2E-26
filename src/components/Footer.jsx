import React from 'react';
import { Sparkles, Shield, Cpu, Terminal, Database, Globe, CheckCircle2, GitBranch } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container-wide footer-container">
        {/* Top Tier: Built with Gemini & Antigravity Headline */}
        <div className="footer-hero-band">
          <div className="footer-built-with">
            <span className="built-with-label">ARCHITECTURE PARTNERS</span>
            <div className="built-with-badges">
              <div className="partner-badge gemini-badge">
                <Sparkles size={16} className="badge-glow-icon" />
                <span className="partner-name">Google Gemini 2.0 Flash</span>
                <span className="partner-role">Multimodal AI & Policy Reasoning</span>
              </div>
              <div className="partner-divider">&times;</div>
              <div className="partner-badge antigravity-badge">
                <Terminal size={16} className="badge-glow-icon" />
                <span className="partner-name">Antigravity 2.0</span>
                <span className="partner-role">Agentic Development & Orchestration</span>
              </div>
            </div>
          </div>

          <div className="footer-telemetry">
            <div className="telemetry-item">
              <span className="telemetry-dot online"></span>
              <span>SQLite WAL Native: <strong>Synchronized</strong></span>
            </div>
            <div className="telemetry-item">
              <Database size={13} />
              <span>4-Way Dataset Fusion: <strong>Active</strong></span>
            </div>
            <div className="telemetry-item">
              <Globe size={13} />
              <span>BRICS Coverage: <strong>IN · BR · ZA</strong></span>
            </div>
          </div>
        </div>

        {/* Middle Tier: DPG & Compliance Grid */}
        <div className="footer-meta-grid">
          <div className="footer-col brand-col">
            <div className="footer-brand-title">
              <div className="brand-gem-icon">वि</div>
              <div>
                <h5>VikasDrishti AI</h5>
                <p>Digital Public Good for Infrastructure & Governance</p>
              </div>
            </div>
            <p className="footer-mission-text">
              Transforming fragmented grassroots citizen feedback into auditable, high-priority 
              capital development projects for national policymakers across BRICS member states.
            </p>
          </div>

          <div className="footer-col">
            <h6 className="footer-col-title">Digital Public Good (DPG)</h6>
            <ul className="footer-checklist">
              <li><CheckCircle2 size={13} color="var(--success)" /> DPGA Open Standard #1–9</li>
              <li><CheckCircle2 size={13} color="var(--success)" /> PII-Preserving Ingestion</li>
              <li><CheckCircle2 size={13} color="var(--success)" /> Bias-Free Explainable Priority Index (EPI)</li>
              <li><CheckCircle2 size={13} color="var(--success)" /> Open REST & SQLite Schema</li>
            </ul>
          </div>

          <div className="footer-col">
            <h6 className="footer-col-title">Google AI Stack</h6>
            <ul className="footer-checklist">
              <li><Sparkles size={13} color="#4285F4" /> Gemini 2.0 Flash (Reasoning & Copilot)</li>
              <li><Cpu size={13} color="#34A853" /> Vertex AI AutoML (12-Mo Time-Series)</li>
              <li><Database size={13} color="#009688" /> BigQuery Public Census & Spatial Index</li>
              <li><Shield size={13} color="#FFCA28" /> Firebase Distributed Realtime Sync</li>
            </ul>
          </div>

          <div className="footer-col">
            <h6 className="footer-col-title">Multilateral Reach</h6>
            <div className="brics-flag-tags">
              <span className="brics-flag-pill">🇮🇳 India (80+ Districts)</span>
              <span className="brics-flag-pill">🇧🇷 Brazil (Priority States)</span>
              <span className="brics-flag-pill">🇿🇦 South Africa (District Munis)</span>
            </div>
            <div className="mt-3">
              <span className="badge badge-success">Apache 2.0 Open Source</span>
            </div>
          </div>
        </div>

        {/* Bottom Tier: Attribution line */}
        <div className="footer-bottom-line">
          <div>
            &copy; 2026 <strong>VikasDrishti AI</strong> · Track 1: AI for Digital Public Infrastructure & Governance
          </div>
          <div className="footer-credit">
            Engineered with <span className="text-saffron">Google Gemini</span> and <span className="text-royal">Antigravity 2.0</span> for the Global South
          </div>
        </div>
      </div>
    </footer>
  );
}
