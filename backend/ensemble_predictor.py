"""
Ensemble Prediction Helper for GeneSight API
Load and use ensemble models for predictions.
"""

import numpy as np
import pandas as pd
import joblib

class EnsemblePredictor:
    """Wrapper for ensemble model predictions."""

    def __init__(self, model_path):
        """Load ensemble model from joblib file."""
        artifacts = joblib.load(model_path)
        self.models = artifacts['models']
        self.scaler = artifacts['scaler']
        self.label_encoder = artifacts['label_encoder']
        self.columns = artifacts['columns']
        self.weights = artifacts['weights']
        # Fix: Get classes from label_encoder instead of separate key
        self.classes = self.label_encoder.classes_
        # Also need to add accuracy if it exists, or set a default
        self.accuracy = artifacts.get('accuracy', None)

    def predict(self, X_raw):
        """
        Make prediction using ensemble.

        Args:
            X_raw: DataFrame with same columns as training data

        Returns:
            dict with 'prediction', 'confidence', 'all_probabilities'
        """
        # Preprocess
        X = X_raw.copy()

        # Fill missing values
        for col in X.columns:
            if X[col].dtype == "object":
                mode_val = X[col].mode()
                X[col] = X[col].fillna(mode_val[0] if len(mode_val) > 0 else "Unknown")
            else:
                median_val = X[col].median()
                X[col] = X[col].fillna(median_val if not pd.isna(median_val) else 0)

        # One-hot encode
        X = pd.get_dummies(X, drop_first=True)

        # Align columns
        missing = set(self.columns) - set(X.columns)
        for m in missing:
            X[m] = 0
        X = X[self.columns]

        # Scale
        X_scaled = self.scaler.transform(X)

        # Ensemble prediction
        ensemble_proba = np.zeros((len(X), len(self.classes)))
        total_weight = sum(self.weights)

        individual_predictions = []
        for model, weight in zip(self.models, self.weights):
            proba = model.predict_proba(X_scaled)
            ensemble_proba += proba * (weight / total_weight)
            individual_predictions.append(model.predict(X_scaled)[0])

        final_pred = np.argmax(ensemble_proba, axis=1)
        confidence = np.max(ensemble_proba, axis=1)[0]

        # Get class probabilities
        prob_dict = {cls: float(prob) for cls, prob in zip(self.classes, ensemble_proba[0])}

        return {
            'prediction': self.label_encoder.inverse_transform(final_pred)[0],
            'confidence': float(confidence),
            'all_probabilities': prob_dict,
            'individual_model_predictions': individual_predictions,
            'ensemble_accuracy': self.accuracy
        }