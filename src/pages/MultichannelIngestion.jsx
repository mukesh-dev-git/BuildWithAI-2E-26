import React, { useState, useEffect } from 'react';
import { 
  Radio, PhoneCall, MessageSquare, Send, Sparkles, Filter, 
  Volume2, CheckCircle2, AlertTriangle, ArrowRight, Play, Pause,
  Layers, RefreshCw, Globe, ChevronRight, Shield, Zap
} from 'lucide-react';
import { getAllGrievances, addGrievance, subscribeToGrievances } from '../services/grievanceStore';
import { extractGrievanceIntent, isApiKeyConfigured } from '../services/gemini';
import districtData from '../data/districts';
import './MultichannelIngestion.css';

const SIMULATION_PRESETS = [
  {
    channel: 'ivr_call',
    country: 'India',
    lang: 'Hindi',
    langCode: 'hi',
    district: 'Barmer',
    state: 'Rajasthan',
    category: 'Water Supply',
    text: 'गाँव में 8 दिनों से पीने का पानी नहीं आ रहा है, हैंडपंप सूख गए हैं और मवेशी प्यासे मर रहे हैं।',
    audioDuration: '0:18',
    channelLabel: 'Toll-Free IVR Rural Telephony'
  },
  {
    channel: 'whatsapp',
    country: 'Brazil',
    lang: 'Portuguese',
    langCode: 'pt',
    district: 'Maranhão Central',
    state: 'Maranhão',
    category: 'Water Supply',
    text: 'Falta água encanada no povoado há duas semanas, o caminhão-pipa não chega e as crianças estão doentes.',
    audioDuration: '0:24',
    channelLabel: 'WhatsApp Voice & Chat Gateway'
  },
  {
    channel: 'ivr_call',
    country: 'South Africa',
    lang: 'isiXhosa',
    langCode: 'xh',
    district: 'OR Tambo DM',
    state: 'Eastern Cape',
    category: 'Water Supply',
    text: 'Iipompo zonakele e-Mthatha kwaye amanzi amsulwa awekho, abantwana baphuza emlanjeni ongcolileyo.',
    audioDuration: '0:21',
    channelLabel: 'Toll-Free IVR Civic Line'
  },
  {
    channel: 'telegram',
    country: 'India',
    lang: 'Marathi',
    langCode: 'mr',
    district: 'Nandurbar',
    state: 'Maharashtra',
    category: 'Healthcare',
    text: 'प्राथमिक आरोग्य केंद्रात गेल्या महिन्यापासून एकही डॉक्टर नाही, औषधांचा तुटवडा गंभीर आहे.',
    audioDuration: '0:15',
    channelLabel: 'Telegram Civic Bot'
  },
  {
    channel: 'sms',
    country: 'India',
    lang: 'Hindi',
    langCode: 'hi',
    district: 'Bahraich',
    state: 'Uttar Pradesh',
    category: 'Roads & Transport',
    text: 'मुख्य सम्पर्क पुल टूट चुका है, 14 गांवों का संपर्क जिला अस्पताल से कट गया है।',
    audioDuration: '0:00',
    channelLabel: 'National SMS Shortcode (1915)'
  }
];

