import { useState } from 'react';
import { Check, ChevronDown, Loader, Minus } from 'lucide-react';
import { apiPost } from '../api';
import Modal from './Modal';
import ThemeIcon from './ThemeIcon';

export const STATE_LABEL = { completed: 'Completed', in_progress: 'In progress', not_started: 'Not started', na: 'Not a priority' };
export const SOURCE_LABEL = { data: 'From data', curated: 'Programme record', reported: 'Reported', none: 'Awaiting update' };

/** Milestone mark: done = green tick, in progress = blue ring, not started = empty box, n/a = dash */
export function Mark({ status, size = 22, title }) {
  const cls = `mk mk-${status}`;
  return (
    <span className={cls} style={{ width: size, height: size }} title={title} aria-label={title || status}>
      {status === 'done' && <Check size={size * 0.7} strokeWidth={3.2} />}
      {status === 'in_progress' && <Loader size={size * 0.8} strokeWidth={2.6} />}
      {status === 'na' && <Minus size={size * 0.7} strokeWidth={2.6} />}
    </span>
  );
}

export function MarkLegend() {
  return (
    <div className="mk-legend">
      <span><Mark status="done" size={16} /> Completed</span>
      <span><Mark status="in_progress" size={16} /> In progress</span>
      <span><Mark status="not_started" size={16} /> Not started</span>
      <span><Mark status="na" size={16} /> Not applicable</span>
    </div>
  );
}

export function Donut({ value, size = 78, stroke = 9, color = '#2563eb' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg className="donut" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--d-border)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${c * value} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.24} fontWeight="800" fill="var(--d-text)">{Math.round(value * 100)}%</text>
    </svg>
  );
}

export const progressColor = (p) => (p >= 0.75 ? '#16a34a' : p >= 0.5 ? '#2563eb' : p >= 0.34 ? '#f59e0b' : '#f0476a');

export function ProgressBar({ value, width = 70 }) {
  return (
    <span className="pbar" style={{ width }}>
      <span style={{ width: `${value * 100}%`, background: progressColor(value) }} />
    </span>
  );
}

export function GoalSelect({ goals, value, onChange }) {
  const g = goals.find((x) => x.id === value);
  return (
    <label className="goal-select">
      {g && <ThemeIcon icon={g.icon} color={g.color} size={24} />}
      <span className="gs-text"><strong>{g?.label}</strong><small>{g?.blurb}</small></span>
      <ChevronDown size={18} className="muted" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Select goal">
        {goals.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
    </label>
  );
}

/** Update one member's milestone. Saved for everyone; "Use data default" removes the override. */
export function MilestoneModal({ iso3, name, goal, milestone, onClose, onSaved }) {
  const [status, setStatus] = useState(milestone.status === 'na' ? 'not_started' : milestone.status);
  const [date, setDate] = useState(milestone.date?.length === 10 ? milestone.date : '');
  const [note, setNote] = useState(milestone.source === 'reported' ? milestone.evidence : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const save = async (body) => {
    setSaving(true);
    setError(null);
    try {
      await apiPost('/goals/milestone', { iso3, goal: goal.id, milestone: milestone.id, ...body });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Update status: ${milestone.label}`} subtitle={`${name} · ${goal.label}`}>
      <div className="form">
        <p className="muted small">Current: {SOURCE_LABEL[milestone.source]}. {milestone.derived ? `Data default: ${milestone.derived.evidence}` : milestone.evidence}</p>
        <div className="status-pick" role="radiogroup" aria-label="Status">
          {[['done', 'Completed'], ['in_progress', 'In progress'], ['not_started', 'Not started'], ['na', 'Not applicable']].map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={status === k} className={status === k ? 'on' : ''} onClick={() => setStatus(k)}>
              <Mark status={k} size={18} /> {l}
            </button>
          ))}
        </div>
        <label>Date (optional)<input type="text" placeholder="YYYY-MM-DD" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Note or source<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cabinet approval, ministry circular, pilot district list" style={{ minHeight: 80 }} /></label>
        {error && <p style={{ color: 'var(--d-bad)' }}>{error}</p>}
        <div className="rd-buttons">
          {milestone.source === 'reported' && <button className="outline-btn" disabled={saving} onClick={() => save({ reset: true })}>Use data default</button>}
          <button className="btn-brand" disabled={saving} onClick={() => save({ status, date: date || null, note: note || null })}>Save status</button>
        </div>
      </div>
    </Modal>
  );
}
