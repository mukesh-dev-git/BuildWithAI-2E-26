import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, GeoJSON, CircleMarker, Tooltip as LTooltip, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApi } from '../api';
import { useDashboard } from '../DashboardContext';
import { useTheme } from '../../context/ThemeContext';
import { CountryName, ErrorNote, Loading, Note, Panel, SectorTag } from '../components/ui';
import { fmtCompact, fmtInt, fmtPct } from '../format';

const DEMAND_SCALE = ['#bcd4f0', '#98bde6', '#72a3da', '#4d88cb', '#2f6db6', '#1d5296', '#113a6e'];
const NEED_SCALE = ['#fde2b8', '#fbc987', '#f8ab58', '#f28c33', '#e0691b', '#bd4f0e', '#8a3806'];

// Chukotka crosses the antimeridian, so computed bounds for Russia (and "all") span the globe; use fixed views.
const FIXED_VIEWS = {
  ALL: [[-38, -75], [72, 145]],
  RUS: [[41, 27], [78, 180]],
};
const NO_DATA = '#6b7686';

function quantileBreaks(values, n) {
  const v = values.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b);
  if (!v.length) return [];
  return Array.from({ length: n - 1 }, (_, i) => v[Math.floor(((i + 1) / n) * (v.length - 1))]);
}
const colorFor = (value, breaks, scale) => {
  if (value === null || value === undefined) return null;
  const i = breaks.findIndex((b) => value <= b);
  return scale[i === -1 ? scale.length - 1 : i];
};

function FitTo({ features, country }) {
  const map = useMap();
  // The container is sized by CSS grid after Leaflet initialises; re-measure so the SVG renderer isn't clipped
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  useEffect(() => {
    if (!features.length) return undefined;
    // Wait a frame so the grid has sized the container before fitting
    const t = setTimeout(() => {
      map.invalidateSize();
      const b = FIXED_VIEWS[country] ? L.latLngBounds(FIXED_VIEWS[country]) : L.geoJSON({ type: 'FeatureCollection', features }).getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [16, 16], maxZoom: 6 });
    }, 50);
    return () => clearTimeout(t);
  }, [features, country, map]);
  return null;
}

