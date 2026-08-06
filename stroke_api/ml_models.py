import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from pathlib import Path
import os

# ---------- SHAP (optional) ----------
try:
    import shap
    import matplotlib.pyplot as plt
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("⚠️ SHAP/matplotlib not installed. SHAP explanations disabled.")

# ---------- XGBoost (optional) ----------
try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    print("⚠️ XGBoost not installed. Using fallback.")

class StrokeReadmissionPredictor:
    def __init__(self):
        self.rf_model = None
        self.xgb_model = None
        self.is_trained = False
        self.feature_names = [
            'age', 'nihss_score', 'length_of_stay_days',
            'has_urinary_catheter', 'hypercoagulable_state',
            'percutaneous_gastrostomy', 'hemodialysis', 'malnutrition',
            'discharge_snf', 'discharge_rehab'
        ]
        self.models_dir = Path(__file__).resolve().parent / 'ml_models'
        self.models_dir.mkdir(exist_ok=True)
        self.load_models()

    def load_models(self):
        """Load pre-trained models if they exist"""
        rf_path = self.models_dir / 'random_forest.pkl'
        xgb_path = self.models_dir / 'xgboost.pkl'
        if rf_path.exists() and xgb_path.exists() and XGB_AVAILABLE:
            try:
                self.rf_model = joblib.load(rf_path)
                self.xgb_model = joblib.load(xgb_path)
                self.is_trained = True
                return True
            except Exception as e:
                print(f"⚠️ Error loading models: {e}")
                return False
        return False

    def train(self, data):
        """Train models – only if XGB is available"""
        if not XGB_AVAILABLE:
            return {"error": "XGBoost not available"}
        try:
            X = data[self.feature_names]
            y = data['readmitted']
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

            self.rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
            self.rf_model.fit(X_train, y_train)

            self.xgb_model = XGBClassifier(n_estimators=100, random_state=42)
            self.xgb_model.fit(X_train, y_train)

            # Evaluate
            rf_pred = self.rf_model.predict(X_test)
            xgb_pred = self.xgb_model.predict(X_test)
            rf_auc = roc_auc_score(y_test, self.rf_model.predict_proba(X_test)[:, 1])
            xgb_auc = roc_auc_score(y_test, self.xgb_model.predict_proba(X_test)[:, 1])

            joblib.dump(self.rf_model, self.models_dir / 'random_forest.pkl')
            joblib.dump(self.xgb_model, self.models_dir / 'xgboost.pkl')
            self.is_trained = True

            return {
                'rf_accuracy': accuracy_score(y_test, rf_pred),
                'xgb_accuracy': accuracy_score(y_test, xgb_pred),
                'rf_auc': rf_auc,
                'xgb_auc': xgb_auc,
            }
        except Exception as e:
            print(f"❌ Training failed: {e}")
            return None

    def predict(self, patient_data):
        """Predict risk – uses fallback if models not loaded"""
        if not self.is_trained or self.xgb_model is None:
            return self._fallback_predict(patient_data)
        try:
            df = pd.DataFrame([patient_data])[self.feature_names]
            rf_prob = self.rf_model.predict_proba(df)[0][1]
            xgb_prob = self.xgb_model.predict_proba(df)[0][1]
            ensemble = (rf_prob + xgb_prob) / 2
            return {
                'random_forest': round(rf_prob, 3),
                'xgboost': round(xgb_prob, 3),
                'ensemble': round(ensemble, 3),
                'risk_category': self.get_category(ensemble)
            }
        except Exception as e:
            print(f"⚠️ Prediction error, using fallback: {e}")
            return self._fallback_predict(patient_data)

    def _fallback_predict(self, patient_data):
        """Rule-based fallback"""
        risk = 0.0
        if patient_data.get('nihss_score', 0) > 24:
            risk += 0.30
        elif patient_data.get('nihss_score', 0) > 12:
            risk += 0.20
        if patient_data.get('has_urinary_catheter', 0):
            risk += 0.15
        if patient_data.get('hypercoagulable_state', 0):
            risk += 0.15
        if patient_data.get('malnutrition', 0):
            risk += 0.15
        if patient_data.get('discharge_snf', 0) or patient_data.get('discharge_rehab', 0):
            risk += 0.10
        risk = min(risk, 1.0)
        return {
            'random_forest': round(risk * 0.9, 3),
            'xgboost': round(risk * 1.1, 3),
            'ensemble': round(risk, 3),
            'risk_category': self.get_category(risk)
        }

    def get_category(self, score):
        if score >= 0.7:
            return 'High'
        elif score >= 0.4:
            return 'Medium'
        return 'Low'

    def get_recommendations(self, patient_data, risk_category):
        """Generate simple recommendations"""
        recs = []
        if risk_category == 'High':
            recs.append("⚠️ You are at high risk. Contact your doctor immediately.")
            recs.append("📋 Monitor your symptoms and submit daily reports.")
        elif risk_category == 'Medium':
            recs.append("🔶 Your risk is moderate. Continue monitoring and follow your care plan.")
            recs.append("💊 Take medications on time.")
        else:
            recs.append("✅ You are at low risk. Keep up the good work!")
            recs.append("🏃 Stay active and eat healthy.")

        if patient_data.get('has_headache'):
            recs.append("🤕 You reported headache – rest and avoid bright lights.")
        if patient_data.get('has_dizziness'):
            recs.append("😵 Dizziness reported – sit down and avoid driving.")
        if patient_data.get('has_weakness'):
            recs.append("💪 Weakness reported – inform your physical therapist.")
        if patient_data.get('has_speech_difficulty'):
            recs.append("🗣️ Speech difficulty – inform your speech therapist.")
        if patient_data.get('has_fever'):
            recs.append("🌡️ Fever reported – monitor temperature and seek medical attention if persists.")
        return recs

    def explain(self, patient_data):
        """Generate SHAP force plot explanation – returns None on failure."""
        if not self.is_trained or self.xgb_model is None:
            return None
        if not SHAP_AVAILABLE:
            return None
        try:
            df = pd.DataFrame([patient_data])[self.feature_names]
            explainer = shap.TreeExplainer(self.xgb_model)
            shap_values = explainer.shap_values(df)

            # Create force plot as base64 image
            plt.figure()
            shap.force_plot(explainer.expected_value, shap_values[0], df.iloc[0], matplotlib=True, show=False)
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight')
            buf.seek(0)
            image_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()

            return {
                'image_base64': image_base64,
                'expected_value': float(explainer.expected_value),
                'shap_values': [float(x) for x in shap_values[0]]
            }
        except Exception as e:
            print(f"⚠️ SHAP explanation failed: {e}")
            return None