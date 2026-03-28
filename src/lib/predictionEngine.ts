// Simulated prediction engine based on the MLP model's feature importances
// In production, this would call a backend API serving the trained model

export interface PatientInput {
  maternalAge: number;
  paternalAge: number;
  bloodCellCount: number;
  whiteBloodCellCount: number;
  bloodTestResult: string;
  birthDefects: string;
  symptom1: string;
  symptom2: string;
  symptom3: string;
  symptom4: string;
  symptom5: string;
  respiratoryRate: number;
  heartRate: number;
  gender: string;
  birthAsphyxia: string;
  folicAcidSupplement: string;
  maternalIllness: string;
  radiationExposure: string;
  substanceAbuse: string;
  assistedConception: string;
  historyOfAnomalies: string;
  numberOfPreviousAbortions: number;
  parentalConsent: string;
}

export interface PredictionResult {
  geneticDisorder: string;
  disorderSubclass: string;
  confidence: number;
  riskFactors: { factor: string; impact: number; category: string }[];
  classDistribution: { name: string; probability: number }[];
  subclassDistribution: { name: string; probability: number }[];
}

const GENETIC_DISORDERS = [
  "Mitochondrial genetic inheritance disorders",
  "Multifactorial genetic inheritance disorders",
  "Single-gene inheritance diseases",
];

const DISORDER_SUBCLASSES: Record<string, string[]> = {
  "Mitochondrial genetic inheritance disorders": [
    "Leigh syndrome",
    "Mitochondrial myopathy",
    "Leber's hereditary optic neuropathy",
  ],
  "Multifactorial genetic inheritance disorders": [
    "Diabetes",
    "Alzheimer's",
    "Cancer",
  ],
  "Single-gene inheritance diseases": [
    "Cystic fibrosis",
    "Hemochromatosis",
    "Tay-Sachs",
    "Sickle cell anemia",
  ],
};

function hashInput(input: PatientInput): number {
  const str = JSON.stringify(input);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function predict(input: PatientInput): PredictionResult {
  const seed = hashInput(input);
  const rand = seededRandom(seed);

  // Calculate risk score based on important features
  let riskScore = 0;
  const riskFactors: PredictionResult["riskFactors"] = [];

  // Blood test result - highest importance
  if (input.bloodTestResult === "Abnormal") {
    riskScore += 30;
    riskFactors.push({ factor: "Abnormal Blood Test", impact: 0.92, category: "Critical" });
  } else if (input.bloodTestResult === "Slightly Abnormal") {
    riskScore += 15;
    riskFactors.push({ factor: "Slightly Abnormal Blood Test", impact: 0.55, category: "Moderate" });
  }

  // Birth defects
  if (input.birthDefects === "Yes") {
    riskScore += 25;
    riskFactors.push({ factor: "Birth Defects Present", impact: 0.88, category: "Critical" });
  }

  // Symptoms
  const symptoms = [input.symptom1, input.symptom2, input.symptom3, input.symptom4, input.symptom5];
  const severeSymptoms = symptoms.filter(s => s && s !== "None").length;
  if (severeSymptoms >= 3) {
    riskScore += 20;
    riskFactors.push({ factor: `${severeSymptoms} Active Symptoms`, impact: 0.78, category: "High" });
  } else if (severeSymptoms >= 1) {
    riskScore += 10;
    riskFactors.push({ factor: `${severeSymptoms} Active Symptom(s)`, impact: 0.45, category: "Moderate" });
  }

  // Maternal age
  if (input.maternalAge > 35 || input.maternalAge < 20) {
    riskScore += 12;
    riskFactors.push({ factor: "Maternal Age Risk", impact: 0.65, category: "High" });
  }

  // Paternal age
  if (input.paternalAge > 40) {
    riskScore += 8;
    riskFactors.push({ factor: "Advanced Paternal Age", impact: 0.52, category: "Moderate" });
  }

  // History
  if (input.historyOfAnomalies === "Yes") {
    riskScore += 18;
    riskFactors.push({ factor: "History of Anomalies", impact: 0.82, category: "Critical" });
  }

  if (input.radiationExposure === "Yes") {
    riskScore += 14;
    riskFactors.push({ factor: "Radiation Exposure", impact: 0.7, category: "High" });
  }

  if (input.substanceAbuse === "Yes") {
    riskScore += 12;
    riskFactors.push({ factor: "Substance Abuse", impact: 0.62, category: "High" });
  }

  if (input.maternalIllness === "Yes") {
    riskScore += 10;
    riskFactors.push({ factor: "Maternal Illness", impact: 0.58, category: "Moderate" });
  }

  if (input.birthAsphyxia === "Yes") {
    riskScore += 10;
    riskFactors.push({ factor: "Birth Asphyxia", impact: 0.55, category: "Moderate" });
  }

  if (input.numberOfPreviousAbortions > 1) {
    riskScore += 8;
    riskFactors.push({ factor: "Multiple Previous Abortions", impact: 0.48, category: "Moderate" });
  }

  // Vital signs
  if (input.bloodCellCount < 3.5 || input.bloodCellCount > 5.5) {
    riskScore += 6;
    riskFactors.push({ factor: "Abnormal Blood Cell Count", impact: 0.42, category: "Moderate" });
  }

  if (input.heartRate < 60 || input.heartRate > 100) {
    riskScore += 4;
    riskFactors.push({ factor: "Irregular Heart Rate", impact: 0.35, category: "Low" });
  }

  // Sort risk factors by impact
  riskFactors.sort((a, b) => b.impact - a.impact);

  // Determine disorder index based on risk score + deterministic randomness
  const r = rand();
  let disorderIdx: number;
  if (riskScore > 60) {
    disorderIdx = r < 0.5 ? 2 : r < 0.8 ? 0 : 1;
  } else if (riskScore > 30) {
    disorderIdx = r < 0.4 ? 1 : r < 0.75 ? 0 : 2;
  } else {
    disorderIdx = r < 0.5 ? 1 : r < 0.8 ? 0 : 2;
  }

  const disorder = GENETIC_DISORDERS[disorderIdx];
  const subclasses = DISORDER_SUBCLASSES[disorder];
  const subIdx = Math.floor(rand() * subclasses.length);
  const subclass = subclasses[subIdx];

  // Generate probability distributions
  const confidence = Math.min(0.95, 0.55 + (riskScore / 200) + rand() * 0.1);

  const classDistribution = GENETIC_DISORDERS.map((name, i) => {
    if (i === disorderIdx) return { name, probability: confidence };
    return { name, probability: (1 - confidence) / 2 + (rand() * 0.05 - 0.025) };
  });

  // Normalize
  const total = classDistribution.reduce((s, c) => s + c.probability, 0);
  classDistribution.forEach(c => c.probability = c.probability / total);

  const subclassDistribution = subclasses.map((name, i) => {
    const subConf = i === subIdx ? 0.5 + rand() * 0.3 : rand() * 0.25;
    return { name, probability: subConf };
  });
  const subTotal = subclassDistribution.reduce((s, c) => s + c.probability, 0);
  subclassDistribution.forEach(c => c.probability = c.probability / subTotal);

  return {
    geneticDisorder: disorder,
    disorderSubclass: subclass,
    confidence,
    riskFactors,
    classDistribution,
    subclassDistribution,
  };
}
