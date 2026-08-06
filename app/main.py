import io
from typing import Optional, List, Dict
import jwt
from fastapi import FastAPI, Depends, HTTPException, status, Form, Response, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from sqlalchemy.orm import Session
import os
import uuid
import shutil
import datetime

from app.database import engine, Base, get_db, SessionLocal
from app.models import User, PatientProfile, HealthReport, RiskAlert
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    require_role
)
from app.risk_engine import evaluate_maternal_risk
from app.pdf_generator import generate_patient_pdf
from app.config import settings
from app.ussd_handler import handle_ussd_request
import logging
from logging.handlers import RotatingFileHandler
import os as _os

# Configure logging to file
log_path = _os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app.log')
logger = logging.getLogger('maternal_app')
logger.setLevel(logging.INFO)
handler = RotatingFileHandler(log_path, maxBytes=5_000_000, backupCount=3)
formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s: %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Maternal Health Early Warning System")
# app/main.py - Add this endpoint
@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(require_role(["ADMIN", "NURSE", "CHW"])),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for frontend"""
    
    # Basic stats
    total_patients = db.query(User).filter(User.role == "PATIENT").count()
    total_reports = db.query(HealthReport).count()
    
    # Risk alerts
    high_risk = db.query(RiskAlert).filter(RiskAlert.risk_level == "HIGH").count()
    medium_risk = db.query(RiskAlert).filter(RiskAlert.risk_level == "MEDIUM").count()
    pending = db.query(RiskAlert).filter(RiskAlert.status == "PENDING").count()
    
    # Response rate
    total_alerts = db.query(RiskAlert).count()
    resolved = db.query(RiskAlert).filter(RiskAlert.status == "RESOLVED").count()
    response_rate = f"{(resolved/total_alerts*100):.1f}%" if total_alerts > 0 else "0%"
    
    # Weekly trends (last 7 days)
    from datetime import datetime, timedelta
    trends = []
    for i in range(7):
        day = datetime.now().date() - timedelta(days=i)
        day_alerts = db.query(RiskAlert).filter(
            RiskAlert.created_at >= datetime(day.year, day.month, day.day),
            RiskAlert.created_at < datetime(day.year, day.month, day.day) + timedelta(days=1)
        ).all()
        
        trends.append({
            "date": day.strftime("%m/%d"),
            "high": sum(1 for a in day_alerts if a.risk_level == "HIGH"),
            "medium": sum(1 for a in day_alerts if a.risk_level == "MEDIUM"),
            "low": sum(1 for a in day_alerts if a.risk_level == "LOW")
        })
    
    # Recent alerts
    recent_alerts = db.query(RiskAlert).order_by(
        RiskAlert.created_at.desc()
    ).limit(10).all()
    
    alert_data = []
    for alert in recent_alerts:
        patient = alert.patient.user if alert.patient else None
        alert_data.append({
            "id": alert.id,
            "patient": patient.fullname if patient else "Unknown",
            "risk_level": alert.risk_level,
            "status": alert.status,
            "village": patient.village if patient else "Unknown",
            "created_at": alert.created_at.isoformat() if alert.created_at else None
        })
    
    return {
        "totalPatients": total_patients,
        "totalReports": total_reports,
        "highRiskAlerts": high_risk,
        "mediumRiskAlerts": medium_risk,
        "pendingAlerts": pending,
        "responseRate": response_rate,
        "trends": trends,
        "recentAlerts": alert_data
    }

def ensure_single_admin():
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == "ADMIN").all()
        if not admins:
            admin = User(
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
            db.add(admin)
            db.commit()
            return

        canonical = next((u for u in admins if u.username.upper() == "ADMIN"), admins[0])
        canonical.username = "ADMIN"
        canonical.password_hash = hash_password("Admin12345")
        canonical.fullname = "System Administrator"
        canonical.phone = "0788000000"
        canonical.district = "Kigali"
        canonical.sector = "Nyarugenge"
        canonical.cell = "Nyakabanda"
        canonical.village = "Kigali City"
        db.add(canonical)
        for other in admins:
            if other.id != canonical.id:
                db.delete(other)
        db.commit()
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    ensure_single_admin()

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
    return response


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled internal error")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Set up paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(BASE_DIR, "static")
templates_dir = os.path.join(BASE_DIR, "templates")

# Create static directory if it doesn't exist
os.makedirs(static_dir, exist_ok=True)
os.makedirs(os.path.join(static_dir, "css"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "js"), exist_ok=True)
os.makedirs(os.path.join(static_dir, "uploads"), exist_ok=True)
os.makedirs(templates_dir, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")
templates = Jinja2Templates(directory=templates_dir)

# Load the rendered HTML layout once for the homepage endpoint.
html_layout = ""
try:
    with open(os.path.join(templates_dir, "index.html"), "r", encoding="utf-8") as f:
        html_layout = f.read()
except FileNotFoundError:
    html_layout = "<html><body><h1>Home page template not found</h1></body></html>"

# Simple in-memory OTP store for development (phone -> {otp, expires_at})
USER_OTPS = {}
LOGIN_ATTEMPTS = {}
MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', '3'))
LOGIN_BLOCK_MINUTES = int(os.getenv('LOGIN_BLOCK_MINUTES', '5'))


def normalize_phone(phone: str) -> str:
    if not phone:
        return ''
    clean = phone.strip().replace(' ', '')
    if clean.startswith('+250') and len(clean) == 12 and clean[4] == '7':
        return '0' + clean[4:]
    if clean.startswith('250') and len(clean) == 11 and clean[3] == '7':
        return '0' + clean[3:]
    return clean


def _cleanup_login_attempts(key: str):
    attempt = LOGIN_ATTEMPTS.get(key)
    if not attempt:
        return False
    blocked_until = attempt.get('blocked_until')
    if blocked_until and blocked_until <= datetime.datetime.now():
        LOGIN_ATTEMPTS.pop(key, None)
        return False
    return bool(blocked_until)


def _record_failed_login(key: str):
    now = datetime.datetime.now()
    attempt = LOGIN_ATTEMPTS.get(key, {'count': 0, 'first_seen': now, 'blocked_until': None})
    attempt['count'] += 1
    if attempt['count'] >= MAX_LOGIN_ATTEMPTS:
        attempt['blocked_until'] = now + datetime.timedelta(minutes=LOGIN_BLOCK_MINUTES)
    LOGIN_ATTEMPTS[key] = attempt
    return attempt


def _clear_login_attempts(key: str):
    if key in LOGIN_ATTEMPTS:
        LOGIN_ATTEMPTS.pop(key, None)


def send_sms(phone: str, message: str) -> bool:
    """Send SMS using Twilio if configured, otherwise return False.
    Environment variables TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM enable Twilio.
    """
    sid = settings.TWILIO_SID
    token = settings.TWILIO_TOKEN
    from_num = settings.TWILIO_FROM
    if not (sid and token and from_num):
        logger.info(f"SMS not sent (no Twilio config) to {phone}: {message}")
        return False
    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(body=message, from_=from_num, to=phone)
        logger.info(f"OTP SMS sent to {phone}")
        return True
    except Exception as e:
        logger.exception("Failed to send SMS")
        return False

# ----------------------------------------------------
# AUTHENTICATION ENDPOINTS
# ----------------------------------------------------
@app.post("/api/auth/register")
def register_user(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form(...), # "PATIENT", "CHW", "NURSE", "ADMIN"
    fullname: str = Form(...),
    phone: str = Form(...),
    district: Optional[str] = Form(None),
    sector: Optional[str] = Form(None),
    cell: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    blood_group: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    phone = normalize_phone(phone)
    if not phone or not phone.startswith('07') or len(phone) != 10:
        raise HTTPException(status_code=400, detail="Phone must be 078xxxxxxx")
    if emergency_contact:
        emergency_contact = normalize_phone(emergency_contact)
        if emergency_contact and (not emergency_contact.startswith('07') or len(emergency_contact) != 10):
            raise HTTPException(status_code=400, detail="Emergency contact must be 078xxxxxxx")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")
    if role == "ADMIN" and db.query(User).filter(User.role == "ADMIN").first():
        raise HTTPException(status_code=400, detail="An administrator account already exists")
        
    if role not in ["PATIENT", "CHW", "NURSE", "ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    new_user = User(
        username=username,
        password_hash=hash_password(password),
        role=role,
        fullname=fullname,
        phone=phone,
        district=district,
        sector=sector,
        cell=cell,
        village=village
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if role == "PATIENT":
        if not age:
            db.delete(new_user)
            db.commit()
            raise HTTPException(status_code=400, detail="Age is required for patients")
        
        import datetime
        default_lmp = datetime.date.today().strftime("%Y-%m-%d")
        
        patient_profile = PatientProfile(
            user_id=new_user.id,
            age=age,
            lmp_date=default_lmp,
            blood_group=blood_group or "Unknown",
            emergency_contact=emergency_contact or ""
        )
        db.add(patient_profile)
        db.commit()

    return {"message": "Registration successful", "user_id": new_user.id}


@app.post("/api/auth/login")
def login_user(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else 'unknown'
    attempt_key = f"{username}:{client_ip}"
    if _cleanup_login_attempts(attempt_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Try again in {LOGIN_BLOCK_MINUTES} minutes."
        )

    user = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        _record_failed_login(attempt_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    _clear_login_attempts(attempt_key)
    profile = user.patient_profile
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "refresh_expires_in": settings.REFRESH_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "id": user.id,
            "username": user.username,
            "fullname": user.fullname,
            "role": user.role,
            "phone": user.phone,
            "district": user.district,
            "sector": user.sector,
            "cell": user.cell,
            "village": user.village,
            "age": profile.age if profile else None,
            "blood_group": profile.blood_group if profile else None,
            "emergency_contact": profile.emergency_contact if profile else None
        }
    }


@app.post("/api/auth/refresh")
def refresh_access_token(
    refresh_token: str = Form(...),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_type") != "refresh":
            raise credentials_exception
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise credentials_exception

    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }


@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile = current_user.patient_profile
    return {
        "id": current_user.id,
        "username": current_user.username,
        "fullname": current_user.fullname,
        "role": current_user.role,
        "phone": current_user.phone,
        "district": current_user.district,
        "sector": current_user.sector,
        "cell": current_user.cell,
        "village": current_user.village,
        "age": profile.age if profile else None,
        "blood_group": profile.blood_group if profile else None,
        "emergency_contact": profile.emergency_contact if profile else None
    }

# ----------------------------------------------------
# PATIENT SYMPTOM REPORTING ENDPOINTS
# ----------------------------------------------------
@app.post("/api/reports/submit")
def submit_report(
    weight: Optional[float] = Form(None),
    systolic_bp: Optional[int] = Form(None),
    diastolic_bp: Optional[int] = Form(None),
    bleeding: bool = Form(False),
    fever: bool = Form(False),
    headache: bool = Form(False),
    swelling: bool = Form(False),
    abdominal_pain: bool = Form(False),
    reduced_fetal_movement: bool = Form(False),
    notes: Optional[str] = Form(None),
    lmp_date: Optional[str] = Form(None),
    patient_phone: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Allow patients to submit their own report, and allow CHW/NURSE/ADMIN to submit on behalf of a patient
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    patient_profile = None
    if current_user.role == "PATIENT":
        patient_profile = current_user.patient_profile
        if not patient_profile:
            raise HTTPException(status_code=400, detail="Patient profile not found")
    else:
        # CHW/NURSE/ADMIN may provide a patient_phone to submit on behalf
        if not patient_phone:
            raise HTTPException(status_code=400, detail="patient_phone is required when submitting on behalf of another user")
        patient_user = db.query(User).filter(User.phone == patient_phone, User.role == "PATIENT").first()
        if not patient_user or not patient_user.patient_profile:
            raise HTTPException(status_code=404, detail="Target patient not found")
        patient_profile = patient_user.patient_profile

    if lmp_date:
        patient_profile.lmp_date = lmp_date
        db.commit()

    attachment_path = None
    attachment_filename = None
    attachment_type = None

    if file and file.filename:
        filename = file.filename
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        allowed_exts = ["pdf", "png", "jpg", "jpeg", "mp3", "wav", "txt", "csv"]
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed types: {', '.join(allowed_exts)}"
            )

        if ext in ["png", "jpg", "jpeg"]:
            attachment_type = "image"
        elif ext in ["mp3", "wav"]:
            attachment_type = "audio"
        elif ext == "pdf":
            attachment_type = "document"
        else:
            attachment_type = "text"

        unique_filename = f"{uuid.uuid4()}.{ext}"
        upload_dir = os.path.join(static_dir, "uploads")
        dest_path = os.path.join(upload_dir, unique_filename)
        
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        attachment_path = f"/static/uploads/{unique_filename}"
        attachment_filename = filename

    eval_result = evaluate_maternal_risk(
        bleeding=bleeding,
        fever=fever,
        headache=headache,
        swelling=swelling,
        abdominal_pain=abdominal_pain,
        reduced_fetal_movement=reduced_fetal_movement,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp
    )

    risk_level = eval_result["risk_level"]
    recommendation = eval_result["recommendation_en"]

    report = HealthReport(
        patient_id=patient_profile.id,
        weight=weight,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        bleeding=bleeding,
        fever=fever,
        headache=headache,
        swelling=swelling,
        abdominal_pain=abdominal_pain,
        reduced_fetal_movement=reduced_fetal_movement,
        risk_level=risk_level,
        recommendations=recommendation,
        notes=notes,
        attachment_path=attachment_path,
        attachment_filename=attachment_filename,
        attachment_type=attachment_type
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    if risk_level in ["MEDIUM", "HIGH"]:
        new_alert = RiskAlert(
            report_id=report.id,
            patient_id=patient_profile.id,
            risk_level=risk_level,
            status="PENDING",
            nurse_notes="Auto-flagged via Patient Portal Application Channel."
        )
        db.add(new_alert)
        db.commit()

    # Return evaluation details expected by the frontend
    return {
        "message": "Report submitted safely",
        "report_id": report.id,
        "risk_level": risk_level,
        "eval_details": {
            "recommendation_en": eval_result.get("recommendation_en"),
            "recommendation_rw": eval_result.get("recommendation_rw"),
            "flags": eval_result.get("flags", [])
        }
    }

# ----------------------------------------------------
# CLINICAL MONITORING ENDPOINTS (NURSE/ADMIN UNIFIED)
# ----------------------------------------------------
@app.get("/api/dashboard/alerts")
def fetch_emergency_stream(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user or current_user.role not in ["NURSE", "ADMIN"]:
        logger.warning(f"Unauthorized access attempt to dashboard alerts by {getattr(current_user, 'username', None)}")
        raise HTTPException(status_code=403, detail="Unauthorized access bracket.")
        
    alerts = db.query(RiskAlert).order_by(RiskAlert.updated_at.desc()).all()
    output = []
    for alert in alerts:
        report = db.query(HealthReport).filter(HealthReport.id == alert.report_id).first()
        patient_profile = db.query(PatientProfile).filter(PatientProfile.id == alert.patient_id).first()
        patient_user = None
        if patient_profile:
            patient_user = db.query(User).filter(User.id == patient_profile.user_id).first()

        # Compute gestational weeks from LMP if available
        gestational_weeks = None
        try:
            if patient_profile and patient_profile.lmp_date:
                lmp_date = datetime.datetime.strptime(patient_profile.lmp_date, "%Y-%m-%d").date()
                gestational_weeks = max(0, (datetime.date.today() - lmp_date).days // 7)
        except Exception:
            gestational_weeks = None

        symptoms = {
            "weight": None,
            "systolic_bp": None,
            "diastolic_bp": None,
            "bp": "",
            "bleeding": False,
            "fever": False,
            "headache": False,
            "swelling": False,
            "abdominal_pain": False,
            "reduced_fetal_movement": False,
            "attachment_path": None,
            "attachment_filename": None,
            "attachment_type": None
        }

        if report:
            symptoms.update({
                "weight": report.weight,
                "systolic_bp": report.systolic_bp,
                "diastolic_bp": report.diastolic_bp,
                "bp": f"{report.systolic_bp}/{report.diastolic_bp}" if report.systolic_bp and report.diastolic_bp else "",
                "bleeding": bool(report.bleeding),
                "fever": bool(report.fever),
                "headache": bool(report.headache),
                "swelling": bool(report.swelling),
                "abdominal_pain": bool(report.abdominal_pain),
                "reduced_fetal_movement": bool(report.reduced_fetal_movement),
                "attachment_path": report.attachment_path,
                "attachment_filename": report.attachment_filename,
                "attachment_type": report.attachment_type
            })

        patient_obj = {
            "id": patient_profile.id if patient_profile else None,
            "user_id": patient_user.id if patient_user else None,
            "name": patient_user.fullname if patient_user else (patient_profile.user.fullname if patient_profile and hasattr(patient_profile, 'user') and patient_profile.user else "Unknown"),
            "phone": patient_user.phone if patient_user else None,
            "village": patient_user.village if patient_user else (patient_profile.user.village if patient_profile and hasattr(patient_profile, 'user') and patient_profile.user else None),
            "age": patient_profile.age if patient_profile else None,
            "gestational_weeks": gestational_weeks
        }

        output.append({
            "id": alert.id,
            "report_id": alert.report_id,
            "risk_level": alert.risk_level,
            "status": alert.status,
            "nurse_notes": alert.nurse_notes,
            "created_at": alert.created_at.isoformat() if hasattr(alert, 'created_at') else None,
            "updated_at": alert.updated_at.isoformat() if hasattr(alert, 'updated_at') else None,
            "patient": patient_obj,
            "symptoms": symptoms
        })

    return output


@app.get("/api/logs/recent")
def recent_logs(current_user: User = Depends(get_current_user)):
    if not current_user or current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()[-200:]
        return {"logs": ''.join(lines)}
    except Exception as e:
        logger.exception("Failed to read logs")
        raise HTTPException(status_code=500, detail="Could not read logs")

@app.get("/api/nurse/alerts")
def fetch_nurse_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return fetch_emergency_stream(current_user=current_user, db=db)

# ----------------------------------------------------
# PORTABLE DOCUMENT GENERATOR EXPORT ROUTE
# ----------------------------------------------------
@app.get("/api/reports/{report_id}/download")
def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    report = db.query(HealthReport).filter(HealthReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    patient_profile = report.patient
    if not patient_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    patient_user = patient_profile.user
    if not patient_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient record not found")

    if current_user.role == "PATIENT" and patient_user.id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only download your own reports")
    elif current_user.role not in ["PATIENT", "NURSE", "ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access")

    gestational_weeks = 0
    try:
        if patient_profile.lmp_date:
            lmp_date = datetime.datetime.strptime(patient_profile.lmp_date, "%Y-%m-%d").date()
            gestational_weeks = max(0, (datetime.date.today() - lmp_date).days // 7)
    except Exception:
        gestational_weeks = 0

    report_data = {
        "weight": report.weight,
        "systolic_bp": report.systolic_bp,
        "diastolic_bp": report.diastolic_bp,
        "bleeding": report.bleeding,
        "fever": report.fever,
        "headache": report.headache,
        "swelling": report.swelling,
        "abdominal_pain": report.abdominal_pain,
        "reduced_fetal_movement": report.reduced_fetal_movement,
        "risk_level": report.risk_level,
        "recommendation_en": report.recommendations,
        "recommendation_rw": report.recommendations,
    }

    pdf_bytes = generate_patient_pdf(
        report_data=report_data,
        patient_name=patient_user.fullname,
        age=patient_profile.age,
        village=patient_user.village or "",
        phone=patient_user.phone,
        gestational_weeks=gestational_weeks
    )

    if isinstance(pdf_bytes, str):
        pdf_bytes = pdf_bytes.encode("latin-1")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"}
    )


@app.get("/api/reports/{report_id}/pdf")
def download_report_alias(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alias kept for legacy frontend routes that requested /pdf."""
    return download_report(report_id=report_id, current_user=current_user, db=db)