export default function DemandMap() {
  const { params, country, sector, meta } = useDashboard();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [metric, setMetric] = useState('demand');
  const [showHotspots, setShowHotspots] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const geo = useApi('/geo');
  const map = useApi('/map', { sector: params.sector, months: params.months });
  const hotspots = useApi('/hotspots', { country: 'BRA', sector: params.sector, limit: 150 });

  const regionData = useMemo(() => Object.fromEntries((map.data?.regions || []).map((r) => [r.id, r])), [map.data]);

  const features = useMemo(() => {
    if (!geo.data) return [];
    return geo.data.features.filter((f) => country === 'ALL' || f.properties.iso3 === country);
  }, [geo.data, country]);

  // Need layer: national infrastructure gap for the selected sector (or mean gap across sectors)
  const needFor = (iso3) => {
    const g = map.data?.countryNeed[iso3]?.gaps || {};
    if (sector !== 'all') return g[sector] ?? null;
    const vals = Object.values(g);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const { breaks, scale } = useMemo(() => {
    if (!map.data) return { breaks: [], scale: DEMAND_SCALE };
    if (metric === 'demand') {
      return { breaks: quantileBreaks(map.data.regions.map((r) => r.per100k), 7), scale: DEMAND_SCALE };
    }
    const vals = Object.keys(map.data.countryNeed).map(needFor);
    return { breaks: quantileBreaks(vals, 7), scale: NEED_SCALE };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.data, metric, sector]);

  const valueOf = (props) => (metric === 'demand' ? regionData[props.id]?.per100k ?? null : needFor(props.iso3));

  const style = (f) => {
    const fill = colorFor(valueOf(f.properties), breaks, scale);
    const sel = f.properties.id === selectedId;
    return {
      fillColor: fill || NO_DATA, fillOpacity: fill ? 0.85 : 0.5,
      color: sel ? '#111827' : theme === 'dark' ? '#0b1220' : '#ffffff', weight: sel ? 2.2 : 0.6,
    };
  };

  const onEach = (f, layer) => {
    const r = regionData[f.properties.id];
    const need = needFor(f.properties.iso3);
    const line = metric === 'demand'
      ? r?.requests ? `${fmtInt(r.requests)} requests · ${r.per100k ?? '—'} per 100k` : 'No open citizen-feedback data'
      : need !== null ? `National gap ${need.toFixed(1)} pts` : 'No indicator';
    layer.bindTooltip(`<strong>${f.properties.name}</strong><br/>${line}`, { sticky: true, className: 'map-tip' });
    layer.on('click', () => setSelectedId(f.properties.id));
  };

  const selected = selectedId ? { ...regionData[selectedId], feature: features.find((f) => f.properties.id === selectedId) } : null;
  const maxHot = Math.max(1, ...(hotspots.data?.hotspots || []).map((h) => h.n));
  const ranked = (map.data?.regions || []).filter((r) => r.per100k !== null && (country === 'ALL' || r.iso3 === country))
    .sort((a, b) => b.per100k - a.per100k).slice(0, 10);


  const layerKey = `${metric}-${params.sector}-${params.months}-${country}-${selectedId}-${theme}-${!!map.data}`;

  return (
    <div className="grid grid-2">
      <Panel
        title={metric === 'demand' ? 'Citizen demand per 100k residents' : 'Infrastructure need (national gap)'}
        subtitle={metric === 'demand'
          ? 'State/province choropleth from real citizen requests · dots = city hotspots'
          : sector === 'all' ? 'Average gap across sectors (World Bank indicators)' : `Gap for ${meta?.sectors[sector]?.label} (World Bank indicators)`}
        actions={(
          <>
            <div className="seg">
              <button className={metric === 'demand' ? 'on' : ''} onClick={() => setMetric('demand')}>Citizen demand</button>
              <button className={metric === 'need' ? 'on' : ''} onClick={() => setMetric('need')}>Infrastructure need</button>
            </div>
            {metric === 'demand' && (
              <label className="nowrap" style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} /> City hotspots
              </label>
            )}
          </>
        )}
        flush
      >
        {geo.error || map.error ? <ErrorNote error={geo.error || map.error} /> : !geo.data || !map.data ? <Loading label="Loading boundaries…" /> : (
          <div className={`map-shell ${theme === 'dark' ? 'map-dark' : ''}`}>
            <MapContainer center={[20, 60]} zoom={2} minZoom={2} worldCopyJump scrollWheelZoom>
              <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.55}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Boundaries: geoBoundaries' />
              <GeoJSON key={layerKey} data={{ type: 'FeatureCollection', features }} style={style} onEachFeature={onEach} />
              {metric === 'demand' && showHotspots && (country === 'ALL' || country === 'BRA') && hotspots.data?.hotspots.map((h) => (
                <CircleMarker key={h.id} center={[h.lat, h.lng]} radius={2 + 10 * Math.sqrt(h.n / maxHot)}
                  pathOptions={{ color: '#b91c1c', weight: 1, fillColor: '#ef4444', fillOpacity: 0.45 }}>
                  <LTooltip className="map-tip">{h.name}, {h.region}<br />{fmtInt(h.n)} requests in {hotspots.data.year}</LTooltip>
                </CircleMarker>
              ))}
              <FitTo features={features} country={country} />
            </MapContainer>
            <div className="map-legend">
              <strong>{metric === 'demand' ? 'Requests per 100k' : 'Gap (pts below full coverage)'}</strong>
              <div className="map-legend-scale">{scale.map((c) => <span key={c} style={{ background: c }} />)}</div>
              <div className="map-legend-ends"><span>{breaks[0]?.toFixed?.(0) ?? '—'}</span><span>{breaks.at(-1)?.toFixed?.(0) ?? '—'}+</span></div>
              {metric === 'demand' && <div className="muted" style={{ marginTop: 6 }}><span style={{ display: 'inline-block', width: 10, height: 10, background: NO_DATA, borderRadius: 2, marginRight: 6 }} />No open citizen data</div>}
            </div>
          </div>
        )}
      </Panel>

      <div className="map-side">
        <Panel title={selected?.feature ? selected.feature.properties.name : 'Select a region'}
          subtitle={selected?.feature ? <CountryName iso3={selected.feature.properties.iso3} /> : 'Click any state or province on the map'}>
          {selected?.feature ? (
            <RegionCard r={selected} need={needFor(selected.feature.properties.iso3)} sector={sector}
              onOpen={(id) => navigate(`/recommendations?focus=${encodeURIComponent(id)}`)} />
          ) : (
            <Note>Brazil’s 27 states are shaded from 6.6M real ombudsman requests (Fala.BR). Other members show grey in demand mode because they publish no open citizen-feedback data — switch to <strong>Infrastructure need</strong> to compare all 10.</Note>
          )}
        </Panel>
        {metric === 'demand' && (
          <Panel title="Highest demand intensity" subtitle="Requests per 100k residents" flush>
            <table className="dtable">
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.id} className={`clickable ${r.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(r.id)}>
                    <td className="muted num" style={{ width: 28 }}>{i + 1}</td>
                    <td>{r.name}</td>
                    <td className="r">{r.per100k}</td>
                  </tr>
                ))}
                {!ranked.length && <tr><td className="muted">No citizen-demand data for this selection.</td></tr>}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </div>
  );
}

function RegionCard({ r, need, sector, onOpen }) {
  return (
    <>
      <div className="detail-grid">
        <div className="stat"><div className="stat-label">Requests</div><div className="stat-value">{fmtCompact(r.requests)}</div></div>
        <div className="stat"><div className="stat-label">Per 100k</div><div className="stat-value">{r.per100k ?? '—'}</div></div>
        <div className="stat"><div className="stat-label">Resolved</div><div className="stat-value">{fmtPct(r.resolvedPct)}</div></div>
        <div className="stat"><div className="stat-label">Population</div><div className="stat-value">{fmtCompact(r.population)}</div></div>
      </div>
      {need !== null && <p className="muted" style={{ marginTop: 10, fontSize: 12.5 }}>National {sector === 'all' ? 'average' : ''} infrastructure gap: <strong>{need.toFixed(1)} pts</strong></p>}
      {r.topPriority && (
        <>
          <div className="section-label">Top priority here</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <SectorTag sector={r.topPriority.sector} />
            <button className="btn btn-primary" onClick={() => onOpen(`${r.id}:${r.topPriority.sector}`)}>Evidence · score {r.topPriority.score}</button>
          </div>
        </>
      )}
    </>
  );
}
