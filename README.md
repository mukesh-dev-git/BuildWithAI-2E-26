<div align="center">

# 🇮🇳 विकास दृष्टि • VikasDrishti AI
### *Voice-to-Policy Digital Public Good for Infrastructure Governance*
**Official Submission for Google Build With AI Hackathon 2026**

<br/>

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Outfit&weight=700&size=24&duration=3000&pause=1000&color=FF6B35&center=true&vCenter=true&multiline=false&width=750&height=50&lines=Voice-to-Policy+Digital+Public+Good+for+700M%2B+Citizens;Multimodal+Intent+%26+Vision+Audit+via+Gemini+2.0+Flash;Explainable+Priority+Index+(EPI)+Transparent+Governance;12-Month+Infrastructure+Failure+Forecasting+with+Vertex+AI" alt="Typing SVG" />
</a>

<br/>

<p align="center">
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-the-explainable-priority-index-epi">EPI Formula</a> •
  <a href="#-persistent-sqlite-database">Database</a> •
  <a href="#-google-technologies">Google Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-api-endpoints">REST API</a> •
  <a href="#-demo-script">Live Pitch Demo</a>
</p>

<!-- Shields Row 1: Google Stack -->
<p align="center">
  <img src="https://img.shields.io/badge/Google%20AI%20Studio-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Vertex%20AI-AutoML%20Forecasting-34A853?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Vertex AI" />
  <img src="https://img.shields.io/badge/Firebase-Firestore%20%26%20Hosting-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/BigQuery-Public%20Datasets-009688?style=for-the-badge&logo=google-cloud&logoColor=white" alt="BigQuery" />
</p>

<!-- Shields Row 2: Tech Stack -->
<p align="center">
  <img src="https://img.shields.io/badge/Database-SQLite%20(WAL%20Mode)-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Runtime-Node%20v24.14-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-646CFF?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Digital%20Public%20Good-Vikasit%20Bharat%202047-FF9933?style=for-the-badge" alt="DPG" />
</p>

</div>

---

## 🌟 The Problem & Vision

```
                       700M+ Rural Citizens (22+ Languages)
                                        │
                         [❌ The High-Friction Chasm]
         Literacy Barriers • Complex Portals • Discretionary Funding
                                        │
                                        ▼
                  ₹3+ Lakh Crore Annual Infrastructure Budget
           (Delayed surveys, lobbying, reactive catastrophe repairs)
```

```
                                      ▼
                        ✨ THE VIKASDRISHTI SOLUTION ✨
          Citizen Voice / Photo ──► Gemini 2.0 Flash ──► Persistent SQLite
                                                              │
                                                              ▼
           Cabinet Policy Memo  ◄── Vertex AI Forecast  ◄── Auditable EPI
```

---

## 🏗️ Interactive System Architecture

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1E293B', 'edgeLabelBackground':'#0F172A', 'tertiaryColor': '#0F172A'}}}%%
flowchart LR
    subgraph S1["🗣️ Citizen Edge"]
        direction TB
        C1["🎙️ Voice Note (10+ Languages)"]
        C2["📷 Camera Evidence"]
        C3["📍 GPS Auto-Capture"]
    end

    subgraph S2["⚡ Multimodal Google AI"]
        direction TB
        G1["🧠 Gemini 2.0 Flash NER"]
        G2["👁️ Gemini Vision Audit"]
        G3["⚖️ Urgency Reasoning"]
    end

    subgraph S3["🗄️ Relational Data Core"]
        direction TB
        D1["🚀 Express Server :5000"]
        D2[("💽 SQLite WAL Database")]
        D3["🔥 Cloud Firestore Sync"]
    end

    subgraph S4["📈 Predictive Intelligence"]
        direction TB
        E1["🏆 Explainable Priority Index"]
        E2["🔮 Vertex AI 12-Mo Forecaster"]
    end

    subgraph S5["🏛️ Governance Studio"]
        direction TB
        P1["🗺️ GIS Heatmap"]
        P2["💰 What-If Budget Simulator"]
        P3["📑 Cabinet Policy Memo"]
    end

    S1 ==> S2
    S2 ==> S3
    S3 ==> S4
    S4 ==> S5

    style S1 fill:#0F172A,stroke:#FF6B35,stroke-width:2px
    style S2 fill:#0F172A,stroke:#4285F4,stroke-width:2px
    style S3 fill:#0F172A,stroke:#F59E0B,stroke-width:2px
    style S4 fill:#0F172A,stroke:#10B981,stroke-width:2px
    style S5 fill:#0F172A,stroke:#8B5CF6,stroke-width:2px
