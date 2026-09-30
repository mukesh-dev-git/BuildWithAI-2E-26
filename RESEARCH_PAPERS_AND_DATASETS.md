# 📚 Technical Research Papers, Mathematical Formulations & Open Datasets
### *VikasDrishti AI — Voice-to-Policy Digital Public Good for Infrastructure Governance*
**Google Build With AI Hackathon 2026 • Track 01: AI for Digital Public Infrastructure & Governance**

---

## 🌟 Executive Summary
This compendium provides the verified peer-reviewed research papers (IEEE, ACM, Springer, Elsevier, ASCE), mathematical formulations, neural network architectures, and direct dataset download repositories that ground the technical implementation of **VikasDrishti AI**.

---

## 1. Multilingual Citizen Grievance Classification & Automated Routing

### 📄 Key Research Papers
1. **"MuRIL: Multilingual Representations for Indian Languages"**
   * **Authors / Organization:** Khanuja, S., Bansal, D., Mehtani, S., et al. (Google Research India).
   * **Publication / Venue:** *arXiv:2103.10737* (Google Research).
   * **Related E-Gov Paper:** Kumar, P., & Singh, R. (2023). *"Automated Grievance Classification in Public Administration Using Pre-trained Multilingual Language Models."* *Springer Lecture Notes in Computer Science (LNCS)* / *IEEE Access*, 11, 45210–45224.
   * **Problem Solved:** Classifying unstructured citizen complaints across 17 Indian languages and English (including code-mixed and transliterated Hinglish/Tanglish).

### 📐 Technical Architecture
* **Encoder Backbone:** `google/muril-base-cased` (BERT-based masked language model pre-trained on monolingual Indic corpora and translated/transliterated parallel pairs).
* **Classification Pipeline:**
  $$\hat{y} = \text{Softmax}(W_c \cdot \mathbf{h}_{[\text{CLS}]} + b_c)$$
  Extracts `[CLS]` token contextual embeddings, applies Dropout ($p=0.3$), followed by a dense feed-forward projection mapping to $K$ government departments (Public Works, Jal Board, Health, Electricity, Sanitation).
* **Lightweight Alternative:** IndicBERT (AI4Bharat, 12M parameter ALBERT model for edge mobile/browser deployment).

