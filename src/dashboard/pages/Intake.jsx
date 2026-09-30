import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Mic, MicOff, Sparkles } from 'lucide-react';
import { apiPost, useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { Note, Panel, SectorTag } from '../components/ui';
import { classifyDevelopmentRequest, isApiKeyConfigured } from '../../services/gemini';

// BCP-47 tags for browser speech recognition, one or more per BRICS member
const LANGUAGES = [
  ['pt-BR', 'Português (Brasil)'], ['ru-RU', 'Русский'], ['hi-IN', 'हिन्दी'], ['en-IN', 'English (India)'], ['bn-IN', 'বাংলা'],
  ['ta-IN', 'தமிழ்'], ['te-IN', 'తెలుగు'], ['zh-CN', '中文'], ['zu-ZA', 'isiZulu'], ['af-ZA', 'Afrikaans'], ['en-ZA', 'English (South Africa)'],
  ['ar-EG', 'العربية (مصر)'], ['am-ET', 'አማርኛ'], ['fa-IR', 'فارسی'], ['ar-AE', 'العربية (الإمارات)'], ['id-ID', 'Bahasa Indonesia'],
];
const CHANNELS = [['web', 'Web form'], ['voice', 'Voice'], ['sms', 'SMS'], ['whatsapp', 'WhatsApp'], ['telegram', 'Telegram']];
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function Intake() {
  const { meta, country: globalCountry } = useDashboard();
  const [country, setCountry] = useState(globalCountry === 'ALL' ? 'BRA' : globalCountry);
  const regions = useApi('/regions', { country });
  const [form, setForm] = useState({ regionId: '', text: '', sector: '', subject: '', channel: 'web', language: 'pt-BR' });
  const [classifying, setClassifying] = useState(false);
  const [classification, setClassification] = useState(null);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);
  const recRef = useRef(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { set('regionId', ''); }, [country]);

  const toggleVoice = () => {
    if (!Recognition) return;
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Recognition();
    rec.lang = form.language;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      setForm((f) => ({ ...f, text: f.text ? `${f.text} ${said}` : said, channel: 'voice' }));
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => { setError(`Voice input: ${e.error}`); setListening(false); };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const classify = async () => {
    if (!form.text.trim()) return;
    setClassifying(true);
    const c = await classifyDevelopmentRequest(form.text);
    setClassification(c);
    setForm((f) => ({ ...f, sector: c.sector, subject: c.subject || f.subject }));
    setClassifying(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { id } = await apiPost('/requests', {
        regionId: form.regionId || null, text: form.text, sector: form.sector, subject: form.subject,
        channel: form.channel, language: form.language.split('-')[0], type: 'request',
      });
      setSaved({ id, sector: form.sector });
      setForm((f) => ({ ...f, text: '', subject: '', sector: '' }));
      setClassification(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const sectors = meta ? Object.entries(meta.sectors) : [];

  return (
    <div className="grid grid-2">
      <Panel title="Submit a development request" subtitle="Voice or text, in any BRICS language. Requests flow into the same pipeline as the open-data records.">
        <form className="form" onSubmit={submit}>
          <div className="form-row">
            <label>Country
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                {meta?.countries.map((c) => <option key={c.iso3} value={c.iso3}>{c.name}</option>)}
              </select>
            </label>
            <label>State / province
              <select value={form.regionId} onChange={(e) => set('regionId', e.target.value)}>
                <option value="">Not specified</option>
                {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>Language
              <select value={form.language} onChange={(e) => set('language', e.target.value)}>
                {LANGUAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label>Channel
              <select value={form.channel} onChange={(e) => set('channel', e.target.value)}>
                {CHANNELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
          </div>
          <label>Request
            <textarea value={form.text} onChange={(e) => set('text', e.target.value)} required
              placeholder="e.g. A ponte da estrada rural caiu e as crianças não conseguem chegar à escola." />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={toggleVoice} disabled={!Recognition} title={Recognition ? '' : 'Speech recognition is not supported in this browser'}>
              {listening ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Speak</>}
            </button>
            <button type="button" className="btn" onClick={classify} disabled={!form.text.trim() || classifying}>
              <Sparkles size={14} /> {classifying ? 'Classifying…' : 'Auto-classify'}
            </button>
          </div>
          {classification && (
            <Note>
              Classified as <SectorTag sector={classification.sector} />
              {classification.summary_en && <> — “{classification.summary_en}”</>}
              <span className="muted"> ({classification.confidence === 'gemini' ? 'Gemini' : classification.confidence === 'keyword' ? 'keyword match' : 'no match, please choose'})</span>
            </Note>
          )}
          <div className="form-row">
            <label>Sector
              <select value={form.sector} onChange={(e) => set('sector', e.target.value)} required>
                <option value="">Choose…</option>
                {sectors.map(([id, s]) => <option key={id} value={id}>{s.label}</option>)}
              </select>
            </label>
            <label>Subject (optional)
              <input type="text" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="e.g. Rural bridge collapse" />
            </label>
          </div>
          {error && <div className="dash-empty" style={{ color: 'var(--d-bad)' }}>{error}</div>}
          <div><button className="btn btn-primary" type="submit">Submit request</button></div>
        </form>
      </Panel>

      <div className="map-side">
        {saved && (
          <Panel title="Request recorded">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <CheckCircle2 color="var(--d-good)" />
              <div>Saved as #{saved.id} under <SectorTag sector={saved.sector} />. It now appears in the Request Explorer (source: Citizen Intake).</div>
            </div>
          </Panel>
        )}
        <Panel title="How intake works">
          <ul className="list-plain" style={{ gap: 10 }}>
            <li><span><strong>1. Capture:</strong> typed text, or speech transcribed in the browser in 16 languages.</span></li>
            <li><span><strong>2. Classify:</strong> {isApiKeyConfigured() ? 'Gemini maps any language to a development sector.' : 'keyword matching (add a Gemini API key for multilingual AI classification).'}</span></li>
            <li><span><strong>3. Aggregate:</strong> stored alongside the open-data records, so it counts toward the same region × sector demand used for priorities.</span></li>
          </ul>
        </Panel>
        <Note>SMS, WhatsApp and Telegram are listed as channels so operators can log requests received there. Live connections to those services are not wired up yet.</Note>
      </div>
    </div>
  );
}
