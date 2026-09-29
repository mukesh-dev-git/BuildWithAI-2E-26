// VikasDrishti AI — Gemini API Service
// Handles all AI interactions: intent extraction, vision verification, policy reasoning

import { GoogleGenerativeAI } from '@google/generative-ai';

let customApiKey = '';
try {
  customApiKey = localStorage.getItem('gemini_api_key') || '';
} catch (e) {
  // localStorage not available
}

const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export function getApiKey() {
  return customApiKey || ENV_API_KEY;
}

export function setApiKey(newKey) {
  customApiKey = (newKey || '').trim();
  try {
    if (customApiKey) {
      localStorage.setItem('gemini_api_key', customApiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  } catch (e) {}
  genAI = null;
  model = null;
}

let genAI = null;
let model = null;

function getModel() {
  const activeKey = getApiKey();
  if (!model && activeKey) {
    try {
      genAI = new GoogleGenerativeAI(activeKey);
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (e) {
      console.warn('Failed to initialize Gemini model:', e);
      return null;
    }
  }
  return model;
}

/**
 * Extract grievance intent from citizen text input (any Indian language)
 * Returns structured grievance data
 */
export async function extractGrievanceIntent(text, language = 'auto') {
  const m = getModel();
  if (!m) return getFallbackExtraction(text);

  const prompt = `You are an AI assistant for VikasDrishti AI, a Digital Public Good for Indian civic governance.

Analyze the following citizen grievance text and extract structured information.
The text may be in any Indian language (Hindi, Tamil, Marathi, Telugu, Kannada, Bengali, Gujarati, Punjabi, Odia, Malayalam, Assamese, Urdu, or English).

Citizen Input: "${text}"

Return a JSON object with these fields:
{
  "category": one of ["Roads & Transport", "Water Supply", "Sanitation", "Education", "Healthcare", "Electricity", "Housing", "Agriculture", "Public Safety", "Other"],
  "severity": one of ["critical", "high", "medium", "low"],
  "summary_en": "concise English summary of the grievance in 1-2 sentences",
  "summary_local": "brief summary in the original language",
  "detected_language": "ISO 639-1 code of detected language",
  "key_issues": ["list", "of", "key", "issues"],
  "suggested_department": "which government department should handle this",
  "urgency_reasoning": "brief explanation of why this severity level was assigned"
}

Return ONLY the JSON, no markdown formatting.`;

  try {
    const result = await m.generateContent(prompt);
    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini extraction error:', error);
    return getFallbackExtraction(text);
  }
}

/**
 * Verify civic damage from uploaded photo using Gemini Vision
 */
export async function verifyPhoto(imageBase64, mimeType = 'image/jpeg') {
  const m = getModel();
  if (!m) return getFallbackPhotoVerification();

  const prompt = `You are a civic infrastructure damage assessment AI for the Indian government's Digital Public Good platform.

Analyze this citizen-uploaded photo and determine:
1. Does this photo show actual civic/infrastructure damage or a civic issue?
2. What type of damage/issue is visible?
3. How severe is the damage on a scale of 1-10?
4. Is this potentially spam, fake, or irrelevant?

Return a JSON object:
{
  "is_valid_civic_issue": true/false,
  "damage_type": "type of damage detected",
  "damage_description": "detailed description of what you see",
  "severity_score": 1-10,
  "category": one of ["Roads & Transport", "Water Supply", "Sanitation", "Education", "Healthcare", "Electricity", "Housing", "Other"],
  "is_spam": true/false,
  "confidence": 0.0-1.0,
  "recommended_action": "suggested immediate action"
}

Return ONLY the JSON, no markdown formatting.`;

  try {
    const result = await m.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType,
        },
      },
    ]);
    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini vision error:', error);
    return getFallbackPhotoVerification();
  }
}

/**
 * Generate AI policy recommendations for a district based on EPI data
 */
