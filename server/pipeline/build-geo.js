// Merges the per-country geoBoundaries ADM1 files into one simplified GeoJSON
// used by the map (data/processed/regions.geojson) plus a region index.
import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { BRICS } from './countries.js';

const RAW = path.resolve('data/raw/boundaries');
const OUT = path.resolve('data/processed');
fs.mkdirSync(OUT, { recursive: true });

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Spelling fixes for names as published in the geoBoundaries source files.
const NAME_FIXES = { 'Rio Granda do Norte': 'Rio Grande do Norte', 'Rio de Jeneiro': 'Rio de Janeiro' };
const ISO_FIXES = { 'IRN-tehran': 'IR-07' };

const features = [];
for (const c of BRICS) {
  const gj = JSON.parse(fs.readFileSync(path.join(RAW, `${c.iso3}.geojson`), 'utf8'));
  for (const f of gj.features) {
    const name = NAME_FIXES[f.properties.shapeName] || f.properties.shapeName;
    const id = `${c.iso3}-${slug(name)}`;
    features.push({
      type: 'Feature',
      properties: {
        id,
        name,
        iso3: c.iso3,
        // geoBoundaries ISO codes are inconsistent (e.g. ZAF "EC", CHN "CHN"); keep only real ISO 3166-2 codes
        isoCode: ISO_FIXES[id] || (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(f.properties.shapeISO) ? f.properties.shapeISO : null),
      },
      geometry: f.geometry,
    });
  }
}

const input = { 'in.json': { type: 'FeatureCollection', features } };
const out = await mapshaper.applyCommands(
  '-i in.json -dissolve id copy-fields=name,iso3,isoCode -simplify 4% weighted keep-shapes -clean -o regions.geojson precision=0.001',
  input,
);
fs.writeFileSync(path.join(OUT, 'regions.geojson'), out['regions.geojson']);

// Some sources split one region into several features (e.g. Mazandaran); keep one index row per id.
const index = [...new Map(features.map((f) => [f.properties.id, f.properties])).values()];
fs.writeFileSync(path.join(OUT, 'regions.json'), JSON.stringify(index, null, 1));
const kb = (fs.statSync(path.join(OUT, 'regions.geojson')).size / 1024).toFixed(0);
console.log(`${index.length} regions -> regions.geojson (${kb} KB)`);
