// Downloads the open reference datasets into data/raw.
//   - World Bank WDI indicators (2000–latest) for all BRICS members
//   - geoBoundaries ADM1 (state/province) boundaries, simplified geometry
import fs from 'node:fs';
import path from 'node:path';
import { BRICS, INDICATORS, DHS_SURVEYS, DHS_INDICATORS } from './countries.js';

const RAW = path.resolve('data/raw');
fs.mkdirSync(path.join(RAW, 'boundaries'), { recursive: true });

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchWorldBank() {
  const codes = BRICS.map((c) => c.iso3).join(';');
  const out = {};
  for (const id of Object.keys(INDICATORS)) {
    const url = `https://api.worldbank.org/v2/country/${codes}/indicator/${id}?format=json&date=2000:2025&per_page=2000`;
    const [, rows] = await getJson(url);
    out[id] = (rows || [])
      .filter((r) => r.value !== null)
      .map((r) => ({ iso3: r.countryiso3code, year: Number(r.date), value: r.value }));
    console.log(`WDI ${id}: ${out[id].length} observations`);
  }
  fs.writeFileSync(path.join(RAW, 'worldbank.json'), JSON.stringify(out));
}

async function fetchBoundaries() {
  for (const c of BRICS) {
    const meta = await getJson(`https://www.geoboundaries.org/api/current/gbOpen/${c.iso3}/ADM1/`);
    const res = await fetch(meta.simplifiedGeometryGeoJSON);
    if (!res.ok) throw new Error(`boundary ${c.iso3}: ${res.status}`);
    fs.writeFileSync(path.join(RAW, 'boundaries', `${c.iso3}.geojson`), Buffer.from(await res.arrayBuffer()));
    console.log(`Boundaries ${c.iso3}: ${meta.admUnitCount} units (${meta.boundaryYearRepresented})`);
  }
}

// Brazil: IBGE state population estimates + municipality coordinates (for Fala.BR hotspots)
async function fetchBrazilReference() {
  const [pop] = await getJson(
    'https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N3[all]',
  );
  const states = pop.resultados[0].series.map((s) => ({
    ibge: s.localidade.id,
    name: s.localidade.nome,
    year: Number(Object.keys(s.serie)[0]),
    population: Number(Object.values(s.serie)[0]),
  }));
  fs.writeFileSync(path.join(RAW, 'ibge_state_population.json'), JSON.stringify(states));
  console.log(`IBGE population: ${states.length} states (${states[0].year})`);

  const base = 'https://raw.githubusercontent.com/kelvins/municipios-brasileiros/main/csv';
  for (const f of ['municipios.csv', 'estados.csv']) {
    const res = await fetch(`${base}/${f}`);
    if (!res.ok) throw new Error(`${f}: ${res.status}`);
    fs.writeFileSync(path.join(RAW, f), await res.text());
  }
  console.log('Municipality coordinates downloaded');
}

// Natural Earth 1:110m land, used only as the grey backdrop of the hex map
async function fetchLand() {
  const res = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson');
  if (!res.ok) throw new Error(`land: ${res.status}`);
  fs.writeFileSync(path.join(RAW, 'ne_110m_land.geojson'), await res.text());
  console.log('Natural Earth land outline downloaded');
}

// DHS Program (USAID) sub-national survey estimates: open API, no key required.
// One preferred survey per member whose regions match the geoBoundaries ADM1 set.
async function fetchDhs() {
  const url = `https://api.dhsprogram.com/rest/dhs/data?surveyIds=${Object.values(DHS_SURVEYS).join(',')}` +
    `&indicatorIds=${Object.keys(DHS_INDICATORS).join(',')}&breakdown=subnational&f=json&perpage=5000` +
    '&returnFields=SurveyId,SurveyYear,SurveyYearLabel,IndicatorId,CharacteristicLabel,Value,LevelRank,IsPreferred';
  const { Data } = await getJson(url);
  const rows = Data.filter((d) => d.LevelRank === 1 || (d.SurveyId === 'EG2014DHS' && d.LevelRank === null));
  fs.writeFileSync(path.join(RAW, 'dhs_subnational.json'), JSON.stringify(Data));
  console.log(`DHS: ${Data.length} sub-national estimates (${rows.length} at first admin level)`);
}

const only = process.argv[2];
if (!only || only === 'worldbank') await fetchWorldBank();
if (!only || only === 'boundaries') await fetchBoundaries();
if (!only || only === 'brazil') await fetchBrazilReference();
if (!only || only === 'land') await fetchLand();
if (!only || only === 'dhs') await fetchDhs();
