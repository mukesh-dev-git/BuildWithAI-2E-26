import { useState } from 'react';
import { ChevronRight, Handshake, Users } from 'lucide-react';
import { useApi } from '../api';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import ThemeIcon from '../components/ThemeIcon';
import { Async, Note } from '../components/ui';
import { ThemeModal } from './ExecutiveOverview';
import './executive.css';

export default function Cooperation() {
  const state = useApi('/executive', { months: 12 });
  const [theme, setTheme] = useState(null);

  return (
    <Async state={state} label="Finding cooperation opportunities…">
      {(d) => (
        <div className="exec">
          <Note>
            Opportunities are derived from World Bank indicators. <strong>Shared challenges</strong> are themes where several members score 25+ on need.
            <strong> Knowledge exchanges</strong> pair members who now have a low need <em>and</em> improved fastest on the theme’s headline indicator since about 2010
            with members where the need is highest. Open any card to compare trends, investment and flagship programmes.
          </Note>
          <div className="exec-row exec-row-a" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
            <section className="ecard">
              <header className="ecard-head">
                <div className="ecard-icon"><Users size={26} color="#1d4ed8" /></div>
                <div className="ecard-titles"><h2>Shared challenges</h2><p>Themes several members rank as a priority</p></div>
              </header>
              <div className="coop-grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                {d.themes.filter((t) => t.priorityCount >= 2).map((t) => (
                  <button key={t.id} className="coop" onClick={() => setTheme(t.id)}>
                    <span className="coop-icon" style={{ background: `${t.color}18` }}><ThemeIcon icon={t.icon} color={t.color} size={20} /></span>
                    <span className="coop-body">
                      <strong>{t.label} · {t.priorityCount} members</strong>
                      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {t.priorityCountries.map((c) => <span key={c.iso3} className="nowrap" style={{ fontSize: 12 }}><Flag iso3={c.iso3} size={16} /> {c.name} <span className="muted">{c.score}</span></span>)}
                      </span>
                    </span>
                    <ChevronRight size={16} className="coop-caret" />
                  </button>
                ))}
              </div>
            </section>
            <section className="ecard">
              <header className="ecard-head">
                <div className="ecard-icon"><Handshake size={28} color="#1d4ed8" /></div>
                <div className="ecard-titles"><h2>Knowledge exchanges</h2><p>Who has made the most progress, and who could learn from them</p></div>
              </header>
              <div className="coop-grid" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                {d.cooperation.exchanges.map((c) => (
                  <button key={c.theme} className="coop" onClick={() => setTheme(c.theme)}>
                    <span className="coop-icon" style={{ background: `${c.color}18` }}><ThemeIcon icon={c.icon} color={c.color} size={20} /></span>
                    <span className="coop-body">
                      <strong>{c.label}</strong>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 12.5 }}>
                        {c.mentors.map((x) => <span key={x} className="nowrap"><Flag iso3={x} size={16} /> {COUNTRY_NAMES[x]}</span>)}
                        <span className="muted">shares with</span>
                        {c.learners.map((x) => <span key={x} className="nowrap"><Flag iso3={x} size={16} /> {COUNTRY_NAMES[x]}</span>)}
                      </span>
                      <small>{c.detail}</small>
                    </span>
                    <ChevronRight size={16} className="coop-caret" />
                  </button>
                ))}
              </div>
            </section>
          </div>
          <ThemeModal themeId={theme} onClose={() => setTheme(null)} />
        </div>
      )}
    </Async>
  );
}
