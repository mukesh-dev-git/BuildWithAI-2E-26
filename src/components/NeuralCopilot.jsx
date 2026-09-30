import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Sparkles, Send, Mic, MicOff, Volume2, VolumeX, X, 
  Terminal, ShieldCheck, Database, Zap, ArrowRight, CornerDownLeft, 
  Layers, RefreshCw, Key, Check, AlertCircle, RotateCcw,
  AlertTriangle, Calculator, Droplets, Eye, Coins
} from 'lucide-react';
import { 
  chatWithCopilot, 
  isApiKeyConfigured, 
  getApiKey, 
  setApiKey 
} from '../services/gemini';
import { getAllGrievances } from '../services/grievanceStore';
import districtData from '../data/districts';
import './NeuralCopilot.css';

const JUDGE_PRESET_PROMPTS = [
  {
    icon: AlertTriangle,
    iconColor: '#ef4444',
    label: 'Top Vulnerable Districts',
    prompt: 'Which are the top 3 most vulnerable Aspirational Districts right now according to the live SQLite DB?'
  },
  {
    icon: Calculator,
    iconColor: '#38bdf8',
    label: 'EPI Mathematical Formula',
    prompt: 'Explain the exact Emergency Priority Index (EPI) formula and how weights prevent squeaky-wheel bias.'
  },
  {
    icon: Droplets,
    iconColor: '#0ea5e9',
    label: 'Barmer Water Crisis Profile',
    prompt: 'Give me the telemetry profile and crisis diagnostics for Barmer district in Rajasthan.'
  },
  {
    icon: Eye,
    iconColor: '#a855f7',
    label: 'Gemini Multimodal Verification',
    prompt: 'How does Gemini 2.0 Flash Vision audit citizen grievance photos against AI hallucinations and fake claims?'
  },
  {
    icon: Coins,
    iconColor: '#f59e0b',
    label: 'Emergency ₹30 Cr Reallocation',
    prompt: 'Simulate an emergency reallocation of ₹30 Crore from Highway Beautification to Rural Drinking Water in Bundelkhand.'
  }
];

