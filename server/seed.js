// VikasDrishti AI — SQLite Database Seeder
// Ingests structured district demographics and citizen grievances into SQLite

import { db, initializeSchema } from './db.js';
import districtData from '../src/data/districts.js';
import seedGrievances from '../src/data/seed-grievances.js';

export function seedDatabase() {
  console.log('🌱 Starting SQLite Database Seed...');
  initializeSchema();

  // Begin transaction
  db.exec('BEGIN TRANSACTION;');

  try {
    // Clear existing data
    db.exec('DELETE FROM grievances;');
    db.exec('DELETE FROM districts;');
    db.exec('DELETE FROM audit_logs;');

    // ── Insert Districts ───────────────────────────────────
    const insertDistrictStmt = db.prepare(`
      INSERT OR REPLACE INTO districts (
        id, name, state, lat, lng, population, bpl_ratio,
        literacy_rate, infra_index, water_coverage, road_density,
        health_facilities, budget_allocated, budget_utilized
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    const existingDistrictIds = new Set();
    let districtCount = 0;

    for (const d of districtData) {
      const id = d.district.toLowerCase().replace(/\s+/g, '-');
      insertDistrictStmt.run(
        id,
        d.district,
        d.state,
        d.lat,
        d.lng,
        d.population,
        d.bplRatio,
        d.literacyRate,
        d.infraIndex,
        d.waterCoverage || 50,
        d.roadDensity || 50,
        d.healthFacilities || 50,
        d.budgetAllocated,
        d.budgetUtilized
      );
      existingDistrictIds.add(id);
      districtCount++;
    }

    // Auto-create any additional districts referenced in grievances
    for (const g of seedGrievances) {
      if (g.district) {
        const id = g.district.toLowerCase().replace(/\s+/g, '-');
        if (!existingDistrictIds.has(id)) {
          insertDistrictStmt.run(
            id,
            g.district,
            g.state || 'India',
            g.lat || 20.5937,
            g.lng || 78.9629,
            1850000,
            0.38,
            0.62,
            42,
            48,
            44,
            46,
            920,
            380
          );
          existingDistrictIds.add(id);
          districtCount++;
        }
      }
    }

    // ── Insert Grievances ──────────────────────────────────
    const insertGrievanceStmt = db.prepare(`
      INSERT OR REPLACE INTO grievances (
        id, category, raw_text, summary_en, severity,
        status, language, district_id, lat, lng, citizen_name,
        votes, image_description, ai_reasoning, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `);

    let grievanceCount = 0;
    for (const g of seedGrievances) {
      const districtId = g.district ? g.district.toLowerCase().replace(/\s+/g, '-') : 'barmer';
      insertGrievanceStmt.run(
        g.id || `GRV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        g.category || 'Roads & Transport',
        g.text || '',
        g.textEn || g.text || '',
        g.severity || 'medium',
        g.status || 'pending',
        g.language || 'hi',
        districtId,
        g.lat || 28.6139,
        g.lng || 77.2090,
        g.citizenName || 'Verified Citizen',
        g.votes || 1,
        g.imageDescription || '',
        g.aiReasoning || 'Identified via multilingual intent recognition',
        g.timestamp || new Date().toISOString()
      );
      grievanceCount++;
    }

    // ── Insert Audit Log ───────────────────────────────────
    const insertLogStmt = db.prepare(`
      INSERT INTO audit_logs (action, details) VALUES (?, ?);
    `);
    insertLogStmt.run(
      'DATABASE_INITIAL_SEED',
      `Seeded ${districtCount} aspirational districts and ${grievanceCount} citizen grievances into SQLite database.`
    );

    db.exec('COMMIT;');
    console.log(`✅ SQLite Database Seed Succeeded! Ingested ${districtCount} districts and ${grievanceCount} grievances.`);
    return { districts: districtCount, grievances: grievanceCount };
  } catch (error) {
    db.exec('ROLLBACK;');
    console.error('❌ Database seed error:', error);
    throw error;
  }
}

// Run directly if invoked from CLI
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}
