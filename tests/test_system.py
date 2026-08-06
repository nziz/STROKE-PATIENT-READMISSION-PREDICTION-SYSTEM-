import os
import sys
import unittest
from unittest.mock import MagicMock
import random
from fastapi.testclient import TestClient

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.risk_engine import evaluate_maternal_risk
from app.ussd_handler import handle_ussd_request
from app.database import Base, engine, SessionLocal
from app.models import User, PatientProfile, HealthReport, RiskAlert

class TestMaternalRiskEngine(unittest.TestCase):
    def test_low_risk(self):
        result = evaluate_maternal_risk(
            bleeding=False, fever=False, headache=False, swelling=False, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=120, diastolic_bp=80
        )
        self.assertEqual(result["risk_level"], "LOW")
        self.assertEqual(len(result["flags"]), 0)

    def test_medium_risk_hypertension(self):
        result = evaluate_maternal_risk(
            bleeding=False, fever=False, headache=False, swelling=False, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=145, diastolic_bp=95
        )
        self.assertEqual(result["risk_level"], "MEDIUM")
        self.assertIn("Moderate Hypertension", result["flags"])

    def test_medium_risk_symptom(self):
        result = evaluate_maternal_risk(
            bleeding=False, fever=True, headache=False, swelling=False, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=115, diastolic_bp=75
        )
        self.assertEqual(result["risk_level"], "MEDIUM")
        self.assertIn("High Fever", result["flags"])

    def test_high_risk_bleeding(self):
        result = evaluate_maternal_risk(
            bleeding=True, fever=False, headache=False, swelling=False, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=120, diastolic_bp=80
        )
        self.assertEqual(result["risk_level"], "HIGH")
        self.assertIn("Vaginal Bleeding", result["flags"])

    def test_high_risk_severe_hypertension(self):
        result = evaluate_maternal_risk(
            bleeding=False, fever=False, headache=False, swelling=False, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=165, diastolic_bp=112
        )
        self.assertEqual(result["risk_level"], "HIGH")
        self.assertIn("Severe Hypertension", result["flags"])

    def test_high_risk_preeclampsia_prodrome(self):
        # Combined headache and swelling
        result = evaluate_maternal_risk(
            bleeding=False, fever=False, headache=True, swelling=True, 
            abdominal_pain=False, reduced_fetal_movement=False,
            systolic_bp=120, diastolic_bp=80
        )
        self.assertEqual(result["risk_level"], "HIGH")
        self.assertIn("Severe Headache / Blurred Vision", result["flags"])
        self.assertIn("Face/Hand Swelling", result["flags"])


class TestUSSDHandler(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create an in-memory SQLite database for testing the USSD flow
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        cls.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=cls.engine)
        cls.SessionClass = sessionmaker(bind=cls.engine)

    def setUp(self):
        self.db = self.SessionClass()
        # Seed a test patient
        self.test_phone = "0780000000"
        patient = User(
            username="test_patient",
            password_hash="hashed_pw",
            role="PATIENT",
            fullname="Test Patient",
            phone=self.test_phone,
            village="Gasanze"
        )
        self.db.add(patient)
        self.db.commit()
        
        profile = PatientProfile(
            user_id=patient.id,
            age=25,
            lmp_date="2026-01-01"
        )
        self.db.add(profile)
        self.db.commit()

    def tearDown(self):
        self.db.query(RiskAlert).delete()
        self.db.query(HealthReport).delete()
        self.db.query(PatientProfile).delete()
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()

    def test_ussd_welcome(self):
        res = handle_ussd_request(text="", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("Choose Language", res)

    def test_ussd_english_menu(self):
        res = handle_ussd_request(text="2", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("Report Health Symptoms", res)

    def test_ussd_patient_not_registered(self):
        # Dialing from unregistered number to report
        res = handle_ussd_request(text="2*1*0789999999", phone_number="0781111111", db=self.db)
        self.assertTrue(res.startswith("END"))
        self.assertIn("is not registered", res)

    def test_ussd_report_flow_high_risk(self):
        # English (2) -> Report (1) -> Patient Phone (0780000000)
        res = handle_ussd_request(text="2*1*0780000000", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("vaginal bleeding", res.lower())

        # Yes to bleeding (1)
        res = handle_ussd_request(text="2*1*0780000000*1", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("high fever", res.lower())

        # No to fever (2)
        res = handle_ussd_request(text="2*1*0780000000*1*2", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("swollen face", res.lower())

        # No to swelling (2)
        res = handle_ussd_request(text="2*1*0780000000*1*2*2", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("CON"))
        self.assertIn("fetal movement", res.lower())

        # Yes to normal movement (1)
        res = handle_ussd_request(text="2*1*0780000000*1*2*2*1", phone_number=self.test_phone, db=self.db)
        self.assertTrue(res.startswith("END"))
        self.assertIn("HIGH", res) # Bleeding triggers high risk

        # Verify DB entries
        report = self.db.query(HealthReport).first()
        self.assertIsNotNone(report)
        self.assertEqual(report.risk_level, "HIGH")
        self.assertTrue(report.bleeding)
        self.assertFalse(report.fever)

        alert = self.db.query(RiskAlert).first()
        self.assertIsNotNone(alert)
        self.assertEqual(alert.risk_level, "HIGH")
        self.assertEqual(alert.status, "PENDING")


class TestAuthRefreshToken(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.username = f"refresh_user_{random.randint(1000, 9999)}"
        self.phone = f"078{random.randint(1000000, 9999999)}"
        self.password = "TestPass123!"
        response = self.client.post("/api/auth/register", data={
            "username": self.username,
            "password": self.password,
            "role": "PATIENT",
            "fullname": "Refresh Token User",
            "phone": self.phone,
            "age": 25,
            "blood_group": "A+",
            "emergency_contact": "+250788000000"
        })
        self.assertEqual(response.status_code, 200)

    def test_refresh_token_returns_new_access_token(self):
        login_response = self.client.post("/api/auth/login", data={
            "username": self.username,
            "password": self.password
        })
        self.assertEqual(login_response.status_code, 200)
        json_data = login_response.json()
        self.assertIn("refresh_token", json_data)
        self.assertIn("access_token", json_data)

        refresh_response = self.client.post("/api/auth/refresh", data={"refresh_token": json_data["refresh_token"]})
        self.assertEqual(refresh_response.status_code, 200)
        refresh_data = refresh_response.json()
        self.assertIn("access_token", refresh_data)
        self.assertEqual(refresh_data.get("token_type"), "bearer")

if __name__ == "__main__":
    unittest.main()
