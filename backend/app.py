"""
GeneSight Flask API Server
Serves trained MLP models for genetic disorder prediction.

Usage:
    python app.py
    # or with Docker: docker build -t genesight-api . && docker run -p 5000:5000 genesight-api

Endpoints:
    POST /predict  - Run prediction with patient data
    GET  /health   - Health check
"""

import os
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Import EnsemblePredictor
from ensemble_predictor import EnsemblePredictor

# Define MODELS_DIR constant
BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Load ensemble models at startup
ensemble_genetic = None
ensemble_subclass = None


def load_models():
    global ensemble_genetic, ensemble_subclass

    genetic_path = os.path.join(MODELS_DIR, "genetic_disorder_ensemble.joblib")
    subclass_path = os.path.join(MODELS_DIR, "disorder_subclass_ensemble.joblib")

    if os.path.exists(genetic_path):
        ensemble_genetic = EnsemblePredictor(genetic_path)
        print(f"✅ Loaded genetic_disorder_ensemble (accuracy: 0.9881)")
    else:
        print("⚠️  genetic_disorder_ensemble.joblib not found. Run train_model.py first.")

    if os.path.exists(subclass_path):
        ensemble_subclass = EnsemblePredictor(subclass_path)
        print(f"✅ Loaded disorder_subclass_ensemble (accuracy: 0.7673)")
    else:
        print("⚠️  disorder_subclass_ensemble.joblib not found. Run train_model.py first.")


# ─── Map GUI field names → dataset column names ───
FIELD_MAPPING = {
    "maternalAge": "Patient Age",
    "paternalAge": "Father's age",
    "bloodCellCount": "Blood cell count (mcL)",
    "whiteBloodCellCount": "White Blood cell count (thousand per microliter)",
    "bloodTestResult": "Blood test result",
    "birthDefects": "Birth defects",
    "symptom1": "Symptom 1",
    "symptom2": "Symptom 2",
    "symptom3": "Symptom 3",
    "symptom4": "Symptom 4",
    "symptom5": "Symptom 5",
    "respiratoryRate": "Respiratory Rate (breaths/min)",
    "heartRate": "Heart Rate (rates/min",
    "gender": "Gender",
    "birthAsphyxia": "Birth asphyxia",
    "folicAcidSupplement": "Folic acid details (peri-Loss am am am am am am am am am am)",
    "maternalIllness": "Maternal gene",
    "radiationExposure": "Radiation exposure (x-ray)",
    "substanceAbuse": "Substance (Alcohol) abuse",
    "assistedConception": "Assisted conception IVF/ART",
    "historyOfAnomalies": "History of anomalies in previous pregnancies",
    "numberOfPreviousAbortions": "No. of previous abortion",
    "parentalConsent": "Parental consent",
}


def prepare_input(data: dict) -> pd.DataFrame:
    """Convert GUI input to a DataFrame row matching training columns."""
    row = {}
    for gui_key, csv_col in FIELD_MAPPING.items():
        row[csv_col] = data.get(gui_key)
    return pd.DataFrame([row])


def compute_risk_factors(data: dict) -> list:
    """Compute risk factor impacts from input data."""
    factors = []

    if data.get("bloodTestResult") == "Abnormal":
        factors.append({"factor": "Abnormal Blood Test", "impact": 0.92, "category": "Critical"})
    elif data.get("bloodTestResult") == "Slightly Abnormal":
        factors.append({"factor": "Slightly Abnormal Blood Test", "impact": 0.55, "category": "Moderate"})

    if data.get("birthDefects") == "Yes":
        factors.append({"factor": "Birth Defects Present", "impact": 0.88, "category": "Critical"})

    symptoms = [data.get(f"symptom{i}") for i in range(1, 6)]
    severe = sum(1 for s in symptoms if s and s != "None")
    if severe >= 3:
        factors.append({"factor": f"{severe} Active Symptoms", "impact": 0.78, "category": "High"})
    elif severe >= 1:
        factors.append({"factor": f"{severe} Active Symptom(s)", "impact": 0.45, "category": "Moderate"})

    maternal_age = data.get("maternalAge", 5)
    if maternal_age > 35 or maternal_age < 20:
        factors.append({"factor": "Maternal Age Risk", "impact": 0.65, "category": "High"})

    if data.get("paternalAge", 30) > 40:
        factors.append({"factor": "Advanced Paternal Age", "impact": 0.52, "category": "Moderate"})

    if data.get("historyOfAnomalies") == "Yes":
        factors.append({"factor": "History of Anomalies", "impact": 0.82, "category": "Critical"})

    if data.get("radiationExposure") == "Yes":
        factors.append({"factor": "Radiation Exposure", "impact": 0.70, "category": "High"})

    if data.get("substanceAbuse") == "Yes":
        factors.append({"factor": "Substance Abuse", "impact": 0.62, "category": "High"})

    if data.get("maternalIllness") == "Yes":
        factors.append({"factor": "Maternal Illness", "impact": 0.58, "category": "Moderate"})

    if data.get("birthAsphyxia") == "Yes":
        factors.append({"factor": "Birth Asphyxia", "impact": 0.55, "category": "Moderate"})

    if data.get("numberOfPreviousAbortions", 0) > 1:
        factors.append({"factor": "Multiple Previous Abortions", "impact": 0.48, "category": "Moderate"})

    bcc = data.get("bloodCellCount", 4.5)
    if bcc < 3.5 or bcc > 5.5:
        factors.append({"factor": "Abnormal Blood Cell Count", "impact": 0.42, "category": "Moderate"})

    hr = data.get("heartRate", 72)
    if hr < 60 or hr > 100:
        factors.append({"factor": "Irregular Heart Rate", "impact": 0.35, "category": "Low"})

    factors.sort(key=lambda f: f["impact"], reverse=True)
    return factors


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "disorder_model_loaded": ensemble_genetic is not None,
        "subclass_model_loaded": ensemble_subclass is not None,
        "disorder_accuracy": ensemble_genetic.accuracy if ensemble_genetic else None,
        "subclass_accuracy": ensemble_subclass.accuracy if ensemble_subclass else None,
    })


@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    if not ensemble_genetic or not ensemble_subclass:
        return jsonify({"error": "Models not loaded. Run train_model.py first."}), 503

    try:
        input_df = prepare_input(data)

        # Predict using ensemble models
        disorder_result = ensemble_genetic.predict(input_df)
        subclass_result = ensemble_subclass.predict(input_df)

        # Use the higher confidence for overall confidence
        confidence = max(disorder_result['confidence'], subclass_result['confidence'])

        # Compute risk factors
        risk_factors = compute_risk_factors(data)

        # Build class distribution from probabilities
        class_dist = [
            {"name": name, "probability": prob}
            for name, prob in disorder_result['all_probabilities'].items()
        ]
        subclass_dist = [
            {"name": name, "probability": prob}
            for name, prob in subclass_result['all_probabilities'].items()
        ]

        result = {
            "geneticDisorder": disorder_result['prediction'],
            "disorderSubclass": subclass_result['prediction'],
            "confidence": confidence,
            "riskFactors": risk_factors,
            "classDistribution": class_dist,
            "subclassDistribution": subclass_dist,
        }

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    load_models()
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🚀 GeneSight API running on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)