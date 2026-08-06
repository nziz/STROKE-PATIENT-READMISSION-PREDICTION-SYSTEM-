# app/ml_predictor.py
import joblib
import pandas as pd
import os
from pathlib import Path

# Get the base directory of the app
BASE_DIR = Path(__file__).resolve().parent

# Load your trained models (you need to save them from your Jupyter notebook)
# For now, we'll create a dummy predictor that returns random values
# REPLACE THIS with your actual model loading
def load_models():
    try:
        xgb_model = joblib.load(BASE_DIR / 'ml_models/xgboost_model.pkl')
        rf_model = joblib.load(BASE_DIR / 'ml_models/random_forest_model.pkl')
        lr_model = joblib.load(BASE_DIR / 'ml_models/logistic_regression_model.pkl')
        return xgb_model, rf_model, lr_model
    except:
        # If models don't exist yet, return None (we'll handle this gracefully)
        return None, None, None

xgb_model, rf_model, lr_model = load_models()

def predict_readmission(patient_data):
    """
    patient_data: a dictionary with keys matching your model's features.
    Returns: a dictionary with risk scores and category.
    """
    # If models are not loaded, return a dummy prediction
    if xgb_model is None:
        return {
            "final_score": 0.45,
            "risk_category": "Medium",
            "xgboost_score": 0.45,
            "random_forest_score": 0.40,
            "logistic_regression_score": 0.50
        }
    
    # Convert patient data to DataFrame
    df = pd.DataFrame([patient_data])
    
    # Ensure columns are in the correct order (as per your trained models)
    # You need to define this based on your training features
    feature_columns = ['age', 'nihss_score', 'length_of_stay_days', 
                       'has_urinary_catheter', 'hypercoagulable_state',
                       'percutaneous_gastrostomy', 'hemodialysis', 'malnutrition']
    
    # Reorder columns to match training data
    df = df[feature_columns]
    
    # Get predictions
    xgb_prob = xgb_model.predict_proba(df)[0][1]  # Probability of readmission
    rf_prob = rf_model.predict_proba(df)[0][1]
    lr_prob = lr_model.predict_proba(df)[0][1]
    
    # Use the best performing model (XGBoost from your proposal)
    final_score = xgb_prob
    
    # Determine category
    if final_score >= 0.7:
        category = "High"
    elif final_score >= 0.4:
        category = "Medium"
    else:
        category = "Low"
    
    return {
        "final_score": round(final_score, 3),
        "risk_category": category,
        "xgboost_score": round(xgb_prob, 3),
        "random_forest_score": round(rf_prob, 3),
        "logistic_regression_score": round(lr_prob, 3)
    }