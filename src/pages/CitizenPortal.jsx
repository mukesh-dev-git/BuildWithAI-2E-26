import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Send, Camera, MapPin, CheckCircle2, AlertCircle, Loader2, X, ChevronDown, Volume2, ThumbsUp, Sparkles } from 'lucide-react';
import { extractGrievanceIntent, verifyPhoto, isApiKeyConfigured } from '../services/gemini';
import { getAllGrievances, addGrievance, subscribeToGrievances, upvoteGrievance } from '../services/grievanceStore';
import districtData from '../data/districts';
import './CitizenPortal.css';

const categories = [
  'Roads & Transport', 'Water Supply', 'Sanitation', 'Education',
  'Healthcare', 'Electricity', 'Housing', 'Agriculture', 'Public Safety', 'Other'
];

const categoryEmojis = {
  'Roads & Transport': '🛣️', 'Water Supply': '💧', 'Sanitation': '🧹',
  'Education': '📚', 'Healthcare': '🏥', 'Electricity': '⚡',
  'Housing': '🏠', 'Agriculture': '🌾', 'Public Safety': '🛡️', 'Other': '📋'
};

const SAMPLE_PROMPTS = [
  { label: '💧 Water Crisis (Hindi)', text: 'गाँव में 5 दिनों से पीने का पानी नहीं आ रहा है, हैंडपंप भी खराब है', district: 'Barmer', state: 'Rajasthan' },
  { label: '🛣️ Broken Road/Bridge (Hindi)', text: 'मुख्य मार्ग का पुल टूट गया है, बारिश में गाँव कट गया है, गाड़ियाँ नहीं निकल पा रही हैं', district: 'Purnia', state: 'Bihar' },
  { label: '⚡ Burnt Transformer (Hindi)', text: 'बिजली का ट्रांसफॉर्मर जल गया है, पूरा मोहल्ला 3 दिनों से अंधेरे में है', district: 'Damoh', state: 'Madhya Pradesh' },
  { label: '🏥 No Doctor at PHC (Hindi)', text: 'प्राथमिक स्वास्थ्य केंद्र पर डॉक्टर नहीं है, प्रसूति और दवाइयों की भारी समस्या है', district: 'Kupwara', state: 'Jammu & Kashmir' },
];

