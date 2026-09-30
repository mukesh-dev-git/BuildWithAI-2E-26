import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';

export const HEX_TIERS = [
  { id: 'critical', label: 'Critical', min: 70, color: '#e11d2e' },
  { id: 'high', label: 'High', min: 45, color: '#f97316' },
  { id: 'moderate', label: 'Moderate', min: 25, color: '#fbbf24' },
];
const tierColor = (score) => {
  if (score === null || score === undefined) return null;
  return HEX_TIERS.find((t) => score >= t.min)?.color || null;
};

/** Pointy-top hexagon path centred at (0,0) in lon/lat units */
function hexPath(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 90) * Math.PI) / 180;
    pts.push(`${(r * Math.cos(a)).toFixed(3)},${(r * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
}

export default function HexMap({ data, country = 'ALL', height = 300 }) {
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1.08);
  const [pan, setPan] = useState({ x: 1, y: -4 });
  const [hover, setHover] = useState(null);
  const drag = useRef(null);

  const { bounds, r } = data;
  const W = bounds.lonMax - bounds.lonMin + 4;
  const H = bounds.latMax - bounds.latMin + 4;
  const hex = useMemo(() => hexPath(r * 0.9), [r]);
  const vw = W / zoom;
  const vh = H / zoom;
  const cx = bounds.lonMin - 2 + W / 2 + pan.x;
  const cy = -(bounds.latMax + 2) + H / 2 + pan.y;
  const viewBox = `${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`;

  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, pan }; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current) return;
    const svg = e.currentTarget.getBoundingClientRect();
    const k = vw / svg.width;
    setPan({ x: drag.current.pan.x - (e.clientX - drag.current.x) * k, y: drag.current.pan.y - (e.clientY - drag.current.y) * k });
  };
  const onUp = () => { drag.current = null; };

  const open = (iso3, regionId) => {
    if (iso3 === 'BRA' && regionId) navigate('/map');
    else navigate('/countries');
  };

  return (
    <div className="hexmap" style={{ height }}>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" className="hexmap-svg"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(null); }}
        role="img" aria-label="Hex map of citizen demand and infrastructure need across BRICS members">
        {data.cells.map(([x, y, iso3, regionId, score], i) => {
          const fill = iso3 ? tierColor(score) || 'var(--hex-brics)' : 'var(--hex-land)';
          const dim = country !== 'ALL' && iso3 !== country;
          return (
            <path key={i} d={hex} transform={`translate(${x},${-y})`} fill={fill}
              opacity={dim ? (iso3 ? 0.25 : 0.6) : 1}
              className={iso3 ? 'hex-cell brics' : 'hex-cell'}
              onPointerEnter={iso3 ? () => setHover({ x, y, iso3, regionId, score }) : undefined}
              onClick={iso3 ? () => open(iso3, regionId) : undefined} />
          );
        })}
        {data.labels.map((l) => l.hotspot && l.hotspot.score >= 45 && (country === 'ALL' || country === l.iso3) && (
          <g key={`m-${l.iso3}`} transform={`translate(${l.hotspot.x},${-l.hotspot.y})`} className="hex-marker">
            <circle r={r * 1.5} fill="#fff" stroke={tierColor(l.hotspot.score)} strokeWidth={r * 0.55} />
            <circle r={r * 0.65} fill={tierColor(l.hotspot.score)} />
          </g>
        ))}
        {data.labels.map((l) => (country === 'ALL' || country === l.iso3) && (
          <g key={`l-${l.iso3}`} transform={`translate(${LABEL_NUDGE[l.iso3]?.[0] ?? l.x},${-(LABEL_NUDGE[l.iso3]?.[1] ?? l.y)})`} className="hex-label">
            <text textAnchor="middle" dominantBaseline="middle" fontSize={4.4 / Math.sqrt(zoom)}>{SHORT[l.iso3] || l.name}</text>
          </g>
        ))}
      </svg>

      {hover && (
        <div className="hexmap-tip">
          <strong>{data.regionNames[hover.regionId] || hover.iso3}</strong>
          <span>{data.labels.find((l) => l.iso3 === hover.iso3)?.name}</span>
          <span>{hover.score === null ? 'No score' : `${hover.iso3 === 'BRA' ? 'Regional demand priority' : 'National need'} ${hover.score}`}</span>
        </div>
      )}

      <div className="hexmap-legend">
        <strong>Hotspot intensity</strong>
        {HEX_TIERS.map((t) => <span key={t.id}><i style={{ background: t.color }} />{t.label}</span>)}
      </div>
      <div className="hexmap-zoom">
        <button onClick={() => setZoom((z) => Math.min(z * 1.5, 6))} aria-label="Zoom in"><Plus size={16} /></button>
        <button onClick={() => { const z = Math.max(zoom / 1.5, 1); setZoom(z); if (z === 1) setPan({ x: 0, y: 0 }); }} aria-label="Zoom out"><Minus size={16} /></button>
      </div>
    </div>
  );
}

const SHORT = { ARE: 'UAE' };
// Hand-placed label anchors [lon, lat] where the hex centroid would sit off-land or collide
const LABEL_NUDGE = { RUS: [95, 66], CHN: [103, 34], IND: [79, 21], IDN: [117, -1], BRA: [-52, -9], ZAF: [25, -30], ETH: [40, 8.5], EGY: [30, 26.5], IRN: [54, 32.5], ARE: [55, 22] };
