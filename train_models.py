# train_models.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from xgboost import XGBClassifier
import joblib
import os
import json

# ========== CONFIG ==========
DATA_PATH = 'stroke_readmission_data.csv'
MODEL_DIR = 'stroke_api/ml_models/'
os.makedirs(MODEL_DIR, exist_ok=True)

print("=" * 60)
print("🧠 STROKE READMISSION PREDICTION - ML TRAINING")
print("=" * 60)

# ========== LOAD DATA ==========
print("\n📊 Loading data...")
df = pd.read_csv(DATA_PATH)
print(f"✅ Loaded {len(df)} records, {len(df.columns)} columns")
print(f"Columns: {list(df.columns)}")

# ========== CLEAN DATA ==========
print("\n🧹 Cleaning data...")

# Drop 'id' column (not needed)
if 'id' in df.columns:
    df = df.drop(columns=['id'])

# Handle missing values in BMI
df['bmi'] = df['bmi'].replace('N/A', np.nan)
df['bmi'] = pd.to_numeric(df['bmi'], errors='coerce')
df['bmi'] = df['bmi'].fillna(df['bmi'].median())

# Handle smoking_status with 'Unknown' - replace with mode
df['smoking_status'] = df['smoking_status'].replace('Unknown', df['smoking_status'].mode()[0])

# ========== ENCODE CATEGORICAL VARIABLES ==========
print("\n🔤 Encoding categorical variables...")

categorical_cols = ['gender', 'ever_married', 'work_type', 'Residence_type', 'smoking_status']

# One-hot encode categorical variables
df_encoded = pd.get_dummies(df, columns=categorical_cols, drop_first=True)

# Ensure target is integer
df_encoded['stroke'] = df_encoded['stroke'].astype(int)

# ========== PREPARE FEATURES & TARGET ==========
target_col = 'stroke'
X = df_encoded.drop(columns=[target_col])
y = df_encoded[target_col]

print(f"✅ Features: {len(X.columns)} columns")
print(f"📊 Stroke rate: {y.mean()*100:.1f}%")

# ========== TRAIN/TEST SPLIT ==========
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\n📊 Train: {len(X_train)} records, Test: {len(X_test)} records")

# ========== TRAIN RANDOM FOREST ==========
print("\n🌲 Training Random Forest...")
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)
rf.fit(X_train, y_train)
rf_pred = rf.predict(X_test)
rf_acc = accuracy_score(y_test, rf_pred)
rf_auc = roc_auc_score(y_test, rf.predict_proba(X_test)[:, 1])
print(f"   ✅ Accuracy: {rf_acc:.3f} | AUC: {rf_auc:.3f}")

# ========== TRAIN XGBOOST ==========
print("\n⚡ Training XGBoost...")
try:
    xgb = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        use_label_encoder=False,
        eval_metric='logloss'
    )
    xgb.fit(X_train, y_train)
    xgb_pred = xgb.predict(X_test)
    xgb_acc = accuracy_score(y_test, xgb_pred)
    xgb_auc = roc_auc_score(y_test, xgb.predict_proba(X_test)[:, 1])
    print(f"   ✅ Accuracy: {xgb_acc:.3f} | AUC: {xgb_auc:.3f}")
    XGB_OK = True
except Exception as e:
    print(f"   ❌ XGBoost failed: {e}")
    XGB_OK = False

# ========== SAVE MODELS ==========
print("\n💾 Saving models...")
joblib.dump(rf, os.path.join(MODEL_DIR, 'random_forest.pkl'))
print(f"   ✅ Random Forest saved")
if XGB_OK and xgb is not None:
    joblib.dump(xgb, os.path.join(MODEL_DIR, 'xgboost.pkl'))
    print(f"   ✅ XGBoost saved")

# Save feature names
feature_names = list(X.columns)
with open(os.path.join(MODEL_DIR, 'feature_names.txt'), 'w') as f:
    for feat in feature_names:
        f.write(feat + '\n')
print(f"   ✅ Feature names saved ({len(feature_names)} features)")

# ========== EVALUATION ==========
print("\n" + "=" * 60)
print("📋 MODEL EVALUATION")
print("=" * 60)

print("\n🔹 Random Forest Performance:")
print(f"   Accuracy: {rf_acc:.3f}")
print(f"   AUC: {rf_auc:.3f}")
print(classification_report(y_test, rf_pred))

if XGB_OK:
    print("\n🔹 XGBoost Performance:")
    print(f"   Accuracy: {xgb_acc:.3f}")
    print(f"   AUC: {xgb_auc:.3f}")
    print(classification_report(y_test, xgb_pred))

# ========== FEATURE IMPORTANCE ==========
print("\n📊 TOP 10 FEATURES (Random Forest):")
feature_importance = pd.DataFrame({
    'feature': feature_names,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)
for i, row in feature_importance.head(10).iterrows():
    print(f"   {row['feature']}: {row['importance']:.3f}")

# ========== SAVE METRICS ==========
metrics = {
    'random_forest': {'accuracy': float(rf_acc), 'auc': float(rf_auc)}
}
if XGB_OK:
    metrics['xgboost'] = {'accuracy': float(xgb_acc), 'auc': float(xgb_auc)}

with open(os.path.join(MODEL_DIR, 'metrics.json'), 'w') as f:
    json.dump(metrics, f, indent=2)

print("\n" + "=" * 60)
print("🎉 TRAINING COMPLETE!")
print("=" * 60)
print(f"📁 Models saved to: {MODEL_DIR}")