export async function generatePolicyRecommendation(districtData, grievances) {
  const m = getModel();
  if (!m) return getFallbackPolicyRec(districtData);

  const grievanceSummary = grievances.slice(0, 10).map(g => 
    `- ${g.category}: ${g.textEn} (Severity: ${g.severity}, Votes: ${g.votes})`
  ).join('\n');

  const prompt = `You are the AI Policy Advisor for VikasDrishti AI, India's Digital Public Good for infrastructure governance.

Analyze the following district data and citizen grievances to generate a policy recommendation:

DISTRICT: ${districtData.district}, ${districtData.state}
Population: ${districtData.population?.toLocaleString()}
BPL Ratio: ${(districtData.bplRatio * 100).toFixed(1)}%
Literacy Rate: ${(districtData.literacyRate * 100).toFixed(1)}%
Infrastructure Index: ${districtData.infraIndex}/100
Water Coverage: ${districtData.waterCoverage}%
Road Density: ${districtData.roadDensity}/100
Health Facilities: ${districtData.healthFacilities}/100
Budget Allocated: ₹${districtData.budgetAllocated} Crore
Budget Utilized: ₹${districtData.budgetUtilized} Crore (${((districtData.budgetUtilized / districtData.budgetAllocated) * 100).toFixed(1)}% utilization)

TOP CITIZEN GRIEVANCES:
${grievanceSummary}

Generate a comprehensive policy recommendation in JSON format:
{
  "priority_score": 0-100,
  "priority_level": "critical/high/medium/low",
  "headline": "one-line headline for the recommendation",
  "analysis": "2-3 sentence analysis of the district's situation",
  "top_recommendations": [
    {"action": "specific action", "budget_estimate_cr": number, "impact": "expected impact", "timeline": "implementation timeline"}
  ],
  "risk_factors": ["list of key risks"],
  "sdg_alignment": ["which UN SDGs this addresses"],
  "audit_rationale": "transparent explanation of how the priority score was calculated"
}

Return ONLY the JSON, no markdown formatting.`;

  try {
    const result = await m.generateContent(prompt);
    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini policy error:', error);
    return getFallbackPolicyRec(districtData);
  }
}

/**
 * Generate what-if budget simulation analysis
 */
export async function simulateBudgetImpact(districtData, budgetChange, category) {
  const m = getModel();
  if (!m) return getFallbackSimulation(districtData, budgetChange, category);

  const prompt = `You are the AI Budget Simulator for VikasDrishti AI.

Simulate the impact of a budget allocation change:

DISTRICT: ${districtData.district}, ${districtData.state}
Current Infrastructure Index: ${districtData.infraIndex}/100
Current Budget: ₹${districtData.budgetAllocated} Crore

PROPOSED CHANGE:
Category: ${category}
Additional Budget: ₹${budgetChange} Crore

Simulate the projected impact and return JSON:
{
  "projected_infra_index_change": "+X points",
  "projected_grievance_reduction": "X%",
  "projected_beneficiaries": number,
  "cost_per_beneficiary": "₹X",
  "implementation_feasibility": "high/medium/low",
  "key_outcomes": ["list of projected outcomes"],
  "trade_offs": ["what other areas might be affected"],
  "recommendation": "brief recommendation on this allocation"
}

Return ONLY the JSON, no markdown formatting.`;

  try {
    const result = await m.generateContent(prompt);
    const response = result.response.text();
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini simulation error:', error);
    return getFallbackSimulation(districtData, budgetChange, category);
  }
}

/**
 * Translate text to a target language
 */
