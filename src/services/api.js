// VikasDrishti AI — API Client Service
// Handles all communication with the Express + SQLite backend

const API_BASE = '/api';

/**
 * Check if the SQLite database server is reachable
 */
export async function checkDbHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    console.warn('Backend API server not reachable, using fallback mode:', err.message);
    return null;
  }
}

/**
 * Fetch all districts with live aggregated grievance counts
 */
export async function fetchDistrictsFromDb(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const url = `${API_BASE}/districts${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch districts from DB, falling back to local dataset:', err);
    return null;
  }
}

/**
 * Fetch a single district by ID or name
 */
export async function fetchDistrictByIdFromDb(id) {
  try {
    const res = await fetch(`${API_BASE}/districts/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch district ${id} from DB:`, err);
    return null;
  }
}

/**
 * Fetch grievances with optional category, severity, and district filters
 */
export async function fetchGrievancesFromDb(filters = {}) {
  try {
    const query = new URLSearchParams(filters).toString();
    const url = `${API_BASE}/grievances${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch grievances from DB:', err);
    return null;
  }
}

/**
 * Submit a new citizen grievance to the SQLite database
 */
export async function submitGrievanceToDb(grievance) {
  try {
    const res = await fetch(`${API_BASE}/grievances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grievance),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to submit grievance to DB:', err);
    return null;
  }
}

/**
 * Upvote a citizen grievance in the SQLite database
 */
export async function upvoteGrievanceInDb(id) {
  try {
    const res = await fetch(`${API_BASE}/grievances/${encodeURIComponent(id)}/upvote`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to upvote grievance ${id} in DB:`, err);
    return null;
  }
}

/**
 * Fetch live calculated Explainable Priority Index (EPI) rankings from SQLite
 */
export async function fetchEpiRankingsFromDb() {
  try {
    const res = await fetch(`${API_BASE}/epi`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch EPI rankings from DB:', err);
    return null;
  }
}

/**
 * Re-seed the SQLite database on demand
 */
export async function reseedDatabase() {
  try {
    const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to reseed database:', err);
    return null;
  }
}
