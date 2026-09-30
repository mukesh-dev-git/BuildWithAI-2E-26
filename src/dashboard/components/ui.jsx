import { Loader2, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { useDashboard } from '../DashboardContext';
import { FLAGS } from '../format';

export function Panel({ title, subtitle, actions, children, className = '', flush = false }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-head">
          <div>
            {title && <h2 className="panel-title">{title}</h2>}
            {subtitle && <p className="panel-sub">{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'panel-body flush' : 'panel-body'}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, delta, hint, invertDelta = false }) {
  const up = delta && delta.value >= 0;
  const good = delta && (invertDelta ? !up : up);
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {delta && (
          <span className={`kpi-delta ${good ? 'good' : 'bad'}`}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {delta.label}
          </span>
        )}
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    </div>
  );
}

export function SectorTag({ sector }) {
  const { meta } = useDashboard();
  const s = meta?.sectors[sector];
  if (!s) return <span className="tag">{sector}</span>;
  return (
    <span className="tag" style={{ '--tag': s.color }}>
      <i className="tag-dot" />{s.label}
    </span>
  );
}

export function CountryName({ iso3, name }) {
  const { meta } = useDashboard();
  return <span className="nowrap">{FLAGS[iso3]} {name || meta?.countries.find((c) => c.iso3 === iso3)?.name || iso3}</span>;
}

export function ScoreBar({ score }) {
  const tone = score >= 75 ? 'critical' : score >= 55 ? 'high' : score >= 35 ? 'medium' : 'low';
  return (
    <div className={`score score-${tone}`}>
      <div className="score-track"><div className="score-fill" style={{ width: `${score}%` }} /></div>
      <span className="score-num">{score}</span>
    </div>
  );
}

export function BasisBadge({ basis }) {
  return basis === 'citizen-demand'
    ? <span className="badge badge-demand" title="Scored from real citizen requests plus national indicators">Citizen demand</span>
    : <span className="badge badge-need" title="No open citizen-feedback data — scored from national infrastructure gap only">Indicator need</span>;
}

export function Loading({ label = 'Loading…' }) {
  return <div className="dash-loading"><Loader2 size={18} className="spin" /> {label}</div>;
}

export function ErrorNote({ error }) {
  return <div className="dash-empty"><strong>Couldn’t load this view.</strong> {error?.message}</div>;
}

export function Note({ children }) {
  return <div className="note"><Info size={15} /><div>{children}</div></div>;
}

/** Wraps the standard loading / error / content states of a useApi() result. */
export function Async({ state, children, label }) {
  if (state.error) return <ErrorNote error={state.error} />;
  if (!state.data) return <Loading label={label} />;
  return children(state.data);
}
