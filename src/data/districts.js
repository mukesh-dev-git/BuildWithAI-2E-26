// VikasDrishti AI — District Demographics & Infrastructure Data
// Modeled after NITI Aayog Aspirational Districts + Census data

const districtData = [
  // Maharashtra
  { district: "Pune", state: "Maharashtra", population: 9426959, bplRatio: 0.12, literacyRate: 0.87, infraIndex: 72, waterCoverage: 78, roadDensity: 68, healthFacilities: 85, schoolDensity: 79, electrification: 96, budgetAllocated: 2400, budgetUtilized: 1820, lat: 18.5204, lng: 73.8567, sdgScore: 71 },
  { district: "Nagpur", state: "Maharashtra", population: 4653570, bplRatio: 0.18, literacyRate: 0.89, infraIndex: 68, waterCoverage: 72, roadDensity: 65, healthFacilities: 78, schoolDensity: 75, electrification: 94, budgetAllocated: 1800, budgetUtilized: 1340, lat: 21.1458, lng: 79.0882, sdgScore: 67 },
  { district: "Mumbai", state: "Maharashtra", population: 12442373, bplRatio: 0.15, literacyRate: 0.90, infraIndex: 78, waterCoverage: 85, roadDensity: 82, healthFacilities: 88, schoolDensity: 82, electrification: 99, budgetAllocated: 5200, budgetUtilized: 4100, lat: 19.076, lng: 72.8777, sdgScore: 74 },
  { district: "Wardha", state: "Maharashtra", population: 1296456, bplRatio: 0.22, literacyRate: 0.83, infraIndex: 58, waterCoverage: 62, roadDensity: 55, healthFacilities: 65, schoolDensity: 68, electrification: 89, budgetAllocated: 650, budgetUtilized: 380, lat: 20.7453, lng: 78.6022, sdgScore: 56 },
  { district: "Amravati", state: "Maharashtra", population: 2887826, bplRatio: 0.25, literacyRate: 0.82, infraIndex: 55, waterCoverage: 58, roadDensity: 52, healthFacilities: 62, schoolDensity: 65, electrification: 88, budgetAllocated: 980, budgetUtilized: 520, lat: 20.9374, lng: 77.7796, sdgScore: 53 },
  { district: "Nandurbar", state: "Maharashtra", population: 1646177, bplRatio: 0.42, literacyRate: 0.64, infraIndex: 35, waterCoverage: 38, roadDensity: 32, healthFacilities: 42, schoolDensity: 45, electrification: 72, budgetAllocated: 1200, budgetUtilized: 340, lat: 21.3685, lng: 74.2603, sdgScore: 34 },

  // Uttar Pradesh
  { district: "Bahraich", state: "Uttar Pradesh", population: 3478821, bplRatio: 0.52, literacyRate: 0.49, infraIndex: 28, waterCoverage: 32, roadDensity: 25, healthFacilities: 35, schoolDensity: 38, electrification: 65, budgetAllocated: 1500, budgetUtilized: 320, lat: 27.5744, lng: 81.5959, sdgScore: 27 },
  { district: "Shravasti", state: "Uttar Pradesh", population: 1114615, bplRatio: 0.58, literacyRate: 0.46, infraIndex: 22, waterCoverage: 25, roadDensity: 20, healthFacilities: 28, schoolDensity: 32, electrification: 58, budgetAllocated: 1100, budgetUtilized: 180, lat: 27.5067, lng: 82.0954, sdgScore: 21 },
  { district: "Balrampur", state: "Uttar Pradesh", population: 2148066, bplRatio: 0.48, literacyRate: 0.50, infraIndex: 30, waterCoverage: 28, roadDensity: 26, healthFacilities: 32, schoolDensity: 35, electrification: 62, budgetAllocated: 980, budgetUtilized: 210, lat: 27.4307, lng: 82.1803, sdgScore: 29 },
  { district: "Sonbhadra", state: "Uttar Pradesh", population: 1862559, bplRatio: 0.45, literacyRate: 0.58, infraIndex: 32, waterCoverage: 35, roadDensity: 28, healthFacilities: 38, schoolDensity: 40, electrification: 70, budgetAllocated: 890, budgetUtilized: 250, lat: 24.6882, lng: 83.0631, sdgScore: 31 },
  { district: "Sitapur", state: "Uttar Pradesh", population: 4474446, bplRatio: 0.38, literacyRate: 0.55, infraIndex: 38, waterCoverage: 40, roadDensity: 35, healthFacilities: 42, schoolDensity: 45, electrification: 74, budgetAllocated: 1400, budgetUtilized: 520, lat: 27.5655, lng: 80.684, sdgScore: 37 },
  { district: "Mirzapur", state: "Uttar Pradesh", population: 2496970, bplRatio: 0.40, literacyRate: 0.62, infraIndex: 35, waterCoverage: 38, roadDensity: 30, healthFacilities: 40, schoolDensity: 42, electrification: 72, budgetAllocated: 1100, budgetUtilized: 380, lat: 25.1337, lng: 82.5694, sdgScore: 34 },
  { district: "Lucknow", state: "Uttar Pradesh", population: 4589838, bplRatio: 0.15, literacyRate: 0.80, infraIndex: 72, waterCoverage: 78, roadDensity: 75, healthFacilities: 82, schoolDensity: 78, electrification: 95, budgetAllocated: 3200, budgetUtilized: 2400, lat: 26.8467, lng: 80.9462, sdgScore: 68 },
  { district: "Gorakhpur", state: "Uttar Pradesh", population: 4436275, bplRatio: 0.35, literacyRate: 0.65, infraIndex: 42, waterCoverage: 45, roadDensity: 38, healthFacilities: 48, schoolDensity: 50, electrification: 78, budgetAllocated: 1600, budgetUtilized: 620, lat: 26.7606, lng: 83.3732, sdgScore: 41 },
  { district: "Varanasi", state: "Uttar Pradesh", population: 3676841, bplRatio: 0.28, literacyRate: 0.72, infraIndex: 55, waterCoverage: 58, roadDensity: 52, healthFacilities: 60, schoolDensity: 62, electrification: 85, budgetAllocated: 2100, budgetUtilized: 1200, lat: 25.3176, lng: 82.9739, sdgScore: 52 },

  // Tamil Nadu
  { district: "Ramanathapuram", state: "Tamil Nadu", population: 1337560, bplRatio: 0.28, literacyRate: 0.78, infraIndex: 48, waterCoverage: 52, roadDensity: 45, healthFacilities: 55, schoolDensity: 58, electrification: 88, budgetAllocated: 720, budgetUtilized: 380, lat: 9.3639, lng: 78.8395, sdgScore: 47 },
  { district: "Virudhunagar", state: "Tamil Nadu", population: 1942288, bplRatio: 0.22, literacyRate: 0.82, infraIndex: 55, waterCoverage: 48, roadDensity: 52, healthFacilities: 62, schoolDensity: 65, electrification: 92, budgetAllocated: 850, budgetUtilized: 480, lat: 9.5852, lng: 77.9526, sdgScore: 54 },
  { district: "Sivaganga", state: "Tamil Nadu", population: 1339101, bplRatio: 0.25, literacyRate: 0.80, infraIndex: 50, waterCoverage: 55, roadDensity: 48, healthFacilities: 58, schoolDensity: 62, electrification: 90, budgetAllocated: 680, budgetUtilized: 420, lat: 10.1474, lng: 78.4851, sdgScore: 49 },
  { district: "Ariyalur", state: "Tamil Nadu", population: 754894, bplRatio: 0.30, literacyRate: 0.72, infraIndex: 42, waterCoverage: 45, roadDensity: 40, healthFacilities: 48, schoolDensity: 52, electrification: 85, budgetAllocated: 520, budgetUtilized: 240, lat: 11.1362, lng: 79.0767, sdgScore: 41 },
  { district: "Dharmapuri", state: "Tamil Nadu", population: 1502900, bplRatio: 0.32, literacyRate: 0.68, infraIndex: 40, waterCoverage: 42, roadDensity: 38, healthFacilities: 45, schoolDensity: 48, electrification: 84, budgetAllocated: 680, budgetUtilized: 280, lat: 12.1211, lng: 78.1582, sdgScore: 39 },

  // Rajasthan
  { district: "Barmer", state: "Rajasthan", population: 2603751, bplRatio: 0.45, literacyRate: 0.56, infraIndex: 28, waterCoverage: 22, roadDensity: 25, healthFacilities: 32, schoolDensity: 35, electrification: 68, budgetAllocated: 1400, budgetUtilized: 380, lat: 25.7521, lng: 71.3967, sdgScore: 27 },
  { district: "Jaisalmer", state: "Rajasthan", population: 669919, bplRatio: 0.38, literacyRate: 0.58, infraIndex: 32, waterCoverage: 28, roadDensity: 22, healthFacilities: 35, schoolDensity: 38, electrification: 72, budgetAllocated: 560, budgetUtilized: 210, lat: 26.9157, lng: 70.9083, sdgScore: 31 },
  { district: "Dungarpur", state: "Rajasthan", population: 1388552, bplRatio: 0.50, literacyRate: 0.60, infraIndex: 30, waterCoverage: 32, roadDensity: 28, healthFacilities: 35, schoolDensity: 40, electrification: 70, budgetAllocated: 850, budgetUtilized: 260, lat: 23.8438, lng: 73.7145, sdgScore: 29 },

  // Bihar
  { district: "Araria", state: "Bihar", population: 2806200, bplRatio: 0.55, literacyRate: 0.52, infraIndex: 22, waterCoverage: 25, roadDensity: 18, healthFacilities: 28, schoolDensity: 32, electrification: 55, budgetAllocated: 1200, budgetUtilized: 240, lat: 26.1486, lng: 87.5149, sdgScore: 21 },
  { district: "Bhagalpur", state: "Bihar", population: 3032226, bplRatio: 0.42, literacyRate: 0.62, infraIndex: 35, waterCoverage: 38, roadDensity: 30, healthFacilities: 42, schoolDensity: 45, electrification: 68, budgetAllocated: 1100, budgetUtilized: 380, lat: 25.2425, lng: 86.9842, sdgScore: 34 },
  { district: "Kishanganj", state: "Bihar", population: 1690400, bplRatio: 0.58, literacyRate: 0.45, infraIndex: 18, waterCoverage: 20, roadDensity: 15, healthFacilities: 22, schoolDensity: 28, electrification: 48, budgetAllocated: 980, budgetUtilized: 150, lat: 26.0938, lng: 87.9473, sdgScore: 17 },
  { district: "Purnia", state: "Bihar", population: 3264619, bplRatio: 0.48, literacyRate: 0.52, infraIndex: 25, waterCoverage: 28, roadDensity: 22, healthFacilities: 32, schoolDensity: 35, electrification: 58, budgetAllocated: 1300, budgetUtilized: 320, lat: 25.7771, lng: 87.4753, sdgScore: 24 },

  // Madhya Pradesh
  { district: "Damoh", state: "Madhya Pradesh", population: 1263703, bplRatio: 0.38, literacyRate: 0.64, infraIndex: 38, waterCoverage: 42, roadDensity: 35, healthFacilities: 42, schoolDensity: 48, electrification: 78, budgetAllocated: 680, budgetUtilized: 280, lat: 23.836, lng: 79.4425, sdgScore: 37 },
  { district: "Tikamgarh", state: "Madhya Pradesh", population: 1444920, bplRatio: 0.42, literacyRate: 0.60, infraIndex: 32, waterCoverage: 35, roadDensity: 28, healthFacilities: 38, schoolDensity: 42, electrification: 72, budgetAllocated: 780, budgetUtilized: 220, lat: 24.7434, lng: 78.8307, sdgScore: 31 },
  { district: "Sagar", state: "Madhya Pradesh", population: 2378295, bplRatio: 0.32, literacyRate: 0.70, infraIndex: 45, waterCoverage: 48, roadDensity: 42, healthFacilities: 52, schoolDensity: 55, electrification: 82, budgetAllocated: 1100, budgetUtilized: 520, lat: 23.8388, lng: 78.7378, sdgScore: 44 },

  // West Bengal
  { district: "North 24 Parganas", state: "West Bengal", population: 10009781, bplRatio: 0.22, literacyRate: 0.78, infraIndex: 58, waterCoverage: 62, roadDensity: 55, healthFacilities: 65, schoolDensity: 68, electrification: 90, budgetAllocated: 3200, budgetUtilized: 1800, lat: 22.6174, lng: 88.4233, sdgScore: 56 },
  { district: "Howrah", state: "West Bengal", population: 4841638, bplRatio: 0.18, literacyRate: 0.82, infraIndex: 62, waterCoverage: 68, roadDensity: 62, healthFacilities: 72, schoolDensity: 72, electrification: 92, budgetAllocated: 2100, budgetUtilized: 1400, lat: 22.5958, lng: 88.2636, sdgScore: 60 },
  { district: "Murshidabad", state: "West Bengal", population: 7102430, bplRatio: 0.38, literacyRate: 0.66, infraIndex: 35, waterCoverage: 38, roadDensity: 32, healthFacilities: 42, schoolDensity: 45, electrification: 75, budgetAllocated: 2400, budgetUtilized: 680, lat: 24.1694, lng: 88.2716, sdgScore: 34 },

  // Karnataka
  { district: "Raichur", state: "Karnataka", population: 1924773, bplRatio: 0.38, literacyRate: 0.60, infraIndex: 35, waterCoverage: 38, roadDensity: 32, healthFacilities: 40, schoolDensity: 45, electrification: 78, budgetAllocated: 880, budgetUtilized: 320, lat: 16.2076, lng: 77.356, sdgScore: 34 },
  { district: "Yadgir", state: "Karnataka", population: 1172789, bplRatio: 0.48, literacyRate: 0.52, infraIndex: 25, waterCoverage: 28, roadDensity: 22, healthFacilities: 30, schoolDensity: 35, electrification: 72, budgetAllocated: 920, budgetUtilized: 210, lat: 16.77, lng: 77.1375, sdgScore: 24 },

  // Telangana
  { district: "Mahbubnagar", state: "Telangana", population: 4042191, bplRatio: 0.32, literacyRate: 0.62, infraIndex: 42, waterCoverage: 45, roadDensity: 38, healthFacilities: 48, schoolDensity: 52, electrification: 82, budgetAllocated: 1400, budgetUtilized: 620, lat: 16.7488, lng: 77.9857, sdgScore: 41 },

  // Odisha
  { district: "Ganjam", state: "Odisha", population: 3520151, bplRatio: 0.35, literacyRate: 0.68, infraIndex: 42, waterCoverage: 45, roadDensity: 38, healthFacilities: 48, schoolDensity: 52, electrification: 80, budgetAllocated: 1500, budgetUtilized: 580, lat: 19.3876, lng: 85.0534, sdgScore: 41 },
  { district: "Koraput", state: "Odisha", population: 1376934, bplRatio: 0.55, literacyRate: 0.50, infraIndex: 22, waterCoverage: 25, roadDensity: 18, healthFacilities: 28, schoolDensity: 32, electrification: 58, budgetAllocated: 1100, budgetUtilized: 210, lat: 18.8135, lng: 82.7127, sdgScore: 21 },
  { district: "Malkangiri", state: "Odisha", population: 612727, bplRatio: 0.62, literacyRate: 0.42, infraIndex: 18, waterCoverage: 20, roadDensity: 12, healthFacilities: 22, schoolDensity: 25, electrification: 48, budgetAllocated: 850, budgetUtilized: 120, lat: 18.3502, lng: 81.9, sdgScore: 17 },
  { district: "Kalahandi", state: "Odisha", population: 1573054, bplRatio: 0.52, literacyRate: 0.52, infraIndex: 25, waterCoverage: 28, roadDensity: 20, healthFacilities: 32, schoolDensity: 35, electrification: 62, budgetAllocated: 980, budgetUtilized: 240, lat: 19.9065, lng: 83.1683, sdgScore: 24 },
  { district: "Mayurbhanj", state: "Odisha", population: 2513895, bplRatio: 0.48, literacyRate: 0.54, infraIndex: 28, waterCoverage: 30, roadDensity: 25, healthFacilities: 35, schoolDensity: 38, electrification: 65, budgetAllocated: 1200, budgetUtilized: 340, lat: 21.9366, lng: 86.7281, sdgScore: 27 },

  // Gujarat
  { district: "Kutch", state: "Gujarat", population: 2090313, bplRatio: 0.28, literacyRate: 0.69, infraIndex: 45, waterCoverage: 35, roadDensity: 38, healthFacilities: 48, schoolDensity: 52, electrification: 82, budgetAllocated: 1800, budgetUtilized: 920, lat: 23.7337, lng: 69.8597, sdgScore: 44 },

  // Jharkhand
  { district: "Dumka", state: "Jharkhand", population: 1321096, bplRatio: 0.48, literacyRate: 0.56, infraIndex: 28, waterCoverage: 30, roadDensity: 25, healthFacilities: 35, schoolDensity: 38, electrification: 65, budgetAllocated: 780, budgetUtilized: 210, lat: 24.2631, lng: 87.2497, sdgScore: 27 },
  { district: "Pakur", state: "Jharkhand", population: 899200, bplRatio: 0.55, literacyRate: 0.48, infraIndex: 22, waterCoverage: 25, roadDensity: 18, healthFacilities: 28, schoolDensity: 30, electrification: 55, budgetAllocated: 680, budgetUtilized: 120, lat: 24.6364, lng: 87.8432, sdgScore: 21 },

  // Assam
  { district: "Dhubri", state: "Assam", population: 1948632, bplRatio: 0.45, literacyRate: 0.58, infraIndex: 28, waterCoverage: 32, roadDensity: 22, healthFacilities: 35, schoolDensity: 38, electrification: 62, budgetAllocated: 880, budgetUtilized: 220, lat: 26.0224, lng: 89.9753, sdgScore: 27 },
  { district: "Barpeta", state: "Assam", population: 1693190, bplRatio: 0.38, literacyRate: 0.64, infraIndex: 35, waterCoverage: 38, roadDensity: 30, healthFacilities: 42, schoolDensity: 45, electrification: 72, budgetAllocated: 780, budgetUtilized: 320, lat: 26.3213, lng: 91.0053, sdgScore: 34 },

  // Chhattisgarh
  { district: "Bastar", state: "Chhattisgarh", population: 1302253, bplRatio: 0.55, literacyRate: 0.54, infraIndex: 22, waterCoverage: 25, roadDensity: 18, healthFacilities: 28, schoolDensity: 30, electrification: 55, budgetAllocated: 980, budgetUtilized: 180, lat: 19.1071, lng: 81.9535, sdgScore: 21 },
  { district: "Dantewada", state: "Chhattisgarh", population: 283479, bplRatio: 0.62, literacyRate: 0.42, infraIndex: 15, waterCoverage: 18, roadDensity: 12, healthFacilities: 20, schoolDensity: 22, electrification: 45, budgetAllocated: 750, budgetUtilized: 100, lat: 18.8976, lng: 81.3489, sdgScore: 14 },

  // Kerala
  { district: "Wayanad", state: "Kerala", population: 817420, bplRatio: 0.15, literacyRate: 0.89, infraIndex: 68, waterCoverage: 72, roadDensity: 65, healthFacilities: 78, schoolDensity: 82, electrification: 96, budgetAllocated: 620, budgetUtilized: 480, lat: 11.6854, lng: 76.132, sdgScore: 67 },
  { district: "Idukki", state: "Kerala", population: 1108974, bplRatio: 0.12, literacyRate: 0.92, infraIndex: 72, waterCoverage: 75, roadDensity: 58, healthFacilities: 80, schoolDensity: 85, electrification: 97, budgetAllocated: 580, budgetUtilized: 420, lat: 9.8494, lng: 76.9718, sdgScore: 71 },
  { district: "Kasaragod", state: "Kerala", population: 1302600, bplRatio: 0.18, literacyRate: 0.86, infraIndex: 62, waterCoverage: 68, roadDensity: 60, healthFacilities: 72, schoolDensity: 78, electrification: 94, budgetAllocated: 560, budgetUtilized: 380, lat: 12.4996, lng: 74.989, sdgScore: 61 },

  // Uttarakhand
  { district: "Chamoli", state: "Uttarakhand", population: 391114, bplRatio: 0.22, literacyRate: 0.78, infraIndex: 42, waterCoverage: 45, roadDensity: 25, healthFacilities: 48, schoolDensity: 55, electrification: 82, budgetAllocated: 450, budgetUtilized: 220, lat: 30.4031, lng: 79.3215, sdgScore: 41 },
  { district: "Pithoragarh", state: "Uttarakhand", population: 483439, bplRatio: 0.25, literacyRate: 0.80, infraIndex: 45, waterCoverage: 48, roadDensity: 28, healthFacilities: 52, schoolDensity: 58, electrification: 85, budgetAllocated: 420, budgetUtilized: 240, lat: 29.5829, lng: 80.2181, sdgScore: 44 },
  { district: "Bageshwar", state: "Uttarakhand", population: 259840, bplRatio: 0.28, literacyRate: 0.76, infraIndex: 38, waterCoverage: 42, roadDensity: 22, healthFacilities: 45, schoolDensity: 52, electrification: 78, budgetAllocated: 320, budgetUtilized: 160, lat: 29.8385, lng: 79.7714, sdgScore: 37 },

  // Haryana
  { district: "Mewat", state: "Haryana", population: 1089263, bplRatio: 0.42, literacyRate: 0.56, infraIndex: 32, waterCoverage: 35, roadDensity: 38, healthFacilities: 38, schoolDensity: 42, electrification: 78, budgetAllocated: 620, budgetUtilized: 180, lat: 27.8833, lng: 76.9984, sdgScore: 31 },
];

export default districtData;