export default function CitizenPortal() {
  const [isRecording, setIsRecording] = useState(false);
  const [text, setText] = useState('');
  const [selectedDistrictName, setSelectedDistrictName] = useState('Barmer');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [recentGrievances, setRecentGrievances] = useState([]);
  const [location, setLocation] = useState(null);
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [notification, setNotification] = useState('');
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return subscribeToGrievances((items) => {
      setRecentGrievances(items.slice(0, 8));
    });
  }, []);

  // ── Voice Recording ──────────────────
  const startRecording = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'hi-IN'; // Default to Hindi, Gemini handles translation

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ── Photo Upload ─────────────────────
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    // Convert to base64 and verify with Gemini
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      if (isApiKeyConfigured()) {
        setIsProcessing(true);
        const analysis = await verifyPhoto(base64, file.type);
        setPhotoAnalysis(analysis);
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Get GPS Location ─────────────────
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error('Geolocation error:', err)
      );
    }
  };

  // ── Submit Grievance ─────────────────
  const handleSubmit = async () => {
    if (!text.trim() && !photo) return;

    setIsProcessing(true);
    getLocation();

    try {
      const extraction = await extractGrievanceIntent(text);
      setResult(extraction);
      setIsProcessing(false);
      setSubmitted(true);

      const targetDistrict = districtData.find(d => d.district === selectedDistrictName) || districtData[0];

      // Add to Central Grievance Repository
      const newGrievance = {
        id: `GRV-${Date.now()}`,
        category: extraction.category || 'Roads & Transport',
        text: text,
        textEn: extraction.summary_en || text,
        severity: extraction.severity || 'high',
        status: 'pending',
        language: extraction.detected_language || 'hi',
        district: targetDistrict.district,
        state: targetDistrict.state,
        lat: location?.lat || targetDistrict.lat || 28.6139,
        lng: location?.lng || targetDistrict.lng || 77.209,
        citizenName: 'Verified Citizen (Jan-Samvaad)',
        timestamp: new Date().toISOString(),
        votes: 1,
        imageDescription: photoAnalysis?.damage_description || '',
      };

      addGrievance(newGrievance);
      setNotification(`Issue logged! ${targetDistrict.district} EPI priority score recalculating...`);
      setTimeout(() => setNotification(''), 5000);
    } catch (error) {
      console.error('Submission error:', error);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setText('');
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoAnalysis(null);
    setResult(null);
    setSubmitted(false);
    setLocation(null);
  };

  const severityColors = {
    critical: 'var(--danger)',
    high: 'var(--saffron)',
    medium: 'var(--warning)',
    low: 'var(--success)',
  };

  return (
    <div className="citizen-portal page-enter">
      <div className="container">
        {/* ── Header ─────────────────────── */}
        <div className="cp-header animate-fade-in">
          <h2>🗣️ Report a Civic Issue</h2>
          <p className="cp-subtitle">
            Speak, type, or upload a photo in any Indian language — our AI will understand.
          </p>
          {!isApiKeyConfigured() && (
            <div className="api-notice">
              <AlertCircle size={16} />
              <span>Running in demo mode. Add VITE_GEMINI_API_KEY to .env for full Gemini AI features.</span>
            </div>
          )}
        </div>

        <div className="cp-layout">
          {/* ── Input Panel ──────────────── */}
          <div className="cp-input-panel">
            {!submitted ? (
              <div className="input-card card animate-fade-in-up stagger-1">
                {/* Mic Button */}
                <div className="mic-section">
                  <button
                    className={`mic-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                  >
                    {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
                  </button>
                  <p className="mic-label">
                    {isRecording ? '🔴 Recording... Tap to stop' : 'Tap to speak in any language'}
                  </p>
                </div>

                {/* Demo Quick Prompts */}
                <div className="quick-prompts">
                  <span className="qp-label"><Sparkles size={13} /> Quick Test Prompts (1-Click):</span>
                  <div className="qp-chips">
                    {SAMPLE_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="qp-chip"
                        onClick={() => {
                          setText(p.text);
                          setSelectedDistrictName(p.district);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* District Selector */}
                <div className="district-select-row">
                  <label htmlFor="district-select" className="input-label">
                    <MapPin size={15} /> Aspirational District:
                  </label>
                  <select
                    id="district-select"
                    className="select-input"
                    value={selectedDistrictName}
                    onChange={(e) => setSelectedDistrictName(e.target.value)}
                  >
                    {districtData.map(d => (
                      <option key={d.district} value={d.district}>
                        {d.district} ({d.state}) — Infra Gap: {100 - d.infraIndex}%
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Input */}
                <textarea
                  className="textarea"
                  placeholder="Type your issue here in any language...
अपनी समस्या यहाँ लिखें...
உங்கள் பிரச்சினையை இங்கே எழுதுங்கள்..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                />

                {/* Photo Upload */}
                <div className="photo-section">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                    id="photo-upload"
                  />
                  
                  {photoPreview ? (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Uploaded civic issue" />
                      <button className="photo-remove" onClick={removePhoto}>
                        <X size={16} />
                      </button>
                      {photoAnalysis && (
                        <div className="photo-analysis">
                          <span className={`badge ${photoAnalysis.is_valid_civic_issue ? 'badge-success' : 'badge-danger'}`}>
                            {photoAnalysis.is_valid_civic_issue ? '✓ Verified Civic Issue' : '✗ Review Needed'}
                          </span>
                          <p>{photoAnalysis.damage_description}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <label htmlFor="photo-upload" className="photo-upload-btn">
                      <Camera size={20} />
                      <span>Upload Photo Evidence</span>
                    </label>
                  )}
                </div>

                {/* Location */}
                <button className="location-btn" onClick={getLocation}>
                  <MapPin size={16} />
                  {location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Capture GPS Location'}
                </button>

                {/* Submit */}
                <button
                  className="btn btn-saffron btn-lg w-full submit-btn"
                  onClick={handleSubmit}
                  disabled={isProcessing || (!text.trim() && !photo)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analyzing with Gemini AI...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Submit Grievance
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* ── Success State ──────────── */
              <div className="success-card card animate-scale-in">
                <div className="success-icon">
                  <CheckCircle2 size={48} />
                </div>
                <h3>Grievance Registered!</h3>
                <p className="success-id">ID: GRV-{Date.now().toString().slice(-6)}</p>

                {result && (
                  <div className="result-details">
                    <div className="result-row">
                      <span className="result-label">Category</span>
                      <span className="result-value">
                        {categoryEmojis[result.category]} {result.category}
                      </span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Severity</span>
                      <span className="badge" style={{ 
                        background: `${severityColors[result.severity]}15`,
                        color: severityColors[result.severity]
                      }}>
                        {result.severity?.toUpperCase()}
                      </span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Summary</span>
                      <span className="result-value">{result.summary_en}</span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Department</span>
                      <span className="result-value">{result.suggested_department}</span>
                    </div>
                    {result.urgency_reasoning && (
                      <div className="result-row">
                        <span className="result-label">AI Reasoning</span>
                        <span className="result-value ai-reasoning">{result.urgency_reasoning}</span>
                      </div>
                    )}
                  </div>
                )}

                <button className="btn btn-primary btn-lg w-full" onClick={resetForm}>
                  Report Another Issue
                </button>
              </div>
            )}
          </div>

          {/* ── Recent Grievances ─────────── */}
          <div className="cp-sidebar">
            <h4 className="sidebar-title">📋 Recent Reports</h4>
            <div className="grievance-list">
              {recentGrievances.map((g, i) => (
                <div 
                  key={g.id} 
                  className={`grievance-card card priority-${g.severity === 'critical' ? 'high' : g.severity} animate-fade-in`}
                  style={{ animationDelay: `${0.05 * i}s`, opacity: 0 }}
                >
                  <div className="gc-header">
                    <span className="gc-category">
                      {categoryEmojis[g.category]} {g.category}
                    </span>
                    <span className={`badge badge-${g.severity === 'critical' ? 'danger' : g.severity === 'high' ? 'warning' : 'success'}`}>
                      {g.severity}
                    </span>
                  </div>
                  <p className="gc-text">{g.textEn}</p>
                  <div className="gc-meta">
                    <span>📍 {g.district}, {g.state}</span>
                    <button 
                      type="button" 
                      className="upvote-btn" 
                      onClick={() => upvoteGrievance(g.id)}
                      title="Endorse this civic issue"
                    >
                      <ThumbsUp size={12} /> {g.votes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {notification && (
          <div className="portal-toast animate-fade-in-up">
            <Sparkles size={16} />
            <span>{notification}</span>
          </div>
        )}
      </div>
    </div>
  );
}
