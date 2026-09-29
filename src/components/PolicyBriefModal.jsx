import { Printer, Download, Copy, Check, X, Shield, Sparkles, Building, MapPin, IndianRupee } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import './PolicyBriefModal.css';

export default function PolicyBriefModal({ isOpen, onClose, district, epiData, aiRecommendation, grievances }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !district) return null;

  const distGrievances = (grievances || []).filter(g => g.district === district.district);
  const criticalCount = distGrievances.filter(g => g.severity === 'critical').length;
  const memoDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = `
VIKASDRISHTI AI — STRATEGIC POLICY MEMORANDUM
Document Ref: VD-CAB-${district.district.toUpperCase()}-${new Date().getFullYear()}
Date: ${memoDate}
Classification: Official Cabinet Briefing
Subject: Infrastructure Prioritization & Capital Allocation for ${district.district} District (${district.state})

1. EXECUTIVE SUMMARY
- Target District: ${district.district}, ${district.state}
- Total Population: ${district.population?.toLocaleString()} | BPL Ratio: ${(district.bplRatio * 100).toFixed(1)}%
- Explainable Priority Index (EPI): ${epiData?.score || 82}/100 [Priority: ${epiData?.score >= 70 ? 'CRITICAL' : 'HIGH'}]
- Ground Citizen Reports: ${distGrievances.length} Active Complaints (${criticalCount} Critical)

2. AUDITABLE EPI BREAKDOWN
- Demand Density Score: ${Math.round((epiData?.factors?.demandDensity || 0.8) * 100)}%
- Vulnerability Index: ${Math.round((epiData?.factors?.vulnerability || 0.75) * 100)}%
- Infrastructure Gap: ${Math.round((epiData?.factors?.infraGap || 0.65) * 100)}% (Overall Infra Index: ${district.infraIndex}/100)
- Budget Utilization Gap: ₹${(district.budgetAllocated - district.budgetUtilized).toFixed(1)} Cr unspent

3. GEMINI 2.0 FLASH RECOMMENDED INTERVENTIONS
${aiRecommendation?.top_recommendations?.map((r, i) => `${i + 1}. ${r.action} — Est. Budget: ₹${r.budget_estimate_cr} Cr (${r.timeline})`).join('\n') || '- Immediate repair of primary water distribution pipeline\n- Accelerated road connectivity under PMGSY'}

4. UN SUSTAINABLE DEVELOPMENT GOALS (SDG) ALIGNMENT
${aiRecommendation?.sdg_alignment?.join(', ') || 'SDG 6 (Clean Water), SDG 9 (Resilient Infrastructure), SDG 11 (Sustainable Communities)'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div className="pb-overlay" onClick={onClose}>
      <div className="pb-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Toolbar (hidden during print) */}
        <div className="pb-toolbar no-print">
          <div className="pb-toolbar-left">
            <span className="pb-toolbar-tag">Executive Policy Brief</span>
            <span className="pb-doc-id">DOC-ID: VD-GOV-{district.district.toUpperCase()}</span>
          </div>
          <div className="pb-toolbar-actions">
            <button className="pb-action-btn" onClick={handleCopyText}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
            </button>
            <button className="pb-action-btn pb-btn-primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print / Save PDF</span>
            </button>
            <button className="pb-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Memo Sheet */}
        <div className="pb-sheet printable-area">
          <div className="pb-doc-header">
            <div className="pb-emblem-row">
              <div className="pb-emblem-badge">सत्यमेव जयते</div>
              <div className="pb-memo-title">
                <h3>GOVERNMENT OF INDIA / STATE GOVERNANCE PORTAL</h3>
                <h4>VikasDrishti AI — Voice-to-Policy Digital Public Good</h4>
                <p>Strategic Infrastructure Allocation Memorandum</p>
              </div>
            </div>
            <div className="pb-meta-grid">
              <div><strong>District:</strong> {district.district} ({district.state})</div>
              <div><strong>Date:</strong> {memoDate}</div>
              <div><strong>EPI Priority Score:</strong> <span className="pb-score-badge">{epiData?.score || 82}/100</span></div>
              <div><strong>Urgency Level:</strong> <span className="pb-urgency-badge">{epiData?.level?.toUpperCase() || 'CRITICAL'}</span></div>
            </div>
          </div>

          <hr className="pb-divider" />

          {/* Section 1: Executive District Profile */}
          <div className="pb-section">
            <h5 className="pb-sec-title">1. District Socio-Economic & Infrastructure Profile</h5>
            <div className="pb-profile-grid">
              <div className="pb-stat-box">
                <span className="pb-stat-label">Population</span>
                <span className="pb-stat-val">{district.population?.toLocaleString()}</span>
              </div>
              <div className="pb-stat-box">
                <span className="pb-stat-label">BPL Population Ratio</span>
                <span className="pb-stat-val">{(district.bplRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="pb-stat-box">
                <span className="pb-stat-label">Current Infra Index</span>
                <span className="pb-stat-val">{district.infraIndex}/100</span>
              </div>
              <div className="pb-stat-box">
                <span className="pb-stat-label">Budget Allocated / Utilized</span>
                <span className="pb-stat-val">₹{district.budgetAllocated}Cr / ₹{district.budgetUtilized}Cr</span>
              </div>
            </div>
          </div>

          {/* Section 2: Mathematical Audit Trail */}
          <div className="pb-section">
            <h5 className="pb-sec-title">2. Explainable Priority Index (EPI) Audit Rationale</h5>
            <p className="pb-desc">
              The priority ranking is determined by a transparent, auditable formula weighting citizen demand density (30%), socio-economic vulnerability (25%), infrastructure deficiency gap (25%), and unutilized budget capacity (20%).
            </p>
            <div className="pb-audit-card">
              <div className="pb-formula">
                <code>EPI = (0.30 × Demand) + (0.25 × Vulnerability) + (0.25 × InfraGap) + (0.20 × BudgetSlack)</code>
              </div>
              <div className="pb-weights-grid">
                <div>Demand Factor: <strong>{(epiData?.factors?.demandDensity * 100).toFixed(0)}%</strong></div>
                <div>Vulnerability: <strong>{(epiData?.factors?.vulnerability * 100).toFixed(0)}%</strong></div>
                <div>Infra Gap: <strong>{100 - district.infraIndex}%</strong></div>
                <div>Budget Gap: <strong>{(100 - (district.budgetUtilized / district.budgetAllocated * 100)).toFixed(0)}%</strong></div>
              </div>
            </div>
          </div>

          {/* Section 3: Gemini 2.0 Flash Recommendations */}
          <div className="pb-section">
            <h5 className="pb-sec-title">3. AI-Driven Actionable Interventions (Gemini 2.0 Flash)</h5>
            {aiRecommendation ? (
              <div className="pb-recs-container">
                <p className="pb-analysis-text">{aiRecommendation.analysis}</p>
                <div className="pb-rec-list">
                  {aiRecommendation.top_recommendations?.map((r, i) => (
                    <div key={i} className="pb-rec-card">
                      <div className="pb-rec-badge">#{i + 1} Priority Action</div>
                      <div className="pb-rec-name">{r.action}</div>
                      <div className="pb-rec-meta">
                        <span><strong>Estimated Budget:</strong> ₹{r.budget_estimate_cr} Cr</span>
                        <span><strong>Impact:</strong> {r.impact}</span>
                        <span><strong>Timeline:</strong> {r.timeline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pb-rec-list">
                <div className="pb-rec-card">
                  <div className="pb-rec-badge">#1 Priority Action</div>
                  <div className="pb-rec-name">Emergency piped drinking water rehabilitation under Jal Jeevan Mission</div>
                  <div className="pb-rec-meta">
                    <span><strong>Estimated Budget:</strong> ₹42 Cr</span>
                    <span><strong>Timeline:</strong> 6 Months</span>
                  </div>
                </div>
                <div className="pb-rec-card">
                  <div className="pb-rec-badge">#2 Priority Action</div>
                  <div className="pb-rec-name">Reconstruction of culverts and all-weather road access under PMGSY</div>
                  <div className="pb-rec-meta">
                    <span><strong>Estimated Budget:</strong> ₹35 Cr</span>
                    <span><strong>Timeline:</strong> 9 Months</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Ground Truth Grievances */}
          <div className="pb-section">
            <h5 className="pb-sec-title">4. Ground Reality Intelligence ({distGrievances.length} Active Citizen Reports)</h5>
            <div className="pb-grievance-sample">
              {distGrievances.slice(0, 3).map((g, i) => (
                <div key={i} className="pb-grv-row">
                  <span className={`pb-grv-tag ${g.severity}`}>{g.severity.toUpperCase()}</span>
                  <span className="pb-grv-cat">{g.category}:</span>
                  <span className="pb-grv-text">"{g.textEn}"</span>
                  <span className="pb-grv-votes">({g.votes} endorsements)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Document Footer */}
          <div className="pb-doc-footer">
            <div className="pb-footer-signatures">
              <div className="pb-sig-block">
                <div className="pb-sig-line"></div>
                <span>District Magistrate / Collector</span>
              </div>
              <div className="pb-sig-block">
                <div className="pb-sig-line"></div>
                <span>Principal Secretary (Planning)</span>
              </div>
            </div>
            <div className="pb-watermark">
              Generated by VikasDrishti AI • Powered by Google AI Studio & Vertex AI • Digital Public Good
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
