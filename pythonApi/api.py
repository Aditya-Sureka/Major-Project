from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import numpy as np
import pandas as pd
import logging

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# ===============================
# Load ML Model & Feature Order
# ===============================

MODEL_PATH = "life_insurance_fraud_model.pkl"
FEATURES_PATH = "model_features.json"

model = joblib.load(MODEL_PATH)

with open(FEATURES_PATH, "r") as f:
    FEATURE_NAMES = json.load(f)

# ===============================
# Helper: Validate Input
# ===============================

def validate_input(data):
    missing = [f for f in FEATURE_NAMES if f not in data]
    return missing

# ===============================
# Life Insurance Fraud Prediction
# ===============================

@app.route("/lifeinsurance/predict", methods=["POST"])
def predict_life_insurance_fraud():
    try:
        data = request.get_json()
        logging.info(f"Incoming request: {data}")

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        missing_fields = validate_input(data)
        if missing_fields:
            return jsonify({
                "error": "Missing required fields",
                "missing_fields": missing_fields
            }), 400

        # Arrange input in correct feature order
        input_data = [[
            data["age"],
            data["sex"],
            data["bmi"],
            data["children"],
            data["smoker"],
            data["region"],
            data["charges"]
        ]]

        input_df = pd.DataFrame(input_data, columns=FEATURE_NAMES)

        # Prediction
        prediction = model.predict(input_df)[0]
        probability = model.predict_proba(input_df)[0][1]

        response = {
            "fraud_prediction": int(prediction),
            "fraud_probability": round(float(probability), 4),
            "risk_level": (
                "HIGH RISK" if probability > 0.7
                else "MEDIUM RISK" if probability > 0.4
                else "LOW RISK"
            )
        }

        return jsonify(response), 200

    except Exception as e:
        logging.error(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ===============================
# Health Check
# ===============================

@app.route("/", methods=["GET"])
def health_check():
    return jsonify({
        "status": "Life Insurance Fraud ML API running",
        "model_loaded": True
    })


# Note: vehicle/health specialized endpoints removed. Project supports Life Insurance ML endpoint only.


@app.route("/evaluateRisk", methods=["POST"])
def evaluate_risk():
    try:
        data = request.get_json() or {}
        logging.info(f"evaluateRisk called with payload keys: {list(data.keys())}")
        return jsonify({
            "risk_factors": [],
            "suspicious_files": []
        }), 200
    except Exception as e:
        logging.error(str(e))
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
