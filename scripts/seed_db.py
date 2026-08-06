import os
import sys
import datetime

# Append parent directory to sys.path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.models import User, PatientProfile, HealthReport, RiskAlert
from app.auth import hash_password

def enforce_single_admin(db):
    existing_admins = db.query(User).filter(User.role == "ADMIN").all()
    conflict_user = db.query(User).filter(User.username == "admin", User.role != "ADMIN").first()
    if conflict_user:
        conflict_user.username = f"{conflict_user.username}_{conflict_user.id}"
        db.add(conflict_user)
        db.commit()

    if existing_admins:
        admin_user = next((u for u in existing_admins if u.username.lower() == "admin"), existing_admins[0])
        for other in existing_admins:
            if other.id != admin_user.id:
                db.delete(other)
        db.commit()
    else:
        admin_user = User(
            username="ADMIN",
            password_hash=hash_password("Admin12345"),
            role="ADMIN",
            fullname="System Administrator",
            phone="0788000000",
            district="Kigali",
            sector="Nyarugenge",
            cell="Nyakabanda",
            village="Kigali City"
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    admin_user.username = "admin"
    admin_user.password_hash = hash_password("Admin12345")
    admin_user.role = "ADMIN"
    admin_user.fullname = "System Administrator"
    admin_user.phone = "0788000000"
    admin_user.district = "Kigali"
    admin_user.sector = "Nyarugenge"
    admin_user.cell = "Nyakabanda"
    admin_user.village = "Kigali City"
    db.add(admin_user)
    db.commit()
    print("Admin account enforced: admin / Admin12345")

def seed():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if database already seeded
        if db.query(User).first():
            print("Database already contains data. Enforcing single admin account and leaving existing data intact.")
            enforce_single_admin(db)
            return

        print("Seeding database with mock Rwandan maternal clinical data...")

        # 1. Create Nurses (Health Post Staff)
        nurse = User(
            username="marie",
            password_hash=hash_password("password123"),
            role="NURSE",
            fullname="Marie Claire Uwanyiligira",
            phone="0788000001",
            village="Gihogwe",
            cell="Gihogwe"
        )
        db.add(nurse)

        # 2. Create Community Health Workers (CHWs / Abajyanama b'Ubuzima)
        chw = User(
            username="jean",
            password_hash=hash_password("password123"),
            role="CHW",
            fullname="Jean Bosco Nsengimana",
            phone="0788000002",
            village="Gasanze",
            cell="Gihogwe"
        )
        db.add(chw)

        # 3. Create the single administrator account.
        admin = User(
            username="admin",
            password_hash=hash_password("Admin12345"),
            role="ADMIN",
            fullname="System Administrator",
            phone="0788000000",
            district="Kigali",
            sector="Nyarugenge",
            cell="Nyakabanda",
            village="Kigali City"
        )
        db.add(admin)

        # 4. Create Patients
        # Patient A (Jane Doe)
        patient_a = User(
            username="jane",
            password_hash=hash_password("password123"),
            role="PATIENT",
            fullname="Jane Doe",
            phone="0788000003",
            village="Gasanze",
            cell="Gihogwe"
        )
        db.add(patient_a)
        db.commit()
        db.refresh(patient_a)

        # Create Profile Patient A
        # Let's set LMP to 24 weeks ago
        lmp_date_a = (datetime.date.today() - datetime.timedelta(weeks=24)).strftime("%Y-%m-%d")
        profile_a = PatientProfile(
            user_id=patient_a.id,
            age=26,
            lmp_date=lmp_date_a,
            blood_group="B+",
            emergency_contact="0788000002" # CHW Jean's phone
        )
        db.add(profile_a)
        db.commit()
        db.refresh(profile_a)

        # Patient B (Mutesi Aline - high risk example)
        patient_b = User(
            username="aline",
            password_hash=hash_password("password123"),
            role="PATIENT",
            fullname="Mutesi Aline",
            phone="0788000004",
            village="Karuruma",
            cell="Gihogwe"
        )
        db.add(patient_b)
        db.commit()
        db.refresh(patient_b)

        # Profile Patient B (LMP 32 weeks ago)
        lmp_date_b = (datetime.date.today() - datetime.timedelta(weeks=32)).strftime("%Y-%m-%d")
        profile_b = PatientProfile(
            user_id=patient_b.id,
            age=31,
            lmp_date=lmp_date_b,
            blood_group="O+",
            emergency_contact="0788222222"
        )
        db.add(profile_b)
        db.commit()
        db.refresh(profile_b)

        # 4. Create Historical Reports
        # Jane Doe: Report 1 (Normal, 3 weeks ago)
        report_a1 = HealthReport(
            patient_id=profile_a.id,
            weight=62.0,
            systolic_bp=118,
            diastolic_bp=76,
            bleeding=False,
            fever=False,
            headache=False,
            swelling=False,
            abdominal_pain=False,
            reduced_fetal_movement=False,
            risk_level="LOW",
            recommendations="LOW RISK: Pregnancy health looks stable. Continue routine prenatal care (ANC) visits. Promptly report any new symptoms.",
            notes="Routine third trimester initial check.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=21)
        )
        db.add(report_a1)

        # Jane Doe: Report 2 (Medium Risk, 1 day ago)
        report_a2 = HealthReport(
            patient_id=profile_a.id,
            weight=63.5,
            systolic_bp=142,
            diastolic_bp=92,
            bleeding=False,
            fever=False,
            headache=True,
            swelling=True,
            abdominal_pain=False,
            reduced_fetal_movement=False,
            risk_level="MEDIUM",
            recommendations="MODERATE RISK: Consult your Community Health Worker (CHW) or visit the health post within 24 hours. Rest and monitor symptoms closely.",
            notes="Reporting mild swelling in hands and face since yesterday morning. Mild headache.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        )
        db.add(report_a2)

        # Mutesi Aline: Report 1 (High Risk, Today)
        report_b1 = HealthReport(
            patient_id=profile_b.id,
            weight=71.2,
            systolic_bp=165,
            diastolic_bp=112,
            bleeding=True,
            fever=False,
            headache=True,
            swelling=True,
            abdominal_pain=True,
            reduced_fetal_movement=True,
            risk_level="HIGH",
            recommendations="CRITICAL RISK! Go to the nearest health post or health center immediately. Medical evaluation is required urgently.",
            notes="Urgent report. Active spotting (bleeding) and severe stomach pain. High blood pressure registered.",
            created_at=datetime.datetime.utcnow()
        )
        db.add(report_b1)
        db.commit()
        db.refresh(report_a2)
        db.refresh(report_b1)

        # 5. Create Active Triage Alerts
        alert_a = RiskAlert(
            report_id=report_a2.id,
            patient_id=profile_a.id,
            risk_level="MEDIUM",
            status="PENDING",
            nurse_notes="Auto-flagged due to gestational hypertension symptoms."
        )
        db.add(alert_a)

        alert_b = RiskAlert(
            report_id=report_b1.id,
            patient_id=profile_b.id,
            risk_level="HIGH",
            status="PENDING",
            nurse_notes="Auto-flagged. Active bleeding and critical hypertension. Requires immediate health post intervention."
        )
        db.add(alert_b)
        db.commit()

        print("Seeding completed successfully! Default accounts created:")
        print("  - Patient: 'jane' / 'password123'")
        print("  - Nurse: 'marie' / 'password123'")
        print("  - CHW: 'jean' / 'password123'")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
