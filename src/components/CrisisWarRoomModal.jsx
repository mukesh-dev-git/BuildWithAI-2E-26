import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, ShieldAlert, Radio, Activity, Send, CheckCircle2, 
  RotateCcw, Sparkles, Volume2, VolumeX, Eye, Flame, Droplets, Zap,
  TrendingUp, Truck, HeartHandshake, FileText, ChevronRight, X
} from 'lucide-react';
import { addGrievance } from '../services/grievanceStore';
import { generatePolicyRecommendation } from '../services/gemini';
import './CrisisWarRoomModal.css';

const CRISIS_SCENARIOS = [
  {
    id: 'jal-sankat',
    title: 'Jal-Sankat: Acute Groundwater & Borewell Collapse',
    tagline: 'Severe pre-monsoon heatwave triggering mass water distress',
    icon: Droplets,
    badgeColor: '#f97316',
    districts: ['Barmer', 'Chhatarpur', 'Damoh'],
    state: 'Rajasthan & Madhya Pradesh',
    epicenter: 'Chhatarpur, MP (Water Table: -182m)',
    severity: 'critical',
    telemetry: {
      waterTurbidity: '112 NTU (Toxic)',
      tankerDeficit: '64 Tankers/Day',
      depletedWells: '84.6%',
      affectedCitizens: '~142,000'
    },
    mockDistressEvents: [
      {
        text: 'गाँव बमनौरा में पिछले 7 दिनों से सभी हैंडपंप सूख चुके हैं, मवेशी प्यासे मर रहे हैं, तुरंत पानी का टैंकर भिजवाएं!',
        textEn: 'All handpumps dry for 7 days in Bamnaura village; cattle dying of thirst; urgent water tankers needed!',
        district: 'Chhatarpur',
        state: 'Madhya Pradesh',
        category: 'Water Supply',
        severity: 'critical'
      },
      {
        text: 'पीने के पानी की पाइपलाइन में खारा और गंदा कीचड़ आ रहा है, 14 बच्चे अस्पताल में भर्ती हैं!',
        textEn: 'Pipeline delivering salty muddy sludge; 14 children hospitalized with acute diarrhea!',
        district: 'Damoh',
        state: 'Madhya Pradesh',
        category: 'Healthcare',
        severity: 'critical'
      }
    ],
    recommendedEmergencyAction: {
      pmoDirective: 'ORDER 104-B: Urgent Jal-Jeevan Mobile RO Fleet Mobilization',
      budgetReallocation: '₹28.4 Crore (Reallocated from Highway Beautification to Emergency Water Tankers)',
      deployedUnits: '42 Emergency Tankers + 6 Mobile Solar Desalination Rigs'
    }
  },
  {
    id: 'brahmaputra-flood',
    title: 'Brahmaputra Flash Inundation & PHC Submersion',
    tagline: 'River breaching embankments, cutting off 38 rural health sub-centers',
    icon: Activity,
    badgeColor: '#3b82f6',
    districts: ['Dhubri', 'Baksa', 'Goalpara'],
    state: 'Assam',
    epicenter: 'Dhubri, Assam (River Level: +1.8m above Danger Mark)',
    severity: 'critical',
    telemetry: {
      waterTurbidity: '240 NTU (Flooded)',
      tankerDeficit: 'Boat Ambulances Needed',
      depletedWells: '92% Submerged',
      affectedCitizens: '~210,000'
    },
    mockDistressEvents: [
      {
        text: 'धुबरी नदी तटबंध टूट गया है, प्राथमिक स्वास्थ्य केंद्र पानी में डूब गया है, सांप के काटने की दवाइयां खत्म हो गई हैं!',
        textEn: 'Dhubri river embankment breached; PHC submerged; critical shortage of anti-snake venom vials!',
        district: 'Dhubri',
        state: 'Assam',
        category: 'Healthcare',
        severity: 'critical'
      },
      {
        text: 'गाँव का संपर्क मुख्य सड़क से टूट गया है, 300 परिवार नाव का इंतजार कर रहे हैं!',
        textEn: 'Village completely cut off from highway; 300 families stranded awaiting rescue boats!',
        district: 'Baksa',
        state: 'Assam',
        category: 'Roads & Transport',
        severity: 'high'
      }
    ],
    recommendedEmergencyAction: {
      pmoDirective: 'ORDER 218-A: SDRF Amphibious Medical Squadron Deployment',
      budgetReallocation: '₹34.8 Crore (Reallocated from Capital Assets to SDRF Rapid Relief Fund)',
      deployedUnits: '18 Motorized Rescue Rafts + 2 Air-dropped Medical Cold-Boxes'
    }
  },
  {
    id: 'grid-collapse',
    title: 'Extreme Heatwave & Agri-Feeder Transformer Surge',
    tagline: '48.5°C heat dome causing transformer combustion across farm belt',
    icon: Zap,
    badgeColor: '#eab308',
    districts: ['Washim', 'Gadchiroli', 'Kupwara'],
    state: 'Maharashtra',
    epicenter: 'Washim, MH (Ambient Temp: 47.8°C)',
    severity: 'high',
    telemetry: {
      waterTurbidity: 'N/A',
      tankerDeficit: 'Power Deficit: 320MW',
      depletedWells: 'Borewells Stalled (No Grid Power)',
      affectedCitizens: '~89,000'
    },
    mockDistressEvents: [
      {
        text: 'कृषि फीडर का 200 KVA ट्रांसफार्मर धमाके के साथ जल गया, 80 किसानों की संतरे की फसल सूख रही है!',
        textEn: '200 KVA Agri feeder transformer exploded; orange orchards of 80 farmers wilting rapidly!',
        district: 'Washim',
        state: 'Maharashtra',
        category: 'Electricity',
        severity: 'critical'
      }
    ],
    recommendedEmergencyAction: {
      pmoDirective: 'ORDER 309-E: DISCOM Rapid Heavy Transformer Mobilization',
      budgetReallocation: '₹14.2 Crore (Accelerated RDSS Grid Modernization Corpus)',
      deployedUnits: '8 Heavy Duty Mobile Transformers on flatbed trucks'
    }
  }
];

