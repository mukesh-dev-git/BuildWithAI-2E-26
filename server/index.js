// VikasDrishti AI — Express REST API Server
// Connects frontend to local SQLite database with full CRUD and SQL queries

import express from 'express';
import cors from 'cors';
import { db, initializeSchema } from './db.js';
import { seedDatabase } from './seed.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure schema is ready on boot
initializeSchema();

// Auto-seed if empty
const countStmt = db.prepare('SELECT COUNT(*) as count FROM districts');
const { count } = countStmt.get();
if (count === 0) {
  console.log('Database empty on startup. Auto-seeding...');
  seedDatabase();
}

// ── GET /api/health ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const distCount = db.prepare('SELECT COUNT(*) as count FROM districts').get().count;
  const grvCount = db.prepare('SELECT COUNT(*) as count FROM grievances').get().count;
  const logCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;
  res.json({
    status: 'online',
    database: 'SQLite (native node:sqlite WAL mode)',
    counts: {
      districts: distCount,
      grievances: grvCount,
      auditLogs: logCount,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── GET /api/districts ───────────────────────────────────────
app.get('/api/districts', (req, res) => {
  try {
    const { state, search } = req.query;
    let sql = `
      SELECT 
        d.*,
        COUNT(g.id) as grievance_count,
        SUM(CASE WHEN g.severity = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM districts d
      LEFT JOIN grievances g ON d.id = g.district_id
    `;
    const params = [];

    if (state || search) {
      const conditions = [];
      if (state) {
        conditions.push('d.state = ?');
        params.push(state);
      }
      if (search) {
        conditions.push('(d.name LIKE ? OR d.state LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY d.id ORDER BY grievance_count DESC, d.infra_index ASC;';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    // Map to frontend-friendly camelCase
    const formatted = rows.map(r => ({
      id: r.id,
      district: r.name,
      state: r.state,
      lat: r.lat,
      lng: r.lng,
      population: r.population,
      bplRatio: r.bpl_ratio,
      literacyRate: r.literacy_rate,
      infraIndex: r.infra_index,
      waterCoverage: r.water_coverage,
      roadDensity: r.road_density,
      healthFacilities: r.health_facilities,
      budgetAllocated: r.budget_allocated,
      budgetUtilized: r.budget_utilized,
      grievanceCount: r.grievance_count || 0,
      criticalCount: r.critical_count || 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching districts:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/districts/:id ───────────────────────────────────
app.get('/api/districts/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM districts WHERE id = ? OR name LIKE ?');
    const district = stmt.get(req.params.id, `%${req.params.id}%`);
    if (!district) return res.status(404).json({ error: 'District not found' });

    const grvStmt = db.prepare('SELECT * FROM grievances WHERE district_id = ? ORDER BY created_at DESC');
    const grievances = grvStmt.all(district.id);

    res.json({
      ...district,
      district: district.name,
      grievances: grievances.map(g => ({
        id: g.id,
        category: g.category,
        text: g.raw_text,
        textEn: g.summary_en,
        severity: g.severity,
        status: g.status,
        language: g.language,
        lat: g.lat,
        lng: g.lng,
        citizenName: g.citizen_name,
        votes: g.votes,
        imageDescription: g.image_description,
        aiReasoning: g.ai_reasoning,
        timestamp: g.created_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/grievances ──────────────────────────────────────
app.get('/api/grievances', (req, res) => {
  try {
    const { category, severity, district, limit = 100 } = req.query;
    let sql = `
      SELECT g.*, d.name as district_name, d.state as district_state 
      FROM grievances g
      LEFT JOIN districts d ON g.district_id = d.id
    `;
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('g.category = ?');
      params.push(category);
    }
    if (severity) {
      conditions.push('g.severity = ?');
      params.push(severity);
    }
    if (district) {
      conditions.push('(g.district_id = ? OR d.name LIKE ?)');
      params.push(district.toLowerCase().replace(/\s+/g, '-'), `%${district}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY g.created_at DESC LIMIT ?;';
    params.push(Number(limit));

    const rows = db.prepare(sql).all(...params);

    const formatted = rows.map(g => ({
      id: g.id,
      category: g.category,
      text: g.raw_text,
      textEn: g.summary_en,
      severity: g.severity,
      status: g.status,
      language: g.language,
      district: g.district_name || 'Aspirational District',
      state: g.district_state || 'India',
      districtId: g.district_id,
      lat: g.lat,
      lng: g.lng,
      citizenName: g.citizen_name,
      votes: g.votes,
      imageDescription: g.image_description,
      aiReasoning: g.ai_reasoning,
      timestamp: g.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching grievances:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/grievances ─────────────────────────────────────
app.post('/api/grievances', (req, res) => {
  try {
    const {
      id = `GRV-${Date.now()}`,
      category = 'Roads & Transport',
      text = '',
      textEn = text,
      severity = 'high',
      status = 'pending',
      language = 'hi',
      district = 'Barmer',
      lat = 25.7521,
      lng = 71.3967,
      citizenName = 'Verified Citizen (Jan-Samvaad)',
      votes = 1,
      imageDescription = '',
      aiReasoning = 'Classified via Gemini 2.0 Flash intent analysis',
    } = req.body;

    const districtId = district.toLowerCase().replace(/\s+/g, '-');

    // Ensure district exists or create it
    const checkDist = db.prepare('SELECT id FROM districts WHERE id = ?').get(districtId);
    if (!checkDist) {
      db.prepare(`
        INSERT INTO districts (
          id, name, state, lat, lng, population, bpl_ratio, literacy_rate,
          infra_index, water_coverage, road_density, health_facilities,
          budget_allocated, budget_utilized
        ) VALUES (?, ?, 'India', ?, ?, 2000000, 0.40, 0.60, 35, 40, 35, 40, 1000, 350);
      `).run(districtId, district, lat, lng);
    }

    const insertStmt = db.prepare(`
      INSERT INTO grievances (
        id, category, raw_text, summary_en, severity, status,
        language, district_id, lat, lng, citizen_name, votes,
        image_description, ai_reasoning, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);
    `);

    insertStmt.run(
      id,
      category,
      text,
      textEn,
      severity,
      status,
      language,
      districtId,
      lat,
      lng,
      citizenName,
      votes,
      imageDescription,
      aiReasoning
    );

    // Add audit log
    db.prepare(`
      INSERT INTO audit_logs (action, details) VALUES (?, ?);
    `).run(
      'GRIEVANCE_REGISTERED',
      `Registered grievance ${id} for district ${district} (Severity: ${severity}, Category: ${category})`
    );

    const created = db.prepare(`
      SELECT g.*, d.name as district_name, d.state as district_state 
      FROM grievances g 
      LEFT JOIN districts d ON g.district_id = d.id 
      WHERE g.id = ?
    `).get(id);

    res.status(201).json({
      id: created.id,
      category: created.category,
      text: created.raw_text,
      textEn: created.summary_en,
      severity: created.severity,
      status: created.status,
      language: created.language,
      district: created.district_name,
      state: created.district_state,
      lat: created.lat,
      lng: created.lng,
      citizenName: created.citizen_name,
      votes: created.votes,
      imageDescription: created.image_description,
      aiReasoning: created.ai_reasoning,
      timestamp: created.created_at,
    });
  } catch (err) {
    console.error('Error creating grievance:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/grievances/:id/upvote ──────────────────────────
app.post('/api/grievances/:id/upvote', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE grievances SET votes = votes + 1 WHERE id = ?').run(id);

    const updated = db.prepare('SELECT id, votes FROM grievances WHERE id = ?').get(id);
    if (!updated) return res.status(404).json({ error: 'Grievance not found' });

    res.json({ id: updated.id, votes: updated.votes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/epi ─────────────────────────────────────────────
// Mathematical Explainable Priority Index calculated in SQL
app.get('/api/epi', (req, res) => {
  try {
    const districts = db.prepare(`
      SELECT 
        d.*,
        COUNT(g.id) as grievance_count,
        SUM(CASE WHEN g.severity = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM districts d
      LEFT JOIN grievances g ON d.id = g.district_id
      GROUP BY d.id
    `).all();

    const maxDemand = 20;
    const maxVulnerability = 0.6 * 0.6;

    const ranked = districts.map(d => {
      const demandPer100k = (d.grievance_count / (d.population / 100000));
      const demandDensity = Math.min(demandPer100k / maxDemand, 1);

      const vulnerability = d.bpl_ratio * (1 - d.literacy_rate);
      const normalizedVulnerability = Math.min(vulnerability / maxVulnerability, 1);

      const infraGap = (100 - d.infra_index) / 100;

      const budgetUtilization = d.budget_utilized / d.budget_allocated;
      const budgetGap = 1 - budgetUtilization;

      const rawScore = (
        0.30 * demandDensity +
        0.25 * normalizedVulnerability +
        0.25 * infraGap +
        0.20 * budgetGap
      );

      const epiScore = Math.min(Math.round(rawScore * 100) + Math.min(d.critical_count * 2, 15), 100);

      let level = 'low';
      if (epiScore >= 75) level = 'critical';
      else if (epiScore >= 55) level = 'high';
      else if (epiScore >= 35) level = 'medium';

      return {
        district: d.name,
        state: d.state,
        score: epiScore,
        level,
        rank: 0,
        grievanceCount: d.grievance_count,
        criticalCount: d.critical_count,
        factors: {
          demandDensity: Math.round(demandDensity * 100) / 100,
          vulnerability: Math.round(normalizedVulnerability * 100) / 100,
          infraGap: Math.round(infraGap * 100) / 100,
          budgetSlack: Math.round(budgetGap * 100) / 100,
        },
        auditTrail: {
          formula: 'EPI = 0.30(Demand) + 0.25(Vulnerability) + 0.25(InfraGap) + 0.20(BudgetSlack)',
          calculatedAt: new Date().toISOString(),
          databaseEngine: 'SQLite WAL mode (node:sqlite)',
        }
      };
    });

    ranked.sort((a, b) => b.score - a.score);
    ranked.forEach((r, idx) => { r.rank = idx + 1; });

    res.json(ranked);
  } catch (err) {
    console.error('Error calculating EPI:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/seed ───────────────────────────────────────────
app.post('/api/seed', (req, res) => {
  try {
    const result = seedDatabase();
    res.json({ message: 'Database seeded successfully', ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 VikasDrishti API Server running on http://localhost:${PORT}`);
  console.log(`📊 SQLite database connected at server/vikasdrishti.db`);
});