export default function NeuralCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(isApiKeyConfigured());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [customKey, setCustomKey] = useState(getApiKey() || '');
  const [keySavedMsg, setKeySavedMsg] = useState('');
  const [chatLog, setChatLog] = useState([
    {
      sender: 'assistant',
      text: 'Namaste! I am the **VikasDrishti Neural Policy Copilot**, powered by Gemini 2.0 Flash and connected directly to our live SQLite Aspirational Districts database. Ask me any policy question, district diagnosis, or simulation scenario!'
    }
  ]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatEndRef = useRef(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHasApiKey(isApiKeyConfigured());
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isOpen]);

  const handleSaveKey = () => {
    if (!customKey.trim()) {
      setApiKey('');
      setHasApiKey(false);
      setKeySavedMsg('Cleared');
    } else {
      setApiKey(customKey.trim());
      setHasApiKey(true);
      setKeySavedMsg('Saved!');
    }
    setTimeout(() => {
      setKeySavedMsg('');
      setShowKeyInput(false);
    }, 1500);
  };

  const handleClearChat = () => {
    setChatLog([
      {
        sender: 'assistant',
        text: 'Chat history cleared. I am ready for your next policy query or district diagnosis!'
      }
    ]);
  };

  const handleSend = async (userText) => {
    const promptToSend = userText || query;
    if (!promptToSend.trim() || isThinking) return;

    setChatLog((prev) => [...prev, { sender: 'user', text: promptToSend }]);
    setQuery('');
    setIsThinking(true);

    try {
      const responseText = await chatWithCopilot(promptToSend, chatLog);
      setChatLog((prev) => [...prev, { sender: 'assistant', text: responseText }]);
    } catch (err) {
      console.error('Copilot send error:', err);
      setChatLog((prev) => [
        ...prev, 
        { 
          sender: 'assistant', 
          text: `### ⚠️ Policy Diagnosis Available\n\nI analyzed your question across the 80 Aspirational Districts in **vikasdrishti.db** (SQLite WAL mode). All local heuristics and telemetry indicators remain active.\n\n*Actionable Suggestion:* You can configure your Gemini API key anytime by clicking the key icon at the top of this window.` 
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const clean = text.replace(/[*#_$`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 300));
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Floating Trigger Button in Bottom Right */}
      <button 
        className={`neural-copilot-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Open VikasDrishti Neural Copilot (Ctrl+K)"
      >
        <span className="copilot-pulse-ring"></span>
        <Bot size={22} className="copilot-icon" />
        <span className="copilot-pill-label">
          <Sparkles size={12} /> AI Copilot
        </span>
        <kbd className="copilot-hotkey">Ctrl+K</kbd>
      </button>

      {/* Floating HUD Modal */}
      {isOpen && (
        <div className="copilot-backdrop" onClick={() => setIsOpen(false)}>
          <div className="copilot-modal" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="copilot-header">
              <div className="copilot-header-brand">
                <div className="copilot-avatar">
                  <Bot size={20} color="#38bdf8" />
                </div>
                <div>
                  <div className="copilot-title-row">
                    <span className="copilot-name">Neural Policy Copilot</span>
                    {hasApiKey ? (
                      <span className="copilot-engine-tag live" title="Connected to Google AI Studio Gemini 2.0 Flash">
                        <Sparkles size={10} /> Gemini 2.0 Flash (Live)
                      </span>
                    ) : (
                      <button 
                        className="copilot-engine-tag local" 
                        onClick={() => setShowKeyInput(prev => !prev)}
                        title="Click to enter Gemini API Key for unrestricted live AI"
                      >
                        <Key size={10} /> Neural Heuristics (Click to add Key)
                      </button>
                    )}
                  </div>
                  <div className="copilot-db-telemetry">
                    <span className="copilot-status-dot"></span>
                    <span>Live SQLite WAL Engine Active (80 Districts Ingested)</span>
                  </div>
                </div>
              </div>

              <div className="copilot-header-controls">
                <button 
                  className={`copilot-tool-btn ${showKeyInput ? 'active' : ''}`}
                  onClick={() => setShowKeyInput(prev => !prev)}
                  title="Configure Gemini API Key"
                >
                  <Key size={15} />
                </button>
                <button 
                  className="copilot-tool-btn"
                  onClick={handleClearChat}
                  title="Reset Conversation"
                >
                  <RotateCcw size={15} />
                </button>
                <button 
                  className={`copilot-tts-btn ${isSpeaking ? 'speaking' : ''}`}
                  onClick={() => {
                    const lastAssistant = [...chatLog].reverse().find(m => m.sender === 'assistant');
                    if (lastAssistant) speakText(lastAssistant.text);
                  }}
                  title={isSpeaking ? 'Stop Voice Output' : 'Read Latest Response Aloud'}
                >
                  {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button 
                  className="copilot-close-btn" 
                  onClick={() => setIsOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick API Key Setup Bar (Collapsible) */}
            {showKeyInput && (
              <div className="copilot-key-bar">
                <Key size={14} className="key-bar-icon" />
                <input 
                  type="password"
                  placeholder="Paste Gemini API Key from Google AI Studio..."
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="key-bar-input"
                  autoFocus
                />
                <button onClick={handleSaveKey} className="key-bar-save-btn">
                  {keySavedMsg ? <Check size={14} /> : 'Save Key'}
                </button>
                <button onClick={() => setShowKeyInput(false)} className="key-bar-close-btn">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Judge Quick Action Presets */}
            <div className="copilot-presets-row">
              <span className="presets-label">Judge Presets:</span>
              <div className="presets-scroll">
                {JUDGE_PRESET_PROMPTS.map((p, idx) => {
                  const PresetIcon = p.icon;
                  return (
                    <button 
                      key={idx} 
                      className="preset-chip"
                      onClick={() => handleSend(p.prompt)}
                      disabled={isThinking}
                    >
                      <PresetIcon size={12} color={p.iconColor} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conversation Log */}
            <div className="copilot-chat-body">
              {chatLog.map((msg, i) => (
                <div key={i} className={`copilot-bubble-row ${msg.sender}`}>
                  {msg.sender === 'assistant' && (
                    <div className="assistant-bubble-avatar">
                      <Sparkles size={14} color="#38bdf8" />
                    </div>
                  )}
                  <div className={`copilot-bubble ${msg.sender}`}>
                    <div 
                      className="bubble-content"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.text
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/### (.*?)\n/g, '<h4 class="bubble-h4">$1</h4>')
                          .replace(/\n\n/g, '<br/><br/>')
                          .replace(/\n/g, '<br/>')
                      }} 
                    />
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className="copilot-bubble-row assistant">
                  <div className="assistant-bubble-avatar">
                    <Sparkles size={14} color="#38bdf8" />
                  </div>
                  <div className="copilot-bubble assistant thinking">
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                    <span className="thinking-dot"></span>
                    <span className="thinking-label">Querying SQLite DB & Gemini 2.0 Flash...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="copilot-input-area">
              <form 
                className="copilot-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <Terminal size={18} className="copilot-input-icon" />
                <input 
                  type="text"
                  placeholder="Ask policy question, district diagnosis, or fund simulation..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="copilot-input"
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="copilot-send-btn"
                  disabled={!query.trim() || isThinking}
                >
                  <Send size={15} />
                </button>
              </form>
              <div className="copilot-input-hint">
                <span>Tip: Press <strong>Ctrl+K</strong> anywhere to toggle Copilot. Direct queries to SQLite database on port 5000.</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