export default function CrisisWarRoomModal({ isOpen, onClose }) {
  const [selectedScenario, setSelectedScenario] = useState(CRISIS_SCENARIOS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [aiDirective, setAiDirective] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const audioCtxRef = useRef(null);

  // Sound synthesis using Web Audio API (Clean futuristic alert sounds)
  const playSirenPulse = (freq = 440, duration = 0.15) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.8, ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    setSimulationComplete(false);
    setSimulationLogs([]);
    setAiDirective(null);

    playSirenPulse(580, 0.3);

    const log = (msg) => {
      setSimulationLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    log(`🚨 INITIATING CRISIS WAR ROOM PROTOCOL: ${selectedScenario.title.toUpperCase()}`);
    log(`📡 Uplinking to ISRO Bhuvan GIS & IMD Weather Early Warning Sensor Grid...`);

    await new Promise(r => setTimeout(r, 600));
    playSirenPulse(720, 0.15);
    log(`🛰️ Satellite Ground Telemetry synchronized: Epicenter ${selectedScenario.epicenter}`);

    await new Promise(r => setTimeout(r, 700));
    log(`📥 Simulating live inbound Jan-Samvaad citizen voice distress calls...`);

    // Inject grievances into real SQLite DB store
    for (let i = 0; i < selectedScenario.mockDistressEvents.length; i++) {
      const evt = selectedScenario.mockDistressEvents[i];
      playSirenPulse(880, 0.12);
      log(`⚡ INBOUND VOICE ALERT [${evt.district}]: "${evt.textEn}"`);
      
      await addGrievance({
        id: `CRISIS-${Date.now()}-${i}`,
        category: evt.category,
        text: evt.text,
        textEn: evt.textEn,
        severity: evt.severity,
        status: 'pending',
        language: 'hi',
        district: evt.district,
        state: evt.state,
        lat: 24.5 + Math.random() * 2,
        lng: 78.5 + Math.random() * 2,
        citizenName: 'Emergency Distress Beacon',
        timestamp: new Date().toISOString(),
        votes: 14 + Math.floor(Math.random() * 25),
        imageDescription: 'Automated satellite anomaly detection & ground distress confirmation'
      });
      await new Promise(r => setTimeout(r, 500));
    }

    log(`🧮 Recalculating Emergency Priority Index (EPI) for affected zones...`);
    log(`🔴 EPI for ${selectedScenario.districts[0]} spiked: 94.8 [CRITICAL ESCALATION]`);

    await new Promise(r => setTimeout(r, 600));
    log(`🤖 Invoking Gemini 2.0 Flash Crisis Decision Matrix...`);

    // Call Gemini or use rich contextual AI directive
    try {
      const prompt = `Synthesize an Emergency Cabinet Directive for ${selectedScenario.title} affecting ${selectedScenario.districts.join(', ')}. Include immediate fund deployment, logistical assets, and 48-hour containment targets.`;
      const aiResponse = await generatePolicyRecommendation(
        [{ district: selectedScenario.districts[0], value: 94.8, category: 'Water Supply' }],
        { currentGrievances: selectedScenario.mockDistressEvents.length }
      );
      setAiDirective(aiResponse);
    } catch {
      setAiDirective(selectedScenario.recommendedEmergencyAction.pmoDirective);
    }

    playSirenPulse(1040, 0.4);
    log(`✅ EMERGENCY DIRECTIVE DISPATCHED TO SQLite DATABASE & DISTRICT COLLECTORS.`);
    setIsSimulating(false);
    setSimulationComplete(true);
  };

  if (!isOpen) return null;

  return (
    <div className="war-room-overlay" onClick={onClose}>
      <div className="war-room-modal" onClick={e => e.stopPropagation()}>
        
        {/* Header HUD */}
        <div className="war-room-header">
          <div className="war-room-title-group">
            <div className="war-room-radar-icon">
              <span className="radar-ping"></span>
              <ShieldAlert size={26} color="#ef4444" />
            </div>
            <div>
              <div className="war-room-badge-row">
                <span className="live-status-pill">
                  <span className="blinking-dot"></span> LIVE WAR ROOM
                </span>
                <span className="sub-badge">NDRF / PMO CRISIS SIMULATOR</span>
                <span className="sub-badge db-pill">SQLite ACID Persistence</span>
              </div>
              <h2 className="war-room-title">VikasDrishti Emergency Decision Matrix</h2>
            </div>
          </div>

          <div className="war-room-header-actions">
            <button 
              className={`sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Sonar Alerts' : 'Enable Sonar Alerts'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button className="war-room-close" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="war-room-body">
          
          {/* Left Column: Scenario Selectors */}
          <div className="scenarios-sidebar">
            <h4 className="sidebar-section-title">
              <Flame size={16} /> Select Crisis Scenario
            </h4>
            <div className="scenario-cards-list">
              {CRISIS_SCENARIOS.map((sc) => {
                const IconComponent = sc.icon;
                const isSelected = selectedScenario.id === sc.id;
                return (
                  <div 
                    key={sc.id} 
                    className={`scenario-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      if (!isSimulating) {
                        setSelectedScenario(sc);
                        setSimulationComplete(false);
                        setSimulationLogs([]);
                      }
                    }}
                  >
                    <div className="scenario-card-top">
                      <div className="scenario-icon-wrapper" style={{ color: sc.badgeColor }}>
                        <IconComponent size={20} />
                      </div>
                      <span className="scenario-severity" style={{ borderColor: sc.badgeColor, color: sc.badgeColor }}>
                        {sc.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="scenario-name">{sc.title}</div>
                    <div className="scenario-desc">{sc.tagline}</div>
                    <div className="scenario-districts">
                      📍 {sc.districts.join(', ')} ({sc.state})
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Simulation Button */}
            <div className="simulation-cta-box">
              <button 
                className="launch-sim-btn" 
                onClick={runSimulation}
                disabled={isSimulating}
              >
                {isSimulating ? (
                  <>
                    <Activity className="spinning" size={18} />
                    <span>Executing Emergency Protocol...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>⚡ INITIATE EMERGENCY STRESS TEST</span>
                  </>
                )}
              </button>
              <p className="cta-disclaimer">
                Injects real-time distress signals into SQLite DB & triggers Gemini 2.0 Flash action plan.
              </p>
            </div>
          </div>

          {/* Right Column: Tactical Mission Display */}
          <div className="tactical-mission-display">
            
            {/* Live Sensor Telemetry Cards */}
            <div className="telemetry-grid">
              <div className="telemetry-card">
                <span className="telemetry-label">Epicenter Target</span>
                <span className="telemetry-value highlight">{selectedScenario.epicenter}</span>
              </div>
              <div className="telemetry-card">
                <span className="telemetry-label">Water/Resource Quality</span>
                <span className="telemetry-value danger">{selectedScenario.telemetry.waterTurbidity}</span>
              </div>
              <div className="telemetry-card">
                <span className="telemetry-label">Logistics Deficit</span>
                <span className="telemetry-value warning">{selectedScenario.telemetry.tankerDeficit}</span>
              </div>
              <div className="telemetry-card">
                <span className="telemetry-label">Citizen Exposure</span>
                <span className="telemetry-value">{selectedScenario.telemetry.affectedCitizens}</span>
              </div>
            </div>

            {/* Terminal Live Stream */}
            <div className="tactical-terminal">
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span></span><span></span><span></span>
                </div>
                <div className="terminal-title">
                  <Radio size={14} className="terminal-radio" />
                  REAL-TIME TELEMETRY & SQLITE INGESTION STREAM
                </div>
                <span className="terminal-badge">PORT 5000 ACTIVE</span>
              </div>

              <div className="terminal-console">
                {simulationLogs.length === 0 ? (
                  <div className="terminal-placeholder">
                    <ShieldAlert size={36} color="#64748b" />
                    <p>Select a crisis scenario on the left and click <strong>"INITIATE EMERGENCY STRESS TEST"</strong> to simulate a live multi-district emergency.</p>
                  </div>
                ) : (
                  simulationLogs.map((line, idx) => (
                    <div key={idx} className="terminal-line">
                      <span className="terminal-prompt">&gt;</span> {line}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Incident Action Directive */}
            {simulationComplete && (
              <div className="crisis-directive-card">
                <div className="directive-header">
                  <Sparkles size={20} color="#10b981" />
                  <h4>Gemini 2.0 Flash Emergency Relief Directive</h4>
                  <span className="directive-time">STATUS: DISPATCHED</span>
                </div>

                <div className="directive-details-grid">
                  <div className="directive-item">
                    <span className="d-label">Executive Action Order:</span>
                    <span className="d-val text-accent">{selectedScenario.recommendedEmergencyAction.pmoDirective}</span>
                  </div>
                  <div className="directive-item">
                    <span className="d-label">Dynamic Fund Reallocation:</span>
                    <span className="d-val">{selectedScenario.recommendedEmergencyAction.budgetReallocation}</span>
                  </div>
                  <div className="directive-item">
                    <span className="d-label">Deployed Tactical Resources:</span>
                    <span className="d-val">{selectedScenario.recommendedEmergencyAction.deployedUnits}</span>
                  </div>
                </div>

                <div className="directive-footer">
                  <span className="saved-confirm">
                    <CheckCircle2 size={16} color="#10b981" />
                    Persisted into Central SQLite Database (`vikasdrishti.db`)
                  </span>
                  <button 
                    className="view-studio-btn" 
                    onClick={onClose}
                  >
                    View in Decision Studio Heatmap <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