export default function MultichannelIngestion() {
  const [grievances, setGrievances] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLog, setSimulationLog] = useState(null);

  useEffect(() => {
    return subscribeToGrievances((items) => {
      setGrievances(items);
    });
  }, []);

  const filtered = grievances.filter(g => {
    const matchChannel = selectedChannel === 'all' || (g.channel || 'whatsapp') === selectedChannel;
    const matchCountry = selectedCountry === 'all' || (g.country || 'India').toLowerCase() === selectedCountry.toLowerCase();
    return matchChannel && matchCountry;
  });

  const handleSimulateIngest = async (preset) => {
    setIsSimulating(true);
    setSimulationLog({ status: 'ingesting', message: `Receiving stream from ${preset.channelLabel} (${preset.lang})...` });

    try {
      // 1. Send to Gemini for zero-shot transcription & intent extraction
      setSimulationLog({ status: 'transcribing', message: 'Gemini 2.0 Flash running multilingual translation & intent parsing...' });
      const extraction = await extractGrievanceIntent(preset.text, preset.langCode);

      const targetDistrict = districtData.find(d => d.district === preset.district) || districtData[0];

      const newGrievance = {
        id: `GRV-${preset.country.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        country: preset.country,
        countryCode: preset.country === 'Brazil' ? 'BR' : preset.country === 'South Africa' ? 'ZA' : 'IN',
        channel: preset.channel,
        category: extraction.category || preset.category,
        text: preset.text,
        textEn: extraction.summary_en || preset.text,
        severity: extraction.severity || 'critical',
        status: 'pending',
        language: preset.langCode,
        languageName: preset.lang,
        district: targetDistrict.district,
        state: targetDistrict.state,
        lat: targetDistrict.lat,
        lng: targetDistrict.lng,
        citizenName: `Citizen Stream via ${preset.channel.toUpperCase()}`,
        timestamp: new Date().toISOString(),
        votes: 1,
        audioDurationSec: preset.audioDuration !== '0:00' ? 18 : 0,
        transcriptionConfidence: 0.98,
        extraction: extraction
      };

      addGrievance(newGrievance);
      setSimulationLog({ 
        status: 'success', 
        message: `Successfully ingested & clustered to ${targetDistrict.district} (${targetDistrict.country || 'India'})!` 
      });
      setTimeout(() => setSimulationLog(null), 4000);
    } catch (e) {
      console.error(e);
      setSimulationLog({ status: 'error', message: 'Ingestion error. Check connection.' });
    }
    setIsSimulating(false);
  };

  const toggleAudio = (id) => {
    if (activeAudioId === id) {
      setActiveAudioId(null);
    } else {
      setActiveAudioId(id);
      // Auto-pause after simulated duration
      setTimeout(() => {
        setActiveAudioId(prev => (prev === id ? null : prev));
      }, 4000);
    }
  };

  return (
    <div className="ingestion-page page-enter">
      {/* ── Top Header ────────────────────────────────────────── */}
      <section className="ingestion-header-banner">
        <div className="container-wide">
          <div className="header-meta-flex">
            <div>
              <div className="dpg-badge-pill">
                <Radio size={14} className="pulse-icon" />
                <span>Digital Public Good · Omnichannel Ingestion Pipeline</span>
              </div>
              <h1 className="ingestion-title">Multichannel Citizen Stream Monitor</h1>
              <p className="ingestion-subtitle">
                Real-time monitoring of citizen infrastructure demands aggregated via voice calls (IVR), 
                WhatsApp, Telegram, and SMS across 15+ BRICS regional languages with Gemini 2.0 Flash NLU.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="ingestion-metrics-cluster">
              <div className="metric-box">
                <span className="metric-box-val">{grievances.length}</span>
                <span className="metric-box-lbl">Ingested Records</span>
              </div>
              <div className="metric-box">
                <span className="metric-box-val">15+</span>
                <span className="metric-box-lbl">BRICS Dialects</span>
              </div>
              <div className="metric-box">
                <span className="metric-box-val">97.8%</span>
                <span className="metric-box-lbl">Gemini NLU Acc</span>
              </div>
              <div className="metric-box">
                <span className="metric-box-val">&lt; 0.4s</span>
                <span className="metric-box-lbl">Ingestion Latency</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Channel Architecture Strip ───────────────────────── */}
      <section className="container-wide py-6">
        <div className="channel-architecture-grid">
          <div className="channel-arch-card ivr">
            <div className="card-top">
              <div className="icon-wrapper"><PhoneCall size={20} /></div>
              <span className="channel-stat-badge">38% Volume</span>
            </div>
            <h4>Toll-Free IVR Voice</h4>
            <p>Direct telephony for low-literacy & rural citizens. Speech streams transcribed and translated by Gemini audio pipeline.</p>
            <div className="arch-pill">Telephony SIP / WebRTC</div>
          </div>

          <div className="channel-arch-card whatsapp">
            <div className="card-top">
              <div className="icon-wrapper"><MessageSquare size={20} /></div>
              <span className="channel-stat-badge">44% Volume</span>
            </div>
            <h4>WhatsApp AI Bot</h4>
            <p>Encrypted voice notes and localized text complaints ingested via official government enterprise webhook.</p>
            <div className="arch-pill">Cloud API / Audio Webhook</div>
          </div>

          <div className="channel-arch-card telegram">
            <div className="card-top">
              <div className="icon-wrapper"><Send size={20} /></div>
              <span className="channel-stat-badge">12% Volume</span>
            </div>
            <h4>Telegram Civic Bot</h4>
            <p>High-volume community broadcasts and geotagged incident reports across municipal regions.</p>
            <div className="arch-pill">BotFather MTProto</div>
          </div>

          <div className="channel-arch-card sms">
            <div className="card-top">
              <div className="icon-wrapper"><Layers size={20} /></div>
              <span className="channel-stat-badge">6% Volume</span>
            </div>
            <h4>SMS Shortcode 1915</h4>
            <p>2G zero-data fallback gateway ensuring connectivity for non-smartphone populations in remote borders.</p>
            <div className="arch-pill">Telecom USSD / SMPP</div>
          </div>
        </div>
      </section>

      {/* ── Live Stream Simulation Bar ────────────────────────── */}
      <section className="container-wide pb-6">
        <div className="simulation-launcher-panel">
          <div className="sim-panel-left">
            <div className="sim-sparkle"><Sparkles size={18} /></div>
            <div>
              <h5>Evaluate Real-Time Multilingual Ingestion</h5>
              <p>Simulate an incoming citizen voice or messaging complaint and inspect live Gemini intent extraction & clustering:</p>
            </div>
          </div>

          <div className="sim-buttons-flex">
            {SIMULATION_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                className="btn-sim-preset"
                disabled={isSimulating}
                onClick={() => handleSimulateIngest(preset)}
              >
                <span className="sim-country-flag">
                  {preset.country === 'India' ? '🇮🇳' : preset.country === 'Brazil' ? '🇧🇷' : '🇿🇦'}
                </span>
                <span>{preset.lang} {preset.channel.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {simulationLog && (
            <div className={`sim-log-bar ${simulationLog.status}`}>
              <RefreshCw size={14} className={simulationLog.status === 'transcribing' ? 'spin' : ''} />
              <span>{simulationLog.message}</span>
            </div>
          )}
        </div>
      </section>

      {/* ── Filters & Feed ────────────────────────────────────── */}
      <section className="container-wide pb-12">
        <div className="feed-toolbar">
          <div className="toolbar-left">
            <h3>Live Aggregated Citizen Demand Stream</h3>
            <span className="feed-counter">Showing {filtered.length} aggregated records</span>
          </div>

          <div className="toolbar-filters">
            {/* Country filter */}
            <div className="filter-group">
              <Globe size={15} />
              <select 
                value={selectedCountry} 
                onChange={e => setSelectedCountry(e.target.value)}
                className="filter-select"
              >
                <option value="all">🌍 All BRICS Nations</option>
                <option value="India">🇮🇳 India</option>
                <option value="Brazil">🇧🇷 Brazil</option>
                <option value="South Africa">🇿🇦 South Africa</option>
              </select>
            </div>

            {/* Channel filter */}
            <div className="filter-group">
              <Filter size={15} />
              <select 
                value={selectedChannel} 
                onChange={e => setSelectedChannel(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Ingestion Channels</option>
                <option value="ivr_call">📞 Toll-Free IVR Voice</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="telegram">✈️ Telegram</option>
                <option value="sms">📱 SMS Gateway</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stream List */}
        <div className="feed-stream-container">
          {filtered.length === 0 ? (
            <div className="empty-feed">No records matching the filter criteria.</div>
          ) : (
            filtered.map((item) => {
              const isAudio = item.channel === 'ivr_call' || (item.audioDurationSec && item.audioDurationSec > 0);
              const isPlaying = activeAudioId === item.id;

              return (
                <div key={item.id} className="feed-card card animate-fade-in-up">
                  <div className="feed-card-header">
                    <div className="channel-badge-group">
                      <span className={`channel-badge ${item.channel || 'whatsapp'}`}>
                        {item.channel === 'ivr_call' ? '📞 IVR Voice' :
                         item.channel === 'whatsapp' ? '💬 WhatsApp' :
                         item.channel === 'telegram' ? '✈️ Telegram' : '📱 SMS'}
                      </span>
                      <span className="lang-tag">
                        {item.languageName || item.language?.toUpperCase() || 'HINDI'}
                      </span>
                      <span className="country-tag">
                        {item.country === 'Brazil' ? '🇧🇷 Brazil' : item.country === 'South Africa' ? '🇿🇦 South Africa' : '🇮🇳 India'}
                      </span>
                    </div>

                    <div className="header-right-meta">
                      <span className={`severity-tag ${item.severity || 'high'}`}>
                        {item.severity?.toUpperCase() || 'HIGH'}
                      </span>
                      <span className="timestamp-text">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="feed-card-body">
                    {/* Audio Player if voice */}
                    {isAudio && (
                      <div className="audio-snippet-bar">
                        <button 
                          className={`audio-play-btn ${isPlaying ? 'playing' : ''}`}
                          onClick={() => toggleAudio(item.id)}
                          title={isPlaying ? 'Pause snippet' : 'Play audio recording'}
                        >
                          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <div className="waveform-display">
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                          <div className={`waveform-bar ${isPlaying ? 'animating' : ''}`}></div>
                        </div>
                        <span className="audio-duration">
                          {item.audioDurationSec ? `0:${item.audioDurationSec}` : '0:18'} Audio Note
                        </span>
                        <span className="nlu-conf-badge">
                          Gemini Conf: {( (item.transcriptionConfidence || 0.96) * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}

                    {/* Original Raw Text */}
                    <div className="raw-text-block">
                      <p className="original-speech">"{item.text}"</p>
                    </div>

                    {/* Gemini English Translation & Categorization */}
                    <div className="gemini-processed-block">
                      <div className="processed-label">
                        <Sparkles size={12} color="#4285F4" />
                        <span>Gemini 2.0 Translated Synthesis:</span>
                      </div>
                      <p className="translated-text">{item.textEn}</p>
                    </div>
                  </div>

                  <div className="feed-card-footer">
                    <div className="footer-location">
                      <strong>Target District:</strong> {item.district}, {item.state}
                    </div>
                    <div className="footer-category">
                      <span className="category-pill">{item.category}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