```

---

## 🧠 The Signature AI Formula: Explainable Priority Index (EPI)

Bureaucrats and legislators reject "black-box" machine learning. VikasDrishti AI invents the **Explainable Priority Index (EPI)** — a fully auditable mathematical formula that guarantees fairness and transparent governance:

$$\huge\text{EPI} = 0.30(D) + 0.25(V) + 0.25(G) + 0.20(B) + U$$

<br/>

| Variable | Factor | Mathematical Formula | Government Data Benchmark | Weight |
|:---:|:---|:---|:---|:---:|
| **$D$** | **Demand Density** | $\min\left(\frac{\text{Grievance Count}}{\text{Pop} / 100,000 \times 20}, 1.0\right)$ | Real-time Citizen Submissions & Endorsements | **30%** |
| **$V$** | **Vulnerability Index** | $\min\left(\frac{\text{BPL Ratio} \times (1 - \text{Literacy})}{0.36}, 1.0\right)$ | NITI Aayog Aspirational Districts Indicators | **25%** |
| **$G$** | **Infrastructure Gap** | $\frac{100 - \text{Infra Index}}{100}$ | Multi-sector baseline (JJM water, PMGSY roads, PHC) | **25%** |
| **$B$** | **Budget Slack** | $1 - \left(\frac{\text{Budget Utilized}}{\text{Budget Allocated}}\right)$ | Unspent capital expenditure capacity | **20%** |
| **$U$** | **Urgency Bonus** | $+2 \text{ pts per critical report (max 15)}$ | Gemini 2.0 Flash Life-Threatening Severity Tag | **Bonus** |

<details>
<summary><b>🔍 Click to expand an Audit Trail Calculation Example</b></summary>

```yaml
District: Barmer (Rajasthan)
Population: 2,603,751 | BPL Ratio: 45.0% | Literacy: 56.0%
Current Infra Index: 28/100 | Budget: ₹1,400 Cr allocated, ₹380 Cr spent

Factor Calculations:
  - Demand Density (D):    0.84 × 0.30 = 0.252
  - Vulnerability (V):     0.55 × 0.25 = 0.138
  - Infrastructure Gap (G):0.72 × 0.25 = 0.180
  - Budget Slack (B):      0.73 × 0.20 = 0.146
  - Raw Score:             0.716 × 100 = 72
  - Critical Urgency Bonus:+10 pts (5 critical water/bridge failures)
  -------------------------------------------------------------
  FINAL AUDIT SCORE:       82 / 100 [PRIORITY: CRITICAL]
```
</details>

---

## 🗄️ Relational Database Architecture (`server/vikasdrishti.db`)

Unlike mock web apps, VikasDrishti AI is backed by an active **persistent SQLite database** operating in native Node 24 WAL mode:

<div align="center">

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│      districts (80 rows)        │        │      grievances (80+ rows)       │
├─────────────────────────────────┤        ├──────────────────────────────────┤
│ id (PK): TEXT                   │◄───────│ district_id (FK): TEXT           │
│ name: TEXT                      │        │ id (PK): TEXT                    │
│ state: TEXT                     │        │ category: TEXT                   │
│ lat, lng: REAL                  │        │ raw_text: TEXT                   │
│ population: INTEGER             │        │ summary_en: TEXT                 │
│ bpl_ratio: REAL                 │        │ severity: TEXT (critical/high..) │
│ literacy_rate: REAL             │        │ status: TEXT                     │
│ infra_index: REAL               │        │ language: TEXT                   │
│ water_coverage: REAL            │        │ lat, lng: REAL                   │
│ road_density: REAL              │        │ citizen_name: TEXT               │
│ health_facilities: REAL         │        │ votes: INTEGER                   │
│ budget_allocated, utilized: REAL│        │ image_description: TEXT          │
│ created_at: TEXT                │        │ ai_reasoning: TEXT               │
└─────────────────────────────────┘        └──────────────────────────────────┘
                 │                                           ▲
                 └──────────────┬────────────────────────────┘
                                │
                 ┌──────────────▼─────────────────┐
                 │     audit_logs (Immutable)     │
                 ├────────────────────────────────┤
                 │ id (PK): INTEGER AUTOINCREMENT │
                 │ action: TEXT                   │
                 │ details: TEXT                  │
                 │ timestamp: TEXT                │
                 └────────────────────────────────┘
```

</div>

---

## ⚡ 5 Capabilities Powered by Google AI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               GOOGLE TECH MATRIX                                │
├────────────────────────────┬────────────────────────────────────────────────────┤
│ 1. Voice Intent Extraction │ Gemini 2.0 Flash parses regional dialects (Hindi,  │
│                            │ Tamil, Marathi, Bengali, Odia, Gujarati, etc.)     │
├────────────────────────────┼────────────────────────────────────────────────────┤
│ 2. Photo Damage Audit      │ Gemini Vision verifies broken bridges, dry pumps,  │
│                            │ and pothole severity (Anti-spam / Anti-fraud)      │
├────────────────────────────┼────────────────────────────────────────────────────┤
│ 3. Automated Policy Briefs │ Generates UN SDG-aligned intervention packages     │
│                            │ with estimated budget outlays and timelines        │
├────────────────────────────┼────────────────────────────────────────────────────┤
│ 4. What-If Budget Engine   │ AI simulates projected grievance reductions and    │
│                            │ cost-per-beneficiary for capital reallocations     │
├────────────────────────────┼────────────────────────────────────────────────────┤
│ 5. Vertex AI Demand Model  │ 12-Month AutoML Time-Series forecaster predicting   │
│                            │ seasonal infrastructure stress cascades in advance │
└────────────────────────────┴────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Clone & Install
```bash
git clone -b vikasdrishti-ai https://github.com/mukesh-dev-git/BuildWithAI-2E-26.git
cd BuildWithAI-2E-26
npm install
```

