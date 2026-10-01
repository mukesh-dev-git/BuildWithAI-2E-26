// Exports static JSON snapshots of the BRICS API for static CDN hosting (Firebase / GitHub Pages)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../public/data/static-api');

fs.mkdirSync(OUT_DIR, { recursive: true });

const ENDPOINTS = [
  { url: 'http://localhost:5000/api/v2/meta', file: 'meta.json' },
  { url: 'http://localhost:5000/api/v2/executive', file: 'executive.json' },
  { url: 'http://localhost:5000/api/v2/countries', file: 'countries.json' },
  { url: 'http://localhost:5000/api/v2/goals/overview', file: 'goals_overview.json' },
  { url: 'http://localhost:5000/api/v2/recs/overview', file: 'recs_overview.json' },
  { url: 'http://localhost:5000/api/v2/hotspots/topneeds', file: 'hotspots_topneeds.json' },
  { url: 'http://localhost:5000/api/v2/hotspots/hexmap', file: 'hotspots_hexmap.json' },
  { url: 'http://localhost:5000/api/v2/hexmap', file: 'hexmap.json' },
  { url: 'http://localhost:5000/api/v2/hotspots/list?size=100&national=1', file: 'hotspots_list.json' },
  { url: 'http://localhost:5000/api/v2/investment', file: 'investment.json' },
  { url: 'http://localhost:5000/api/v2/sources', file: 'sources.json' },
  { url: 'http://localhost:5000/api/v2/recommendations', file: 'recommendations.json' },
  { url: 'http://localhost:5000/api/v2/overview', file: 'overview.json' },
  { url: 'http://localhost:5000/api/v2/regions', file: 'regions.json' },
];

// Also export country goals
const THEMES = ['water', 'health', 'digital', 'transport', 'energy', 'education', 'jobs', 'air'];
const COUNTRIES = ['BRA', 'RUS', 'IND', 'CHN', 'ZAF', 'EGY', 'ETH', 'IRN', 'ARE', 'IDN'];

for (const g of THEMES) {
  ENDPOINTS.push({ url: `http://localhost:5000/api/v2/goals/overview?goal=${g}`, file: `goals_overview_${g}.json` });
}

for (const c of COUNTRIES) {
  ENDPOINTS.push({ url: `http://localhost:5000/api/v2/hotspots/hexmap?country=${c}`, file: `hotspots_hexmap_${c}.json` });
  for (const g of THEMES.slice(0, 3)) {
    ENDPOINTS.push({ url: `http://localhost:5000/api/v2/goals/country/${c}/${g}`, file: `goals_country_${c}_${g}.json` });
  }
}

async function run() {
  console.log(`Exporting ${ENDPOINTS.length} static API endpoints to ${OUT_DIR}...`);
  let count = 0;
  for (const { url, file } of ENDPOINTS) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Failed ${url}: HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(data, null, 2), 'utf8');
      count++;
    } catch (err) {
      console.warn(`Error fetching ${url}:`, err.message);
    }
  }
  console.log(` Successfully exported ${count} static API snapshots.`);
}

run();
