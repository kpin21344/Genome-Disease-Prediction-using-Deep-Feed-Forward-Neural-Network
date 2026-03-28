import type { PatientInput, PredictionResult } from "./predictionEngine";

// Set this to your deployed backend URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function predictFromAPI(input: PatientInput): Promise<PredictionResult> {
  const response = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

export async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return false;
    const data = await response.json();
    return data.disorder_model_loaded && data.subclass_model_loaded;
  } catch {
    return false;
  }
}