### 2. Populate the SQLite Database
Ingests 80 Indian Aspirational Districts and 80+ citizen complaints:
```bash
npm run db:seed
```

### 3. Start Frontend & Backend Concurrently
```bash
npm run dev
```

| Service | URL | Description |
|:---|:---|:---|
| **🎨 Web Application** | `http://localhost:5174/` | Full-stack interactive experience |
| **📡 REST API Health** | `http://localhost:5000/api/health` | SQLite database live statistics |
| **🏆 Live EPI Rankings** | `http://localhost:5000/api/epi` | Real-time SQL mathematical rankings |

---

## 📡 Complete REST API Reference

```http
### Check Database Health & Row Counts
GET http://localhost:5000/api/health

### Fetch All 80 Districts with Aggregated Grievance Counts
GET http://localhost:5000/api/districts?state=Rajasthan

### Fetch Grievances with Filters
GET http://localhost:5000/api/grievances?category=Water%20Supply&severity=critical

### Register a Citizen Grievance (Writes directly to SQLite)
POST http://localhost:5000/api/grievances
Content-Type: application/json

{
  "category": "Water Supply",
  "text": "हैंडपंप से दूषित पानी आ रहा है",
  "textEn": "Contaminated water from village handpump",
  "severity": "critical",
  "district": "Barmer"
}

### Community Endorsement Upvote
POST http://localhost:5000/api/grievances/GRV-001/upvote

### Live Calculated EPI Rankings
GET http://localhost:5000/api/epi

### On-Demand Database Re-seed
POST http://localhost:5000/api/seed
```

---

## 🎯 3-Minute Live Demo Pitch Script

<details open>
<summary><b>🎬 Step-by-Step Hackathon Presentation Walkthrough</b></summary>

### 1. Citizen Voice Reporting (`00:00 - 01:00`)
1. Open [`/citizen`](http://localhost:5174/citizen).
2. Click any of the **1-Click Quick Prompts** (e.g., *"💧 Water Crisis in Barmer"* or *"🛣️ Broken Road in Purnia"*).
3. Click **Submit Grievance**.
4. Point out **Gemini 2.0 Flash** performing intent extraction, urgency reasoning, and automatic sector categorization.
5. Notice the live notification toast showing the issue has been persisted to SQLite!

### 2. Decision Studio & GIS Heatmap (`01:00 - 02:00`)
1. Open [`/policymaker`](http://localhost:5174/policymaker).
2. Show that the newly logged issue is **instantly reflected** in the live dashboard metrics without page reloads.
3. Switch to **🗺️ GIS Heatmap**: Click on pulsing district markers to reveal ground-truth citizen evidence.
4. Switch to **🏆 EPI Rankings**: Click on any district card to expand the **mathematical formula audit trail**.

### 3. Predictive AI & Cabinet Policy Memo (`02:00 - 03:00`)
1. Switch to **⚡ Vertex AI Forecasting**: Highlight the 12-month AutoML predictive stress curves, showing that Barmer will reach an 86% probability of water failure by April 2027.
2. Switch to **💰 Budget Simulator**: Adjust the allocation slider by +₹50 Cr and show Gemini predicting grievance drops and job creation.
3. Click **Export Cabinet Policy Memo**: Reveal the official Government of India memorandum with executive signatures, ready to print as PDF or copy as Markdown.
4. Click **Google AI Stack** in the navbar: Demonstrate total transparency with live Gemini API key authentication and active SQLite database telemetry.

</details>

---

## 🏆 Hackathon Evaluation Alignment

| Evaluation Criteria | Weight | How VikasDrishti AI Delivers |
|:---|:---:|:---|
| **Problem Impact & Relevance** | **25%** | Bridges the linguistic divide for 700M+ citizens; aligns directly with NITI Aayog Aspirational Districts & Vikasit Bharat 2047. |
| **Technical & Google Tech** | **25%** | Native integration of **Google AI Studio (Gemini 2.0 Flash)**, **Vertex AI AutoML**, **Firebase Firestore**, and **BigQuery data models** backed by a real **SQLite WAL database**. |
| **UI/UX & Aesthetics** | **25%** | GovTech design system with dark-mode glassmorphism, responsive Leaflet GIS heatmaps, dynamic Recharts visualizations, and bilingual Hindi/English support. |
| **Feasibility & Execution** | **25%** | Zero mock-ups: production-ready build pass, complete REST API, database seed scripts, and Firebase Hosting configuration. |

---

<div align="center">

### Built with ❤️ for Digital Public Good & Vikasit Bharat 2047 🇮🇳
**Repository:** [mukesh-dev-git/BuildWithAI-2E-26](https://github.com/mukesh-dev-git/BuildWithAI-2E-26) • **Branch:** `vikasdrishti-ai`

</div>
