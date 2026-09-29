// VikasDrishti AI — Centralized Grievance Store
// Supports SQLite Database REST sync, localStorage persistence, subscriber events, and Firebase Cloud Firestore sync

import seedGrievances from '../data/seed-grievances';
import { saveGrievanceToFirebase, subscribeToFirebaseGrievances, isFirebaseConfigured } from './firebase';
import { fetchGrievancesFromDb, submitGrievanceToDb, upvoteGrievanceInDb } from './api';

const STORAGE_KEY = 'vikasdrishti_grievances';

function loadInitialGrievances() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load grievances from localStorage:', err);
  }
  return [...seedGrievances];
}

let grievances = loadInitialGrievances();
const listeners = new Set();

function persistAndNotify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grievances));
  } catch (err) {
    console.warn('Failed to persist grievances:', err);
  }
  listeners.forEach(fn => fn(grievances));
}

// ── Hydrate from SQLite Backend Database on Startup ───
fetchGrievancesFromDb({ limit: 100 }).then(dbItems => {
  if (dbItems && Array.isArray(dbItems) && dbItems.length > 0) {
    console.log(`📦 Hydrated ${dbItems.length} grievances from SQLite Database`);
    grievances = dbItems;
    persistAndNotify();
  }
}).catch(err => {
  console.warn('Backend DB not reachable, using local storage:', err.message);
});

// ── Subscribe to Firebase Firestore if credentials are provided ───
if (isFirebaseConfigured()) {
  subscribeToFirebaseGrievances((firebaseItems) => {
    if (firebaseItems && firebaseItems.length > 0) {
      const existingIds = new Set(grievances.map(g => g.id));
      const newItems = firebaseItems.filter(item => !existingIds.has(item.id));
      if (newItems.length > 0) {
        grievances = [...newItems, ...grievances];
        persistAndNotify();
      }
    }
  });
}

export function getAllGrievances() {
  return [...grievances];
}

export function addGrievance(newGrievance) {
  grievances = [newGrievance, ...grievances];
  persistAndNotify();

  // Write to SQLite Database via REST API
  submitGrievanceToDb(newGrievance).then(saved => {
    if (saved) console.log('✅ Grievance persisted to SQLite Database:', saved.id);
  }).catch(err => {
    console.warn('Notice: SQLite DB write failed, kept in local state:', err);
  });

  // Sync to Firebase in background if configured
  if (isFirebaseConfigured()) {
    saveGrievanceToFirebase(newGrievance).catch(err => console.warn('Firebase sync notice:', err));
  }

  return newGrievance;
}

export function upvoteGrievance(id) {
  grievances = grievances.map(g => {
    if (g.id === id) {
      return { ...g, votes: (g.votes || 0) + 1 };
    }
    return g;
  });
  persistAndNotify();

  // Update in SQLite Database
  upvoteGrievanceInDb(id).catch(err => console.warn('DB upvote sync notice:', err));
}

export function subscribeToGrievances(callback) {
  listeners.add(callback);
  callback([...grievances]);
  return () => {
    listeners.delete(callback);
  };
}

export function resetGrievancesToDefault() {
  grievances = [...seedGrievances];
  persistAndNotify();
}
