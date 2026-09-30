import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, Info, Landmark } from 'lucide-react';
import { apiPost, useApi } from '../api';
import Flag, { COUNTRY_NAMES } from '../components/Flag';
import RegionHexMap, { TIERS, tierOf } from '../components/RegionHexMap';
import ThemeIcon from '../components/ThemeIcon';
import { ErrorNote, Loading, Note } from '../components/ui';
import { fmtInt, fmtUsd } from '../format';
import './executive.css';
import './map.css';

const BASIS_TEXT = {
  'citizen-demand': 'Scored from citizen requests (Fala.BR) through the priority engine.',
  'regional-survey': 'Scored from household survey estimates for each state or province (DHS Program).',
  'national-indicator': 'No open regional data for this member, so every region carries the national World Bank estimate.',
};

export default function RegionNeedMap() {
  const { iso3, theme } = useParams();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState(null);
  const [hideDone, setHideDone] = useState(false);

  const hex = useApi('/hotspots/hexmap', { country: iso3, theme });
  const list = useApi('/hotspots/list', { country: iso3, theme, size: 100, national: 1, t: tick });
  const themes = list.data?.themes || [];
  const t = themes.find((x) => x.id === theme);
  const items = list.data?.items || [];
  const shown = hideDone ? items.filter((x) => !x.addressed) : items;
  const basis = items[0]?.basis;

  const counts = useMemo(() => Object.fromEntries(TIERS.map((tr) => [tr.id, items.filter((x) => tierOf(x.score)?.id === tr.id).length])), [items]);
  const done = items.filter((x) => x.addressed).length;

  const toggle = async (x) => {
    await apiPost('/hotspots/action', { key: x.key, done: !x.addressed });
    setTick((k) => k + 1);
  };

  return (
    <div className="exec dmap">
      <div className="rn-head">
        <Link to="/map" className="outline-btn sm"><ArrowLeft size={15} /> Demand map</Link>
        <Flag iso3={iso3} size={34} />
        <div className="rn-titles">
          <h2>{t ? `${t.label} across ${COUNTRY_NAMES[iso3]}` : COUNTRY_NAMES[iso3]}</h2>
          <p>{basis ? BASIS_TEXT[basis] : ' '}</p>
        </div>
        <label className="theme-pick big">
          {t && <ThemeIcon icon={t.icon} color={t.color} size={16} />}
          <select value={theme} onChange={(e) => navigate(`/map/${iso3}/${e.target.value}`)} aria-label="Need">
            {themes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </label>
      </div>

      <div className="rn-kpis">
        {TIERS.map((tr) => (
          <div key={tr.id} className="rn-kpi" style={{ '--c': tr.color }}>
            <i />
            <div><b>{counts[tr.id] ?? 0}</b><span>{tr.label} regions</span></div>
          </div>
        ))}
        <div className="rn-kpi done-kpi">
          <CircleCheck size={20} color="#16a34a" />
          <div><b>{done} / {items.length}</b><span>Marked addressed</span></div>
        </div>
      </div>

      <div className="rn-main">
        <section className="ecard map-card">
          {hex.error ? <ErrorNote error={hex.error} /> : !hex.data ? <Loading label="Drawing regions…" /> : (
            <RegionHexMap data={hex.data} height={520} labels="regions" selectedRegion={selected}
              onSelect={(regionId) => setSelected(regionId)} legendTitle={`${t?.label || ''} need by region`} />
          )}
        </section>

        <section className="ecard rn-list">
          <header className="rn-list-head">
            <h2>Regions ranked by need</h2>
            <label className="ht-national"><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide addressed</label>
          </header>
          {list.error ? <ErrorNote error={list.error} /> : !list.data ? <Loading /> : (
            <ol className="rn-rows">
              {shown.map((x, i) => (
                <li key={x.key} className={`${selected === x.regionId ? 'on' : ''} ${x.addressed ? 'done' : ''}`} onMouseEnter={() => setSelected(x.regionId)}>
                  <input type="checkbox" className="tick" checked={x.addressed} onChange={() => toggle(x)} aria-label={`Mark ${x.region} as addressed`} />
                  <span className="rn-n">{i + 1}</span>
                  <div className="rn-body">
                    <strong>{x.region}</strong>
                    <small>{x.detail}</small>
                  </div>
                  <span className="tier-pill" style={{ '--tier': tierOf(x.score)?.color }}>{x.score}</span>
                </li>
              ))}
              {!shown.length && <li className="muted">{items.length ? 'Every region here is marked addressed.' : 'No data for this need in this member.'}</li>}
            </ol>
          )}
        </section>
      </div>

      {items[0] && (
        <div className="exec-row" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><Landmark size={24} color="#1d4ed8" /></div>
              <div className="ecard-titles"><h2>National response</h2><p>Flagship programme and infrastructure investment</p></div>
            </header>
            <p style={{ fontSize: 14 }}>{items[0].programme || `No flagship programme is recorded for ${COUNTRY_NAMES[iso3]} on this need.`}</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Private-participation infrastructure investment in this sector, last 10 years: <strong>{items[0].nationalInvestment ? fmtUsd(items[0].nationalInvestment) : 'not reported'}</strong>
            </p>
          </section>
          <section className="ecard">
            <header className="ecard-head">
              <div className="ecard-icon"><Info size={24} color="#1d4ed8" /></div>
              <div className="ecard-titles"><h2>About this data</h2><p>{items[0].source}</p></div>
            </header>
            <Note>Scores run from 0 (no gap) to 100 (severe). Critical ≥ 70, high ≥ 45, moderate ≥ 25. {basis === 'citizen-demand' ? `${fmtInt(items.reduce((s, x) => s + (x.requests12m || 0), 0))} citizen requests in the last 12 months feed this view.` : ''} Ticks are shared: everyone using this dashboard sees what has been marked addressed.</Note>
          </section>
        </div>
      )}
    </div>
  );
}
