"""
GeneSight Ensemble Model Training Script

Trains multiple MLP models with different configurations and combines predictions.

Usage:
    1. Place train.csv in the backend/ directory
    2. Run: python train_model_ensemble.py
    3. Models will be saved to backend/models/

Ensemble Strategy:
    - 5 MLP models with different random seeds and hyperparameters
    - Soft voting (probability averaging) for final prediction
    - Handles class imbalance via SMOTE
"""

import os
import numpy as np
import pandas as pd
import joblib
import warnings

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.neural_network import MLPClassifier
from imblearn.over_sampling import SMOTE, ADASYN

warnings.filterwarnings("ignore")

# ───────────────────────────────────────────────
# Paths
# ───────────────────────────────────────────────
BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# ───────────────────────────────────────────────
# Feature Columns
# ───────────────────────────────────────────────
FEATURE_COLUMNS = [
    "Patient Age",
    "Father's age",
    "Blood cell count (mcL)",
    "White Blood cell count (thousand per microliter)",
    "Blood test result",
    "Birth defects",
    "Symptom 1", "Symptom 2", "Symptom 3", "Symptom 4", "Symptom 5",
    "Respiratory Rate (breaths/min)",
    "Heart Rate (rates/min",
    "Gender",
    "Birth asphyxia",
    "Folic acid details (peri-Loss am am am am am am am am am am)",
    "Maternal gene",
    "Radiation exposure (x-ray)",
    "Substance (Alcohol) abuse",
    "Assisted conception IVF/ART",
    "History of anomalies in previous pregnancies",
    "No. of previous abortion",
    "Parental consent",
]

# ───────────────────────────────────────────────
# Preprocessing
# ───────────────────────────────────────────────
def preprocess(df, target_col, scaler=None, label_encoder=None, fit=True, column_order=None):
    df = df.copy()
    df = df.dropna(subset=[target_col]).reset_index(drop=True)

    y = df[target_col]
    X = df.drop(columns=[target_col], errors="ignore")

    # Remove leakage columns
    drop_cols = [c for c in X.columns if "id" in c.lower() or "name" in c.lower()]
    for leak in ["Genetic Disorder", "Disorder Subclass", "Combined_disorder"]:
        if leak in X.columns and leak != target_col:
            drop_cols.append(leak)

    X = X.drop(columns=[c for c in drop_cols if c in X.columns])

    # Fill missing values
    for col in X.columns:
        if X[col].dtype == "object":
            X[col] = X[col].fillna(X[col].mode()[0] if not X[col].mode().empty else "Unknown")
        else:
            X[col] = X[col].fillna(X[col].median())

    # One-hot encoding
    X = pd.get_dummies(X, drop_first=True)

    # Align columns during inference
    if column_order is not None and not fit:
        for col in set(column_order) - set(X.columns):
            X[col] = 0
        X = X[column_order]

    # Encode target
    if fit:
        label_encoder = LabelEncoder()
        y_enc = label_encoder.fit_transform(y)
    else:
        y_enc = label_encoder.transform(y)

    # Scale features
    if fit:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
    else:
        X_scaled = scaler.transform(X)

    return X_scaled, y_enc, scaler, label_encoder, list(X.columns)

# ───────────────────────────────────────────────
# Ensemble Configurations
# ───────────────────────────────────────────────
def get_ensemble_configs():
    return [
        {"name": "mlp_deep", "hidden_layer_sizes": (512,256,128,64), "lr":0.0005, "iter":500, "batch":128, "alpha":0.0001, "seed":42},
        {"name": "mlp_wide", "hidden_layer_sizes": (1024,512,256), "lr":0.001, "iter":400, "batch":256, "alpha":0.001, "seed":123},
        {"name": "mlp_balanced", "hidden_layer_sizes": (512,256,128), "lr":0.001, "iter":450, "batch":64, "alpha":0.0005, "seed":456},
        {"name": "mlp_shallow", "hidden_layer_sizes": (768,384), "lr":0.0008, "iter":500, "batch":192, "alpha":0.001, "seed":789},
        {"name": "mlp_regularized", "hidden_layer_sizes": (512,256,128,64,32), "lr":0.0003, "iter":600, "batch":128, "alpha":0.01, "seed":999},
    ]

# ───────────────────────────────────────────────
# Sampling
# ───────────────────────────────────────────────
def apply_sampling(X, y):
    unique, counts = np.unique(y, return_counts=True)
    if min(counts) < 3:
        return X, y

    try:
        sm = SMOTE(random_state=42, k_neighbors=min(5, min(counts)-1))
        return sm.fit_resample(X, y)
    except:
        return X, y

# ───────────────────────────────────────────────
# Train Single Model
# ───────────────────────────────────────────────
def train_single_model(X_train, y_train, X_val, y_val, config):
    print(f"Training {config['name']}...")

    model = MLPClassifier(
        hidden_layer_sizes=config["hidden_layer_sizes"],
        learning_rate_init=config["lr"],
        max_iter=config["iter"],
        batch_size=config["batch"],
        alpha=config["alpha"],
        random_state=config["seed"],
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=30,
    )

    model.fit(X_train, y_train)

    preds = model.predict(X_val)
    acc = accuracy_score(y_val, preds)

    print(f"  Accuracy: {acc:.4f}")
    return model, acc

# ───────────────────────────────────────────────
# Ensemble Prediction
# ───────────────────────────────────────────────
def ensemble_predict(models, weights, X):
    probs = sum(w * m.predict_proba(X) for m, w in zip(models, weights)) / sum(weights)
    return np.argmax(probs, axis=1)

# ───────────────────────────────────────────────
# Train Ensemble
# ───────────────────────────────────────────────
def train_ensemble(df, target, name):
    print(f"\n{'='*60}")
    print(f"Training Ensemble for {target}")
    print(f"{'='*60}")

    X, y, scaler, le, cols = preprocess(df, target)

    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    X_train, y_train = apply_sampling(X_train, y_train)

    configs = get_ensemble_configs()

    models, accs = [], []

    for cfg in configs:
        model, acc = train_single_model(X_train, y_train, X_val, y_val, cfg)
        models.append(model)
        accs.append(acc)

    weights = [a**2 for a in accs]

    preds = ensemble_predict(models, weights, X_val)
    ensemble_acc = accuracy_score(y_val, preds)

    print(f"\nEnsemble Accuracy: {ensemble_acc:.4f}")
    print(classification_report(y_val, preds, target_names=le.classes_))

    joblib.dump({
    "models": models,
    "weights": weights,
    "scaler": scaler,
    "label_encoder": le,
    "columns": cols,
    "accuracy": ensemble_acc  # Add this line
}, os.path.join(MODELS_DIR, f"{name}_ensemble.joblib"))
# ───────────────────────────────────────────────
# Main
# ───────────────────────────────────────────────
def main():
    path = os.path.join(BASE_DIR, "train.csv")

    if not os.path.exists(path):
        print("train.csv not found")
        return

    df = pd.read_csv(path)

    if "Genetic Disorder" in df.columns:
        train_ensemble(df, "Genetic Disorder", "genetic_disorder")

    if "Disorder Subclass" in df.columns:
        train_ensemble(df, "Disorder Subclass", "disorder_subclass")

    print("\n✅ Training complete. Models saved.")

if __name__ == "__main__":
    main()