export async function translateText(text, targetLang) {
  const m = getModel();
  if (!m) return text;

  const langMap = {
    hi: 'Hindi', ta: 'Tamil', mr: 'Marathi', te: 'Telugu',
    kn: 'Kannada', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi',
    or: 'Odia', ml: 'Malayalam', as: 'Assamese', ur: 'Urdu', en: 'English'
  };

  try {
    const result = await m.generateContent(
      `Translate the following text to ${langMap[targetLang] || 'English'}. Return ONLY the translated text, nothing else:\n\n${text}`
    );
    return result.response.text().trim();
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

// ── Fallback functions (when API key is not available) ──

function getFallbackExtraction(text) {
  const categories = ['Water Supply', 'Roads & Transport', 'Sanitation', 'Healthcare', 'Education', 'Electricity'];
  const keywords = {
    'Water Supply': ['पानी', 'water', 'नल', 'pipe', 'बोरवेल', 'குடிநீர்', 'ನೀರ', 'জল', 'বান'],
    'Roads & Transport': ['सड़क', 'road', 'पुल', 'bridge', 'गड्ढा', 'pothole', 'சாலை', 'ரোட்', 'রাস্তা'],
    'Sanitation': ['नाला', 'drain', 'शौचालय', 'toilet', 'कूड़ा', 'garbage', 'கழிவு'],
    'Healthcare': ['अस्पताल', 'hospital', 'डॉक्टर', 'doctor', 'दवा', 'medicine', 'மருத்துவ', 'ആശുപത്രി'],
    'Education': ['स्कूल', 'school', 'शिक्षक', 'teacher', 'विद्यालय', 'ஶாலை', 'শালা', 'ಶಾಲೆ'],
    'Electricity': ['बिजली', 'electricity', 'ट्रांसफॉर्मर', 'transformer', 'மின்', 'విద్యుత్'],
  };

  let detectedCategory = 'Other';
  const lowerText = text.toLowerCase();
  for (const [cat, keys] of Object.entries(keywords)) {
    if (keys.some(k => lowerText.includes(k.toLowerCase()) || text.includes(k))) {
      detectedCategory = cat;
      break;
    }
  }

  return {
    category: detectedCategory,
    severity: text.length > 50 ? 'high' : 'medium',
    summary_en: `Citizen reported an issue related to ${detectedCategory}`,
    summary_local: text.substring(0, 100),
    detected_language: 'hi',
    key_issues: [detectedCategory.toLowerCase()],
    suggested_department: `Department of ${detectedCategory}`,
    urgency_reasoning: 'Automatically assessed based on content analysis',
  };
}

function getFallbackPhotoVerification() {
  return {
    is_valid_civic_issue: true,
    damage_type: 'Infrastructure damage',
    damage_description: 'Photo analysis unavailable — marked for manual review',
    severity_score: 5,
    category: 'Other',
    is_spam: false,
    confidence: 0.5,
    recommended_action: 'Manual review required',
  };
}

function getFallbackPolicyRec(districtData) {
  const utilization = (districtData.budgetUtilized / districtData.budgetAllocated) * 100;
  const priorityScore = Math.round(
    (1 - districtData.infraIndex / 100) * 40 +
    districtData.bplRatio * 30 +
    (1 - utilization / 100) * 30
  );

  return {
    priority_score: Math.min(priorityScore, 100),
    priority_level: priorityScore > 70 ? 'critical' : priorityScore > 50 ? 'high' : priorityScore > 30 ? 'medium' : 'low',
    headline: `${districtData.district} needs urgent infrastructure intervention`,
    analysis: `${districtData.district} district has an infrastructure index of ${districtData.infraIndex}/100 with only ${utilization.toFixed(0)}% budget utilization. BPL ratio stands at ${(districtData.bplRatio * 100).toFixed(0)}%, indicating significant vulnerability.`,
    top_recommendations: [
      { action: 'Improve water supply infrastructure', budget_estimate_cr: 50, impact: 'Benefit ~${(districtData.population * 0.3).toFixed(0)} citizens', timeline: '6-12 months' },
      { action: 'Road repair and construction', budget_estimate_cr: 80, impact: 'Improve connectivity index by 15 points', timeline: '12-18 months' },
      { action: 'Strengthen healthcare facilities', budget_estimate_cr: 30, impact: 'Reduce healthcare access gap by 40%', timeline: '6-9 months' },
    ],
    risk_factors: ['Low budget utilization capacity', 'Administrative bottlenecks', 'Geographic challenges'],
    sdg_alignment: ['SDG 6: Clean Water', 'SDG 9: Infrastructure', 'SDG 11: Sustainable Cities'],
    audit_rationale: `Priority calculated: Infra deficit (${100 - districtData.infraIndex}) × 0.4 + Vulnerability (${(districtData.bplRatio * 100).toFixed(0)}%) × 0.3 + Budget gap (${(100 - utilization).toFixed(0)}%) × 0.3 = ${priorityScore}`,
  };
}

function getFallbackSimulation(districtData, budgetChange, category) {
  const beneficiaries = Math.round(districtData.population * 0.2 * (budgetChange / 100));
  return {
    projected_infra_index_change: `+${Math.min(Math.round(budgetChange / 10), 20)} points`,
    projected_grievance_reduction: `${Math.min(Math.round(budgetChange / 5), 40)}%`,
    projected_beneficiaries: beneficiaries,
    cost_per_beneficiary: `₹${Math.round((budgetChange * 10000000) / beneficiaries)}`,
    implementation_feasibility: budgetChange < 100 ? 'high' : budgetChange < 300 ? 'medium' : 'low',
    key_outcomes: [
      `Improvement in ${category} infrastructure`,
      `Estimated ${Math.round(budgetChange * 50)} jobs created`,
      `Infrastructure index projected to reach ${Math.min(districtData.infraIndex + Math.round(budgetChange / 10), 100)}/100`,
    ],
    trade_offs: ['Reduced allocation for other sectors', 'Implementation capacity constraints'],
    recommendation: `Allocating ₹${budgetChange} Cr to ${category} in ${districtData.district} is ${budgetChange < 200 ? 'recommended' : 'feasible but requires phased implementation'}`,
  };
}

export function isApiKeyConfigured() {
  return Boolean(getApiKey());
}
