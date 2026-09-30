import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, Plus } from 'lucide-react';
import Flag from './Flag';

export const TIERS = [
  { id: 'critical', label: 'Critical', min: 70, color: '#e11d2e' },
  { id: 'high', label: 'High', min: 45, color: '#f97316' },
  { id: 'moderate', label: 'Moderate', min: 25, color: '#fbbf24' },
  { id: 'low', label: 'Low', min: 0, color: '#22c55e' },
];
export const tierOf = (score) => (score === null || score === undefined ? null : TIERS.find((t) => score >= t.min));

const BASIS_LABEL = { 'citizen-demand': 'Citizen demand', 'regional-survey': 'Regional survey', 'national-indicator': 'National estimate' };

function hexPath(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 90) * Math.PI) / 180;
    pts.push(`${(r * Math.cos(a)).toFixed(4)},${(r * Math.sin(a)).toFixed(4)}`);
  }
  return `M${pts.join('L')}Z`;
}

/**
 * Hex-bin map of BRICS regions.
 * data: /hotspots/hexmap response. Cells: [lon, lat, iso3, regionId, score, basis].
 */
export default function RegionHexMap({
  data, country = 'ALL', selectedRegion, onSelect, dots = [], height = 380, labels = 'countries',
  legendTitle = 'Priority intensity', expandable = true, footer,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(null);
  const [full, setFull] = useState(false);
  const drag = useRef(null);
  const moved = useRef(false);

  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [data]);
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e) => e.key === 'Escape' && setFull(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [full]);

  const { bounds, r } = data;
  const W = bounds.lonMax - bounds.lonMin + r * 2;
  const H = bounds.latMax - bounds.latMin + r * 2;
  const hex = useMemo(() => hexPath(r * 0.9), [r]);
  const vw = W / zoom;
  const vh = H / zoom;
  const cx = bounds.lonMin - r + W / 2 + pan.x;
  const cy = -(bounds.latMax + r) + H / 2 + pan.y;
  const unit = W / 100; // label sizing relative to the map width

  // Region label anchors for country drill-downs: mean of the region's cells
  const regionAnchors = useMemo(() => {
    if (labels !== 'regions') return [];
    const acc = {};
    for (const [x, y, , regionId, score] of data.cells) {
      if (!regionId) continue;
      const a = (acc[regionId] ??= { sx: 0, sy: 0, n: 0, score });
      a.sx += x; a.sy += y; a.n++;
    }
    return Object.entries(acc).filter(([, a]) => a.n >= 3).map(([id, a]) => ({ id, x: a.sx / a.n, y: a.sy / a.n, score: a.score }));
  }, [data, labels]);

  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, pan }; moved.current = false; };
  const onMove = (e) => {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = Math.max(vw / rect.width, vh / rect.height);
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    setPan({ x: drag.current.pan.x - dx * k, y: drag.current.pan.y - dy * k });
  };
  const onUp = () => { drag.current = null; };

  const hovered = hover && data.regionBest?.[hover.regionId];

  return (
    <div className={`rhex ${full ? 'rhex-full' : ''}`} style={full ? undefined : { height }}>
      <svg className="rhex-svg" viewBox={`${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(null); }}
        role="img" aria-label="Hexagon map of regional priorities">
        {data.cells.map(([x, y, iso3, regionId, score], i) => {
          const tier = tierOf(score);
          const dim = country !== 'ALL' && iso3 && iso3 !== country;
          const sel = selectedRegion && regionId === selectedRegion;
          return (
            <path key={i} d={hex} transform={`translate(${x},${-y})`}
              fill={iso3 ? tier?.color || 'var(--hex-nodata)' : 'var(--hex-land)'}
              opacity={dim ? 0.25 : 1}
              className={`${iso3 ? 'rhex-cell' : ''} ${sel ? 'sel' : ''}`}
              onPointerEnter={iso3 ? () => setHover({ regionId, iso3, score }) : undefined}
              onClick={iso3 && onSelect ? () => { if (!moved.current) onSelect(regionId, iso3); } : undefined} />
          );
        })}
        {dots.map((d) => (
          <circle key={d.id} cx={d.lng} cy={-d.lat} r={d.r} className="rhex-dot" />
        ))}
        {labels === 'countries' && data.labels.map((l) => {
          if (country !== 'ALL' && l.iso3 !== country) return null;
          const [lx, ly] = PILL_AT[l.iso3] || [l.x, l.y];
          const name = l.iso3 === 'ARE' ? 'UAE' : l.name;
          const s = unit / Math.sqrt(zoom);
          const w = s * (4.4 + name.length * 1.05);
          return (
            <g key={l.iso3} transform={`translate(${lx},${-ly})`} className="rhex-pill" pointerEvents="none">
              <rect x={-w / 2} y={-s * 1.6} width={w} height={s * 3.2} rx={s * 0.7} />
              <Flag iso3={l.iso3} x={-w / 2 + s * 0.8} y={-s * 0.8} width={s * 2.4} height={s * 1.6} />
              <text x={-w / 2 + s * 3.8} y={s * 0.1} fontSize={s * 1.55} dominantBaseline="middle">{name}</text>
            </g>
          );
        })}
        {labels === 'regions' && regionAnchors.map((a) => (
          <text key={a.id} x={a.x} y={-a.y} fontSize={unit * 1.7 / Math.sqrt(zoom)} className="rhex-rlabel" textAnchor="middle" dominantBaseline="middle" pointerEvents="none">
            {data.regionNames[a.id]}
          </text>
        ))}
      </svg>

      {hover && (
        <div className="rhex-tip">
          <strong>{data.regionNames[hover.regionId]}</strong>
          {hovered ? (
            <>
              <span>Score {hovered.score} · {tierOf(hovered.score)?.label}</span>
              <span className="muted">{BASIS_LABEL[hovered.basis]}</span>
            </>
          ) : <span className="muted">No data for this layer</span>}
        </div>
      )}

      <div className="rhex-legend">
        <strong>{legendTitle}</strong>
        <div>
          {TIERS.map((t) => <span key={t.id}><i style={{ background: t.color }} />{t.label}</span>)}
          <span><i style={{ background: 'var(--hex-nodata)' }} />No data</span>
        </div>
      </div>
      <div className="rhex-zoom">
        <button onClick={() => setZoom((z) => Math.min(z * 1.5, 8))} aria-label="Zoom in"><Plus size={16} /></button>
        <button onClick={() => { const z = Math.max(zoom / 1.5, 1); setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }); }} aria-label="Zoom out"><Minus size={16} /></button>
      </div>
      {expandable && (
        <button className="rhex-expand" onClick={() => setFull((f) => !f)} aria-label={full ? 'Exit full screen' : 'Expand map to full screen'} title={full ? 'Exit full screen (Esc)' : 'Expand map'}>
          {full ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      )}
      {footer && <div className="rhex-footer">{footer}</div>}
    </div>
  );
}

// Hand-placed pill positions [lon, lat] that keep labels on land and apart
const PILL_AT = {
  RUS: [96, 64], CHN: [104, 35], IND: [79, 22], IDN: [114, -1], BRA: [-52, -8], ZAF: [25, -29],
  ETH: [40, 9], EGY: [30, 27], IRN: [54, 33], ARE: [56, 21],
};
