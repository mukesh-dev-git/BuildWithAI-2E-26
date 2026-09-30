// Builds the hex-bin grid for the executive hotspot map: pointy-top hexagons in
// plain lon/lat space, each assigned to the BRICS region (ADM1) containing its centre,
// or flagged as other land from the Natural Earth outline.
import fs from 'node:fs';
import path from 'node:path';

export const HEX = { r: 1.35, lonMin: -84, lonMax: 152, latMin: -40, latMax: 76 };

function ringContains(ring, x, y) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonsOf(geometry) {
  if (!geometry) return [];
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
}

function indexShapes(features, keyFn) {
  const shapes = [];
  for (const f of features) {
    for (const poly of polygonsOf(f.geometry)) {
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      shapes.push({ key: keyFn(f), poly, bbox: [x0, y0, x1, y1] });
    }
  }
  return shapes;
}

function hit(shapes, x, y) {
  for (const s of shapes) {
    const [x0, y0, x1, y1] = s.bbox;
    if (x < x0 || x > x1 || y < y0 || y > y1) continue;
    if (ringContains(s.poly[0], x, y) && !s.poly.slice(1).some((h) => ringContains(h, x, y))) return s.key;
  }
  return null;
}

export function buildHexGrid() {
  const regions = JSON.parse(fs.readFileSync(path.resolve('data/processed/regions.geojson'), 'utf8')).features;
  const landPath = path.resolve('data/raw/ne_110m_land.geojson');
  const land = fs.existsSync(landPath) ? JSON.parse(fs.readFileSync(landPath, 'utf8')).features : [];
  const regionShapes = indexShapes(regions, (f) => f.properties);
  const landShapes = indexShapes(land, () => true);

  const { r, lonMin, lonMax, latMin, latMax } = HEX;
  const dx = Math.sqrt(3) * r;
  const dy = 1.5 * r;
  const cells = [];
  let row = 0;
  for (let lat = latMax; lat >= latMin; lat -= dy, row++) {
    const offset = row % 2 ? dx / 2 : 0;
    for (let lon = lonMin + offset; lon <= lonMax; lon += dx) {
      const reg = hit(regionShapes, lon, lat);
      if (reg) cells.push({ x: +lon.toFixed(3), y: +lat.toFixed(3), regionId: reg.id, iso3: reg.iso3, name: reg.name });
      else if (hit(landShapes, lon, lat)) cells.push({ x: +lon.toFixed(3), y: +lat.toFixed(3), regionId: null, iso3: null });
    }
  }

  // Small members (e.g. the UAE) can fall between hex centres; give each at least one cell
  const present = new Set(cells.filter((c) => c.iso3).map((c) => c.iso3));
  for (const f of regions) {
    const { iso3 } = f.properties;
    if (present.has(iso3)) continue;
    const pts = polygonsOf(f.geometry).flatMap((p) => p[0]);
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    let best = null;
    for (const c of cells) {
      const d = (c.x - cx) ** 2 + (c.y - cy) ** 2;
      if (!best || d < best.d) best = { c, d };
    }
    if (best) Object.assign(best.c, { regionId: f.properties.id, iso3, name: f.properties.name });
    present.add(iso3);
  }
  return { r, bounds: { lonMin, lonMax, latMin, latMax }, cells };
}
