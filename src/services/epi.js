// VikasDrishti AI — Explainable Priority Index (EPI)
// The signature AI formula that makes our prioritization transparent and auditable

import districtData from '../data/districts';
import seedGrievances from '../data/seed-grievances';

/**
 * EPI Formula:
 * Priority Score = w₁(Demand Density) + w₂(Vulnerability Index) + w₃(Infrastructure Gap) − w₄(Budget Utilization)
 * 
 * Where:
 * - Demand Density = normalized grievance count per capita
 * - Vulnerability Index = BPL ratio × (1 - literacy rate)
 * - Infrastructure Gap = (100 - infraIndex) / 100
 * - Budget Utilization = budgetUtilized / budgetAllocated
 */

const WEIGHTS = {
  demandDensity: 0.30,    // w₁
  vulnerability: 0.25,     // w₂
  infraGap: 0.25,          // w₃
  budgetGap: 0.20,         // w₄
};

/**
 * Calculate the EPI score for a single district
 */
export function calculateEPI(district, grievances) {
  const districtGrievances = grievances.filter(g => g.district === district.district);
  const grievanceCount = districtGrievances.length;
  
  // 1. Demand Density (normalized per 100k population)
  const demandPer100k = (grievanceCount / (district.population / 100000));
  const maxDemand = 20; // normalize against max expected density
  const demandDensity = Math.min(demandPer100k / maxDemand, 1);

  // 2. Vulnerability Index
  const vulnerability = district.bplRatio * (1 - district.literacyRate);
  const maxVulnerability = 0.6 * 0.6; // theoretical max
  const normalizedVulnerability = Math.min(vulnerability / maxVulnerability, 1);

  // 3. Infrastructure Gap
  const infraGap = (100 - district.infraIndex) / 100;

  // 4. Budget Gap (inverse of utilization — higher gap = higher priority)
  const budgetUtilization = district.budgetUtilized / district.budgetAllocated;
  const budgetGap = 1 - budgetUtilization;

  // Calculate raw EPI
  const rawScore = 
    WEIGHTS.demandDensity * demandDensity +
    WEIGHTS.vulnerability * normalizedVulnerability +
    WEIGHTS.infraGap * infraGap +
    WEIGHTS.budgetGap * budgetGap;

  // Scale to 0-100
  const epiScore = Math.round(rawScore * 100);

  // Severity-weighted bonus: critical grievances add extra urgency
  const criticalCount = districtGrievances.filter(g => g.severity === 'critical').length;
  const criticalBonus = Math.min(criticalCount * 2, 10);

  const finalScore = Math.min(epiScore + criticalBonus, 100);

  // Generate audit trail
  const auditTrail = {
    demandDensity: {
      value: demandDensity,
      raw: demandPer100k.toFixed(2),
      contribution: (WEIGHTS.demandDensity * demandDensity * 100).toFixed(1),
      description: `${grievanceCount} grievances for ${(district.population / 100000).toFixed(1)}L population = ${demandPer100k.toFixed(2)} per lakh`,
    },
    vulnerability: {
      value: normalizedVulnerability,
      raw: vulnerability.toFixed(4),
      contribution: (WEIGHTS.vulnerability * normalizedVulnerability * 100).toFixed(1),
      description: `BPL ${(district.bplRatio * 100).toFixed(0)}% × Illiteracy ${((1 - district.literacyRate) * 100).toFixed(0)}%`,
    },
    infraGap: {
      value: infraGap,
      raw: district.infraIndex,
      contribution: (WEIGHTS.infraGap * infraGap * 100).toFixed(1),
      description: `Infrastructure Index ${district.infraIndex}/100 → Gap: ${(infraGap * 100).toFixed(0)}%`,
    },
    budgetGap: {
      value: budgetGap,
      raw: budgetUtilization.toFixed(4),
      contribution: (WEIGHTS.budgetGap * budgetGap * 100).toFixed(1),
      description: `₹${district.budgetUtilized}Cr of ₹${district.budgetAllocated}Cr utilized (${(budgetUtilization * 100).toFixed(0)}%) → Gap: ${(budgetGap * 100).toFixed(0)}%`,
    },
    criticalBonus: {
      value: criticalBonus,
      description: `${criticalCount} critical grievances → +${criticalBonus} bonus`,
    },
  };

  return {
    district: district.district,
    state: district.state,
    score: finalScore,
    level: getLevel(finalScore),
    grievanceCount,
    criticalCount,
    auditTrail,
    topCategories: getTopCategories(districtGrievances),
  };
}

/**
 * Calculate EPI for all districts and return sorted rankings
 */
export function calculateAllEPI(districts = districtData, grievances = seedGrievances) {
  // If first argument is grievances array instead of districts
  if (Array.isArray(districts) && districts.length > 0 && districts[0].category && !districts[0].population) {
    grievances = districts;
    districts = districtData;
  }
  const results = districts.map(d => calculateEPI(d, grievances));
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Get the priority level from score
 */
function getLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * Get top grievance categories for a district
 */
function getTopCategories(grievances) {
  const counts = {};
  grievances.forEach(g => {
    counts[g.category] = (counts[g.category] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));
}

/**
 * Get summary statistics across all districts
 */
export function getEPISummary(epiResults) {
  const total = epiResults.length;
  const criticalDistricts = epiResults.filter(r => r.level === 'critical').length;
  const highDistricts = epiResults.filter(r => r.level === 'high').length;
  const avgScore = Math.round(epiResults.reduce((s, r) => s + r.score, 0) / total);
  const totalGrievances = epiResults.reduce((s, r) => s + r.grievanceCount, 0);
  const totalCritical = epiResults.reduce((s, r) => s + r.criticalCount, 0);

  return {
    totalDistricts: total,
    criticalDistricts,
    highDistricts,
    avgScore,
    totalGrievances,
    totalCritical,
  };
}

export default { calculateEPI, calculateAllEPI, getEPISummary };