# ----------------------------------------------------
# REPORT HISTORY ENDPOINT
# ----------------------------------------------------
@app.get("/api/reports/history")
def reports_history(
    patient_phone: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Patients get their own history
    if current_user.role == "PATIENT":
        profile = current_user.patient_profile
        if not profile:
            return []
        reports = db.query(HealthReport).filter(HealthReport.patient_id == profile.id).order_by(HealthReport.created_at.desc()).all()
    else:
        # Nurses/Admins/CHWs can view all reports or filter by patient phone
        if patient_phone:
            user = db.query(User).filter(User.phone == patient_phone).first()
            if not user or not user.patient_profile:
                return []
            reports = db.query(HealthReport).filter(HealthReport.patient_id == user.patient_profile.id).order_by(HealthReport.created_at.desc()).all()
        else:
            reports = db.query(HealthReport).order_by(HealthReport.created_at.desc()).all()

    out = []
    for r in reports:
        out.append({
            "id": r.id,
            "patient_id": r.patient_id,
            "weight": r.weight,
            "systolic_bp": r.systolic_bp,
            "diastolic_bp": r.diastolic_bp,
            "bleeding": bool(r.bleeding),
            "fever": bool(r.fever),
            "headache": bool(r.headache),
            "swelling": bool(r.swelling),
            "abdominal_pain": bool(r.abdominal_pain),
            "reduced_fetal_movement": bool(r.reduced_fetal_movement),
            "risk_level": r.risk_level,
            "recommendations": r.recommendations,
            "notes": r.notes,
            "attachment_path": r.attachment_path,
            "attachment_filename": r.attachment_filename,
            "attachment_type": r.attachment_type,
            "created_at": r.created_at.isoformat() if hasattr(r, 'created_at') else None
        })
    return out


# ----------------------------------------------------
# OTP GENERATION (development helper)
# ----------------------------------------------------
@app.post("/api/auth/generate_otp")
def generate_otp(phone: str = Form(...), db: Session = Depends(get_db)):
    phone = normalize_phone(phone)
    user = db.query(User).filter(User.phone == phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Phone not registered")
    import random
    code = f"{random.randint(100000, 999999)}"
    expires = datetime.datetime.now() + datetime.timedelta(minutes=10)
    USER_OTPS[phone] = {"otp": code, "expires_at": expires}
    # Try to send via SMS if configured; otherwise return OTP for testing
    sent = send_sms(phone, f"Your MaternalCare OTP is: {code}")
    logger.info(f"Generated OTP for {phone}, sent={sent}")
    if sent:
        return {"phone": phone, "sent": True, "expires_at": expires.isoformat()}
    # Development fallback: return OTP in response
    return {"phone": phone, "otp": code, "expires_at": expires.isoformat(), "sent": False}


@app.post("/api/auth/forgot_password")
def forgot_password(identifier: str = Form(...), db: Session = Depends(get_db)):
    identifier = normalize_phone(identifier)
    # identifier may be phone or username
    user = db.query(User).filter((User.phone == identifier) | (User.username == identifier)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not registered")
    import random
    code = f"{random.randint(100000, 999999)}"
    expires = datetime.datetime.now() + datetime.timedelta(minutes=10)
    # store OTP keyed by phone
    USER_OTPS[user.phone] = {"otp": code, "expires_at": expires, "purpose": "reset"}
    sent = send_sms(user.phone, f"Your MaternalCare password reset code is: {code}")
    logger.info(f"Password reset OTP for {user.phone} (id={user.username}), sent={sent}")
    if sent:
        return {"identifier": identifier, "sent": True, "expires_at": expires.isoformat()}
    return {"identifier": identifier, "otp": code, "sent": False, "expires_at": expires.isoformat()}


@app.post("/api/auth/reset_password")
def reset_password(identifier: str = Form(...), otp: str = Form(...), new_password: str = Form(...), db: Session = Depends(get_db)):
    identifier = normalize_phone(identifier)
    # identifier may be phone or username
    user = db.query(User).filter((User.phone == identifier) | (User.username == identifier)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not registered")
    stored = USER_OTPS.get(user.phone)
    if not stored or stored.get("otp") != otp or stored.get("expires_at") <= datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    # update password
    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()
    USER_OTPS.pop(user.phone, None)
    logger.info(f"Password reset completed for {user.phone} (id={user.username})")
    return {"message": "Password has been reset"}


# ----------------------------------------------------
# USER PROFILE UPDATE & DELETE
# ----------------------------------------------------
@app.put("/api/users/{user_id}/bio")
def update_user_bio(
    user_id: int,
    fullname: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
    sector: Optional[str] = Form(None),
    cell: Optional[str] = Form(None),
    village: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    blood_group: Optional[str] = Form(None),
    emergency_contact: Optional[str] = Form(None),
    otp: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Admins and Nurses can update their own bio without OTP; admins can update anyone
    if current_user.role == "ADMIN":
        allowed = True
    elif current_user.role == "NURSE" and current_user.id == user_id:
        allowed = True
    elif current_user.id == user_id:
        # Patient updating own bio requires OTP verification
        allowed = False
        if otp:
            stored = USER_OTPS.get(target.phone)
            if stored and stored.get("otp") == otp and stored.get("expires_at") and stored["expires_at"] > datetime.datetime.now():
                allowed = True
                USER_OTPS.pop(target.phone, None)
    else:
        allowed = False

    if not allowed:
        raise HTTPException(status_code=403, detail="Not authorized or OTP required")

    # Update User fields
    if fullname is not None:
        target.fullname = fullname
    if district is not None:
        target.district = district
    if sector is not None:
        target.sector = sector
    if cell is not None:
        target.cell = cell
    if village is not None:
        target.village = village

    # Update patient profile if exists and fields provided
    if target.patient_profile:
        profile = target.patient_profile
        if age is not None:
            profile.age = age
        if blood_group is not None:
            profile.blood_group = blood_group
        if emergency_contact is not None:
            profile.emergency_contact = emergency_contact
        db.add(profile)

    db.add(target)
    db.commit()
    return {"message": "Profile updated successfully", "user_id": target.id}


@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user or current_user.role not in ["ADMIN", "NURSE"]:
        raise HTTPException(status_code=403, detail="Admin or Nurse privileges required")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.role == "NURSE" and target.role != "PATIENT":
        raise HTTPException(status_code=403, detail="Nurses can only delete patient records")
    if current_user.role == "NURSE" and target.role == "PATIENT" and target.id == current_user.id:
        raise HTTPException(status_code=403, detail="Nurses cannot delete their own account")

    # delete related records
    if target.patient_profile:
        pid = target.patient_profile.id
        db.query(RiskAlert).filter(RiskAlert.patient_id == pid).delete()
        db.query(HealthReport).filter(HealthReport.patient_id == pid).delete()
        db.delete(target.patient_profile)

    db.delete(target)
    db.commit()
    return {"message": "User and related patient data deleted"}


@app.get("/api/patients")
def get_patients(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in ["ADMIN", "NURSE"]:
        raise HTTPException(status_code=403, detail="Admin or Nurse privileges required")
    patients = db.query(User).filter(User.role == "PATIENT").all()
    return [
        {
            "id": patient.id,
            "fullname": patient.fullname,
            "phone": patient.phone,
            "district": patient.district,
            "sector": patient.sector,
            "cell": patient.cell,
            "village": patient.village,
            "age": patient.patient_profile.age if patient.patient_profile else None,
            "blood_group": patient.patient_profile.blood_group if patient.patient_profile else None,
            "emergency_contact": patient.patient_profile.emergency_contact if patient.patient_profile else None,
        }
        for patient in patients
    ]


# ----------------------------------------------------
# USSD GATEWAY ENDPOINT
# ----------------------------------------------------
@app.post("/api/ussd")
def ussd_endpoint(
    text: str = Form(""),
    phone_number: Optional[str] = Form(None),
    phoneNumber: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    resolved_phone = phone_number or phoneNumber
    if not resolved_phone:
        raise HTTPException(status_code=400, detail="phone_number is required")
    response_text = handle_ussd_request(text=text, phone_number=resolved_phone, db=db)
    return Response(content=response_text, media_type="text/plain")


# ----------------------------------------------------
# WEB FRONTEND HOME ENTRYPOINT
# ----------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    """
    Direct, high-utility HTML layout injection stream.
    Bypasses Jinja2 caching errors to serve the humanized panel instantly.
    """
    return HTMLResponse(content=html_layout)

