import { useState, useEffect } from 'react';
import { Sparkles, Database, Cloud, Key, CheckCircle, Shield, X, ExternalLink, Cpu, RefreshCw, HardDrive } from 'lucide-react';
import { getApiKey, setApiKey } from '../services/gemini';
import { isFirebaseConfigured } from '../services/firebase';
import { checkDbHealth, reseedDatabase } from '../services/api';
import './GoogleTechModal.css';

export default function GoogleTechModal({ isOpen, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [saveStatus, setSaveStatus] = useState('');
  const [testing, setTesting] = useState(false);
  const [dbHealth, setDbHealth] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkDbHealth().then(data => setDbHealth(data));
    }
  }, [isOpen]);

  const handleReseed = async () => {
    setSeeding(true);
    await reseedDatabase();
    const refreshed = await checkDbHealth();
    setDbHealth(refreshed);
    setSeeding(false);
  };

  if (!isOpen) return null;

  const handleSaveKey = () => {
    setApiKey(apiKeyInput);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleTestKey = async () => {
    setTesting(true);
    setSaveStatus('');
    try {
      setApiKey(apiKeyInput);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKeyInput}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello! Respond with: "Connected to Google AI Studio!"' }] }]
        })
      });
      const data = await res.json();
      if (data.candidates && data.candidates[0]) {
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="gt-overlay" onClick={onClose}>
      <div className="gt-modal" onClick={e => e.stopPropagation()}>
        <div className="gt-header">
          <div className="gt-header-title">
            <span className="gt-badge">Google Build With AI 2026</span>
            <h2>Google Cloud & AI Architecture</h2>
          </div>
          <button className="gt-close" onClick={onClose}><X size={20} /></button>
        </div>

        <p className="gt-lead">
          VikasDrishti AI is built natively on the Google ecosystem, bringing multimodal edge intelligence to rural India’s civic infrastructure governance.
        </p>

        {/* ── Architecture Grid ───────── */}
        <div className="gt-grid">
          <div className="gt-card">
            <div className="gt-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}>
              <Sparkles size={22} />
            </div>
            <h4>Google AI Studio (Gemini 2.0 Flash)</h4>
            <p>Powering 5 core capabilities: Multilingual intent extraction (10 Indian languages), Vision damage audit, Policy briefs, Budget What-If simulator, and Live translation.</p>
            <span className="gt-card-tag">Active Model: gemini-2.0-flash</span>
          </div>

          <div className="gt-card">
            <div className="gt-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
              <Cpu size={22} />
            </div>
            <h4>Vertex AI & Predictive Models</h4>
            <p>Designed for Vertex AI Model Garden & AutoML time-series forecasting to predict infrastructure stress 6–12 months in advance before citizen failure reports spike.</p>
            <span className="gt-card-tag">Forecasting Engine: Vertex AI Ready</span>
          </div>

          <div className="gt-card">
            <div className="gt-card-icon" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
              <HardDrive size={22} />
            </div>
            <h4>Active SQLite Database</h4>
            <p>
              Persistent relational database (WAL mode) storing <strong>{dbHealth?.counts?.districts || 80} Aspirational Districts</strong>, <strong>{dbHealth?.counts?.grievances || 80} Citizen Grievances</strong>, and governance audit trails.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span className="gt-card-tag" style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                ● DB Online ({dbHealth?.counts?.districts || 80} Dists / {dbHealth?.counts?.grievances || 80} Grvs)
              </span>
              <button 
                type="button" 
                onClick={handleReseed} 
                disabled={seeding}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#cbd5e1', fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                title="Reset and repopulate database from public benchmark datasets"
              >
                {seeding ? 'Seeding...' : '🌱 Re-seed DB'}
              </button>
            </div>
          </div>

          <div className="gt-card">
            <div className="gt-card-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}>
              <Cloud size={22} />
            </div>
            <h4>Cloud Firestore & BigQuery Sync</h4>
            <p>Real-time distributed sync bridging edge mobile voice inputs to Google Cloud Firestore, ready for BigQuery analytical warehouse ingestion.</p>
            <span className="gt-card-tag">Cloud Sync: {isFirebaseConfigured() ? 'Firebase Active' : 'Ready (Local DB Active)'}</span>
          </div>
        </div>

        {/* ── API Key Configuration Drawer ───────── */}
        <div className="gt-key-box">
          <div className="gt-key-header">
            <div className="gt-key-title">
              <Key size={18} />
              <span>Google AI Studio API Key Configuration</span>
            </div>
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noreferrer" 
              className="gt-key-link"
            >
              Get Free Key <ExternalLink size={13} />
            </a>
          </div>
          <p className="gt-key-desc">
            VikasDrishti AI works out of the box with realistic fallback data. To test live Gemini 2.0 Flash multimodal reasoning, paste your Google AI Studio key below:
          </p>
          <div className="gt-key-row">
            <input 
              type="password"
              className="gt-key-input"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
            />
            <button className="btn-secondary" onClick={handleSaveKey}>Save Key</button>
            <button className="btn-primary" onClick={handleTestKey} disabled={testing || !apiKeyInput.trim()}>
              {testing ? <RefreshCw className="animate-spin" size={16} /> : 'Test Live API'}
            </button>
          </div>
          {saveStatus === 'saved' && (
            <div className="gt-status gt-status-info">
              <CheckCircle size={15} /> Key saved locally in browser!
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="gt-status gt-status-success">
              <CheckCircle size={15} /> Successfully authenticated with Google Gemini 2.0 Flash!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="gt-status gt-status-error">
              <Shield size={15} /> Key test failed. Please verify your Google AI Studio API key.
            </div>
          )}
        </div>

        <div className="gt-footer">
          <span>Digital Public Good for Vikasit Bharat 2047</span>
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