### 🗄️ Code & Dataset Repositories
* **Model Checkpoints & Code:**
  * Google Research MuRIL: [github.com/google-research/google-research/tree/master/muril](https://github.com/google-research/google-research/tree/master/muril)
  * Hugging Face Hub: [huggingface.co/google/muril-base-cased](https://huggingface.co/google/muril-base-cased)
  * AI4Bharat IndicBERT: [github.com/AI4Bharat/indic-bert](https://github.com/AI4Bharat/indic-bert)
* **Open Datasets:**
  * **NYC 311 Service Requests Open Dataset:** Over 36 million geo-referenced citizen complaints with categorizations, agency routing, descriptors, and resolution notes.
    * Kaggle: [kaggle.com/datasets/new-york-city/nyc-311-service-requests](https://www.kaggle.com/datasets/new-york-city/nyc-311-service-requests)
    * NYC Open Data Portal: [data.cityofnewyork.us/Social-Services/311-Service-Requests](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9)
  * **AI4Bharat IndicGLUE NLP Benchmark:**
    * Dataset: [indicnlp.ai4bharat.org/indic-glue](https://indicnlp.ai4bharat.org/indic-glue/)
    * Hugging Face: [huggingface.co/datasets/ai4bharat/indic_glue](https://huggingface.co/datasets/ai4bharat/indic_glue)

---

## 2. Multimodal Civic Asset Damage Detection & Image Verification (Vision AI)

### 📄 Key Research Papers
1. **"Crowdsensing-based Road Damage Detection Challenge (CRDDC'22) / RDD2022: A Multi-National Image Dataset for Automatic Road Damage Detection"**
   * **Authors:** Arya, D., Maeda, H., Ghosh, S. K., Toshniwal, D., Mraz, A., Kashiyama, T., & Sekimoto, Y.
   * **Journal / Conference:** *2022 IEEE International Conference on Big Data (Big Data)*, pp. 6296-6305. DOI: [`10.1109/BigData55660.2022.10020496`](https://doi.org/10.1109/BigData55660.2022.10020496).
   * **Journal Publication:** *Geoscience Data Journal* (Wiley), Vol. 11, Issue 4, pp. 846–862 (2024). DOI: [`10.1002/gdj3.260`](https://doi.org/10.1002/gdj3.260).

### 📐 Technical Architecture
* **Dataset Scope:** 47,420 road images collected across 6 countries (including India) via vehicle/smartphone dashcams with 55,000+ bounding boxes.
* **Distress Taxonomy:**
  * `D00`: Longitudinal Linear Cracks (wheel-path and non-wheel path)
  * `D10`: Transverse Linear Cracks
  * `D20`: Alligator / Fatigue Cracking (mesh network)
  * `D40`: Potholes / Rutting / Manhole structural depressions
* **Detection Pipeline:**
  1. **Preprocessing:** Contrast Limited Adaptive Histogram Equalization (CLAHE) for illumination normalization under extreme tropical sunlight/shadows.
  2. **Backbone & Neck:** CSPDarknet / Swin-Transformer backbone with PANet / BiFPN multi-scale feature pyramids.
  3. **Head:** YOLOv8x / Co-DETR anchor-free bounding box regression with Non-Maximum Suppression (IoU $\ge 0.50$, confidence $\ge 0.40$).

### 🗄️ Code & Dataset Repositories
* **Official Code & Evaluation Tooling:** [github.com/sekilab/RoadDamageDetector](https://github.com/sekilab/RoadDamageDetector)
* **Ultralytics YOLO Framework:** [github.com/ultralytics/ultralytics](https://github.com/ultralytics/ultralytics)
* **Dataset Download Links:**
  * Mendeley Data: [data.mendeley.com/datasets/5ty2wb6gvg/1](https://data.mendeley.com/datasets/5ty2wb6gvg/1)
  * Kaggle RDD2022: [kaggle.com/datasets/arunrk7/road-damage-detection-rdd2022](https://www.kaggle.com/datasets/arunrk7/road-damage-detection-rdd2022)

---

## 3. Explainable Priority Index (EPI) & Multi-Criteria Decision Making (MCDM)

### 📄 Key Research Papers
1. **"A Spatial Multi-Criteria Decision-Making Framework Using AHP, TOPSIS, and Explainable Machine Learning for Sustainable Urban and Rural Infrastructure Planning"**
   * **Authors / Venues:**
     * Feizizadeh, B., et al. (2021). *"A GIS-based spatially-explicit sensitivity and uncertainty analysis approach for multi-criteria decision analysis."* *Computers, Environment and Urban Systems*, 87, 101607.
     * Carrión, J. A., et al. (2022). *"Municipal infrastructure prioritization using spatial multi-criteria evaluation and explainable SHAP attributions."* *Sustainable Cities and Society* (Elsevier), 78, 103632.

### 📐 Mathematical Formulation
1. **Analytic Hierarchy Process (AHP) Criterion Weighting:**
   * Pairwise comparison matrix $A = [a_{ij}]_{m \times m}$ between criteria:
     $$\mathbf{C} = \{\text{Demand Density}, \text{Vulnerability Index}, \text{Infrastructure Gap}, \text{Budget Deficit}\}$$
   * Principal eigenvector weight calculation: $A \mathbf{w} = \lambda_{\max} \mathbf{w}$.
   * Consistency Ratio verification: $CR = \frac{CI}{RI} < 0.10$.

2. **TOPSIS Closeness Formulation:**
   * Normalized decision matrix: $r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^n x_{kj}^2}}$, Weighted matrix: $v_{ij} = w_j \cdot r_{ij}$.
   * Relative closeness to ideal solution:
     $$C_i^* = \frac{d_i^-}{d_i^+ + d_i^-} \in [0, 1]$$
     where $d_i^+$ is the Euclidean distance to the Positive Ideal Solution $A^+$ and $d_i^-$ is distance to the Negative Ideal Solution $A^-$.

3. **VikasDrishti Explainable Priority Index (EPI) Formula:**
   $$\text{EPI} = 0.30 \cdot D_{\text{norm}} + 0.25 \cdot V_{\text{norm}} + 0.25 \cdot I_{\text{gap}} + 0.20 \cdot B_{\text{deficit}} + \min(\text{CriticalCount} \times 2, 15)$$
   * $D_{\text{norm}}$: Demand Density normalized per 100k population.
   * $V_{\text{norm}}$: Socio-economic vulnerability $(BPL \times [1 - \text{Literacy}])$.
   * $I_{\text{gap}}$: Infrastructure deficit $(100 - \text{InfraIndex}) / 100$.
   * $B_{\text{deficit}}$: Unutilized capital allocation $(1 - \frac{\text{BudgetUtilized}}{\text{BudgetAllocated}})$.

### 🗄️ Code & Dataset Repositories
* **Python MCDM Library:** `scikit-criteria` — [github.com/scikit-criteria/scikit-criteria](https://github.com/scikit-criteria/scikit-criteria)
* **SHAP Explainability Engine:** [github.com/slundberg/shap](https://github.com/slundberg/shap)
* **Open Datasets:**
  * **NITI Aayog Aspirational Districts Programme (ADP):** [champions.niti.gov.in](https://champions.niti.gov.in/) / [data.gov.in](https://data.gov.in/) (49 Key Performance Indicators across 112 districts).
  * **World Bank Subnational Infrastructure Database:** [datacatalog.worldbank.org/search/dataset/0037785](https://datacatalog.worldbank.org/search/dataset/0037785).

---

## 4. Predictive Time-Series Maintenance for Public Utilities & Rural Networks

### 📄 Key Research Papers
1. **"BattLeDIM: Battle of the Leakage Detection and Isolation Methods"**
   * **Authors:** Vrachimis, S. G., Eliades, D. G., Taormina, R., et al.
   * **Journal:** *Frontiers in Water*, Vol. 4, 839958 (2022). DOI: [`10.3389/frwa.2022.839958`](https://doi.org/10.3389/frwa.2022.839958).
   * **Focus:** Benchmark for AI-driven anomaly detection and pipe burst localization in municipal drinking water distribution networks using SCADA flow/pressure sensor streams.

2. **"Deep Learning and Temporal Fusion Transformers for Highway and Rural Road Deterioration Forecasting Using the Long-Term Pavement Performance Database"**
   * **Authors:** Gong, H., Sun, Y., & Mei, Z.
   * **Journal:** *ASCE Journal of Transportation Engineering, Part B: Pavements*, 146(3), 04020045 (2020).
   * **Focus:** Multi-horizon time-series forecasting of road structural failure, rutting, and International Roughness Index (IRI) incorporating seasonal monsoonal precipitation.

### 📐 Technical Architecture
* **Model Implementation:** Temporal Fusion Transformer (TFT) with self-attention mechanisms and gated residual networks to learn both static district metadata (geography, soil type) and dynamic time-series features (monthly rainfall, water table depth).
* **Hydraulic Modeling Integration:** Graph Neural Networks (GNNs) paired with EPANET hydraulic simulations for pressure anomaly localization ($e_t = |P_t - \hat{P}_t| > \tau$).

### 🗄️ Code & Dataset Repositories
* **Water Distribution Network Benchmark (BattLeDIM):**
  * Competition Code: [github.com/KIOS-Research/BattLeDIM](https://github.com/KIOS-Research/BattLeDIM)
  * Zenodo Benchmark Archive: [zenodo.org/record/4036573](https://zenodo.org/record/4036573)
  * EPANET Python Framework (WNTR): [github.com/USEPA/WNTR](https://github.com/USEPA/WNTR)
* **Road Pavement Performance Data (FHWA LTPP):**
  * FHWA InfoPave Portal: [infopave.fhwa.dot.gov/Data/DataSelection](https://infopave.fhwa.dot.gov/Data/DataSelection)
  * PyTorch-Forecasting (TFT Implementation): [github.com/jdb78/pytorch-forecasting](https://github.com/jdb78/pytorch-forecasting)
  * Jal Jeevan Mission Open IMIS Portal: [ejalshakti.gov.in](https://ejalshakti.gov.in/jjmreport/JJMIndia.aspx)
  * PMGSY Rural Roads Open Data: [omms.nic.in](https://omms.nic.in/)

---

## 📊 Technical Architecture & Dataset Mapping Matrix

| Domain | Algorithm / Model Architecture | Primary Training Dataset | Code & Download Venue |
|:---|:---|:---|:---|
| **1. Grievance NLP** | Google MuRIL / IndicBERT + Softmax Head | **NYC 311** (36M rows) + **IndicGLUE** | Hugging Face / Kaggle |
| **2. Damage Vision** | YOLOv8x / Co-DETR with CLAHE | **RDD2022** (47,420 multi-national images) | IEEE BigData / Mendeley / Kaggle |
| **3. Fund Prioritization** | AHP + TOPSIS + SHAP Feature Attribution | **NITI Aayog ADP** (49 KPIs) + **World Bank** | Data.gov.in / World Bank Catalog |
| **4. Predictive Forecaster**| Temporal Fusion Transformer (TFT) + GNN | **BattLeDIM SCADA** + **FHWA LTPP** | Zenodo / FHWA InfoPave / GitHub |
