import csv
import secrets
import string
from datetime import timedelta
from io import BytesIO
from google import genai
from google.genai import types
from django.conf import settings
# Django Core
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie

# Django REST Framework
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
# ReportLab (PDF Generation)
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, 
    TableStyle, PageBreak, HRFlowable
)

# Local App Imports
from .models import (
    StrokePatient, DailyPatientReport, Notification, 
    PanicAlert, FollowUp, PatientReminder
)
from .ml_models import StrokeReadmissionPredictor

# Optional / Fallback Imports
try:
    from .recommendations import RecommendationEngine
except ImportError:
    RecommendationEngine = None

try:
    from .email_handler import EmailNotificationHandler
except ImportError:
    EmailNotificationHandler = None

predictor = StrokeReadmissionPredictor()

# ========== CUSTOM PERMISSIONS (RBAC) ==========
class IsDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff

class IsPatient(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return StrokePatient.objects.filter(user=request.user).exists()

class IsOwnerOrDoctor(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        return obj.user == request.user

# ========== HELPER FUNCTIONS ==========
def get_doctor_for_notification(patient=None):
    if patient and patient.assigned_doctor:
        return patient.assigned_doctor
    return User.objects.filter(is_staff=True).first()

def get_available_doctor():
    doctor = User.objects.filter(is_staff=True, is_active=True).first()
    if not doctor:
        doctor = User.objects.filter(is_staff=True).first()
    return doctor

def calculate_initial_risk(patient):
    risk = 0.0
    if patient.nihss_score and patient.nihss_score > 24: risk += 0.30
    elif patient.nihss_score and patient.nihss_score > 12: risk += 0.20
    elif patient.nihss_score and patient.nihss_score > 4: risk += 0.10
    if patient.discharge_destination in ['snf', 'rehab']: risk += 0.10
    if patient.length_of_stay_days and patient.length_of_stay_days > 7: risk += 0.05
    return min(risk, 1.0)
def get_synced_risk_data(patient):
    """
    SINGLE SOURCE OF TRUTH: Ensures risk score and category are perfectly 
    synced across Dashboard, Search, Detail, and Results pages.
    """
    score = patient.current_risk_score or 0.0
    category = patient.current_risk_category
    
    # Fallback category calculation if missing from DB
    if not category:
        if score >= 0.50: category = 'High'
        elif score >= 0.25: category = 'Medium'
        else: category = 'Low'
        
    return {
        'risk_score': score,
        'risk_percentage': round(score * 100, 1),
        'risk_category': category
    }

# ========== CSRF TOKEN ==========
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    remember_me = request.data.get('remember_me', False) 
    
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'success': False, 'error': 'Invalid credentials'}, status=401)
        
    if remember_me:
        request.session.set_expiry(1209600) 
    else:
        request.session.set_expiry(0)      
        
    login(request, user)
    
    try:
        patient = StrokePatient.objects.get(user=user)
        role = 'patient'
        patient_id = patient.id
        name = f"{patient.first_name} {patient.last_name}"
    except StrokePatient.DoesNotExist:
        if not user.is_staff:
            return Response({'success': False, 'error': 'Your account has not been assigned a patient or doctor role.'}, status=403)
        role = 'doctor'
        patient_id = None
        name = user.get_full_name() or user.username
        
    return Response({
        'success': True, 
        'session_key': request.session.session_key,
        'username': user.username, 
        'role': role, 
        'patient_id': patient_id, 
        'name': name
    })
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def logout_user(request):
    logout(request)
    return Response({'success': True})

# ========== PATIENT MANAGEMENT ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def register_patient(request):
    data = request.data
    username = data.get('username')
    if not username:
        first = data.get('first_name', 'patient').lower()
        last = data.get('last_name', '').lower()
        base = f"{first}{last}" if last else first
        while True:
            suffix = ''.join(secrets.choice(string.digits) for _ in range(4))
            candidate = f"{base}{suffix}"
            if not User.objects.filter(username=candidate).exists():
                username = candidate
                break
    password = data.get('password')
    if not password:
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10)).strip()
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already exists"}, status=400)
    user = User.objects.create_user(username=username, password=password, email=data.get('email', ''), first_name=data.get('first_name', ''), last_name=data.get('last_name', ''))
    assigned_doctor = request.user if request.user.is_staff else get_available_doctor()
    patient = StrokePatient.objects.create(
        user=user, hospital_id=data.get('hospital_id', f"ST-{user.id:04d}"),
        first_name=data.get('first_name') or 'Patient', last_name=data.get('last_name') or 'Unknown',
        age=data.get('age', 0), gender=data.get('gender', 'M'), phone_number=data.get('phone_number', ''),
        admission_date=data.get('admission_date', timezone.now().date()), nihss_score=data.get('nihss_score', 0),
        discharge_destination=data.get('discharge_destination', 'home'), length_of_stay_days=data.get('length_of_stay_days', 0),
        assigned_doctor=assigned_doctor, is_active=True,
    )
    patient.current_risk_score = calculate_initial_risk(patient)
    if patient.current_risk_score >= 0.5: patient.current_risk_category = 'High'
    elif patient.current_risk_score >= 0.25: patient.current_risk_category = 'Medium'
    else: patient.current_risk_category = 'Low'
    patient.save()
    if assigned_doctor:
        Notification.objects.create(doctor=assigned_doctor, patient=patient, message=f"New patient {patient.first_name} {patient.last_name} registered and assigned to you.", created_at=timezone.now(), is_read=False, is_archived=False)
    return Response({"success": True, "patient_id": patient.id, "hospital_id": patient.hospital_id, "username": username, "password": password, "risk_score": patient.current_risk_score, "risk_category": patient.current_risk_category, "assigned_doctor": assigned_doctor.username if assigned_doctor else None, "message": "Patient registered successfully"})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_all_patients(request):
    patients = StrokePatient.objects.filter(is_active=True)
    data = []
    for p in patients:
        risk_data = get_synced_risk_data(p)
        data.append({
            'id': p.id, 'hospital_id': p.hospital_id, 'name': f"{p.first_name} {p.last_name}", 
            'age': p.age, 'gender': p.gender, 'risk_score': risk_data['risk_score'], 
            'risk_category': risk_data['risk_category'], 'admission_date': p.admission_date, 
            'phone_number': p.phone_number, 'assigned_doctor': p.assigned_doctor.username if p.assigned_doctor else None
        })
    return Response({"patients": data, "count": len(data)})
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_detail(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: return Response({"error": "Permission denied"}, status=403)
    
    risk_data = get_synced_risk_data(patient)
    
    response_data = {
        'id': patient.id, 'hospital_id': patient.hospital_id, 'first_name': patient.first_name, 
        'last_name': patient.last_name, 'age': patient.age, 'gender': patient.gender, 
        'phone_number': patient.phone_number, 'admission_date': patient.admission_date, 
        'nihss_score': patient.nihss_score, 'risk_score': risk_data['risk_score'], 
        'risk_category': risk_data['risk_category'], 'discharge_destination': patient.discharge_destination, 
        'length_of_stay_days': patient.length_of_stay_days, 
        'assigned_doctor': patient.assigned_doctor.username if patient.assigned_doctor else None
    }
    if hasattr(patient, 'created_at'): response_data['created_at'] = patient.created_at
    if hasattr(patient, 'last_updated'): response_data['last_updated'] = patient.last_updated
    return Response(response_data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_patient(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id)
        user = patient.user
        patient.delete()
        if user: user.delete()
        return Response({"success": True})
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)

# ========== DAILY REPORTS ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def submit_daily_report(request, patient_id):
    try: 
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: 
        return Response({"error": "Patient not found"}, status=404)
    
    if not request.user.is_staff and patient.user != request.user: 
        return Response({"error": "Permission denied"}, status=403)
    
    data = request.data
    symptoms_text = data.get('symptoms', '') or data.get('notes', '')
    
    # 1. CREATE THE REPORT IN THE DATABASE (Maps frontend chips to DB booleans)
    report = DailyPatientReport.objects.create(
        patient=patient, 
        report_date=timezone.now().date(), 
        notes=symptoms_text,
        well_being_score=data.get('well_being_score', 3), 
        took_medications=data.get('took_medications', False),
        has_headache='Headache' in symptoms_text,
        has_dizziness='Dizziness' in symptoms_text or 'Imbalance' in symptoms_text,
        has_weakness='Weakness' in symptoms_text or 'Numbness' in symptoms_text,
        has_speech_difficulty='Speech' in symptoms_text or 'Slurred' in symptoms_text or 'Confusion' in symptoms_text,
        has_vision_changes='Vision' in symptoms_text,
        has_fever='Fever' in symptoms_text,
        has_swallowing_difficulty='Swallowing' in symptoms_text,
    )

    from django.db.models import Avg, Q
    
    seven_days_ago = timezone.now().date() - timedelta(days=7)
    recent_reports = DailyPatientReport.objects.filter(
        patient=patient, 
        report_date__gte=seven_days_ago
    )
    
    total_recent_reports = recent_reports.count()
    
    if total_recent_reports > 0:
        # A. Medication Adherence Trend (0.0 to 1.0)
        meds_taken_count = recent_reports.filter(took_medications=True).count()
        adherence_rate = meds_taken_count / total_recent_reports
        
        # B. Average Well-being Trend (1 to 5)
        avg_well_being = recent_reports.aggregate(Avg('well_being_score'))['well_being_score__avg'] or 3.0
        
        # C. Severe Symptom Frequency (Count of days with neuro/red-flag symptoms)
        severe_symptom_days = recent_reports.filter(
            Q(has_weakness=True) | Q(has_speech_difficulty=True) | 
            Q(has_vision_changes=True) | Q(has_swallowing_difficulty=True)
        ).count()
        
        # D. Mild Symptom Frequency
        mild_symptom_days = recent_reports.filter(
            Q(has_headache=True) | Q(has_dizziness=True) | Q(has_fever=True)
        ).count()
    else:
        # Fallback if this is their very first report
        adherence_rate = 1.0 if report.took_medications else 0.0
        avg_well_being = report.well_being_score
        severe_symptom_days = 1 if (report.has_weakness or report.has_speech_difficulty or report.has_vision_changes) else 0
        mild_symptom_days = 1 if (report.has_headache or report.has_dizziness) else 0

    # 3. Calculate the Static Baseline (from initial hospital admission)
    if data.get('nihss_score') is not None:
        patient.nihss_score = data['nihss_score']
    baseline_risk = calculate_initial_risk(patient)

    # 4. Calculate the Dynamic Continuous Modifier
    # This pushes the risk UP or DOWN based on the 7-day continuous trend
    dynamic_modifier = 0.0
    
    # PENALTIES (Pushes risk UP based on poor weekly trends)
    if adherence_rate < 0.8: dynamic_modifier += 0.15
    if adherence_rate < 0.5: dynamic_modifier += 0.15
    if avg_well_being <= 2.5: dynamic_modifier += 0.10
    dynamic_modifier += min(severe_symptom_days * 0.05, 0.20) 
    dynamic_modifier += min(mild_symptom_days * 0.02, 0.10) 

    # REWARDS (Pushes risk DOWN - The "Gradual Recovery" factor)
    if adherence_rate == 1.0 and avg_well_being >= 4.0 and severe_symptom_days == 0:
        dynamic_modifier -= 0.10 

    # 5. Final Continuous Risk Calculation
    # The risk breathes up and down based on the continuous 7-day data
    new_risk = min(max(baseline_risk + dynamic_modifier, 0.0), 1.0)
    
    if new_risk >= 0.50: risk_category = 'High'
    elif new_risk >= 0.25: risk_category = 'Medium'
    else: risk_category = 'Low'
        
    patient.current_risk_score = new_risk
    patient.current_risk_category = risk_category
    patient.save()
    
    # 6. Generate Rule-Based Recommendations (Offline Fallback Base)
    recommendations = []
    if RecommendationEngine is not None:
        try: 
            recommendations = RecommendationEngine.generate(patient, report)
        except Exception as e: 
            print(f"⚠️ Recommendation generation failed: {e}")
            recommendations = []
    if not recommendations:
        recommendations = [{'priority': 'STANDARD', 'action': 'Monitor patient regularly', 'details': 'Complete daily report and follow standard protocols.'}]
    
        # =====================================================================
    # 7. OFFLOAD SLOW TASKS (AI & EMAILS) TO BACKGROUND THREAD
    # This ensures the HTTP response returns to the frontend in < 1 second!
    # =====================================================================
    import threading
    from django.db import connection

    def background_clinical_tasks(p_id, r_id, symp, r_cat, r_score, recs):
        try:
            # A. Generate AI Recommendation
            prompt = f"""You are an expert post-stroke care assistant. 
            PATIENT RISK: {r_cat} Risk ({round(r_score * 100, 1)}% readmission probability).
            TODAY'S SYMPTOMS: {symp if symp else 'None reported'}.
            MEDICATIONS: {'Taken' if DailyPatientReport.objects.get(id=r_id).took_medications else 'Missed'}.
            TASK: Write a brief, empathetic 2-3 sentence clinical directive. Keep it professional."""
            
            response = client.models.generate_content(model="models/gemini-3.6-flash", contents=prompt)
            ai_text = response.text.strip()
            
            # B. Save AI to DB
            r = DailyPatientReport.objects.get(id=r_id)
            r.ai_recommendation = ai_text
            r.save(update_fields=['ai_recommendation'])
            
            # C. Send Emails (If High Risk)
            if getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False) and r_cat == 'High':
                p = StrokePatient.objects.get(id=p_id)
                if p.assigned_doctor and EmailNotificationHandler:
                    try: EmailNotificationHandler.send_doctor_emergency_alert(p.assigned_doctor, p, r_score*100, recs)
                    except: pass
                if p.user and p.user.email and EmailNotificationHandler:
                    try: EmailNotificationHandler.send_patient_confirmation(p, r_score*100, r_cat, recs)
                    except: pass
                    
        except Exception as e:
            print(f"⚠️ Background tasks failed: {e}")
            # Fallback AI if network fails
            r = DailyPatientReport.objects.get(id=r_id)
            if not r.ai_recommendation:
                r.ai_recommendation = "Standard monitoring protocols apply. Continue daily tracking."
                r.save(update_fields=['ai_recommendation'])
        finally:
            connection.close() # CRITICAL: Prevents DB connection leaks in threads!

    # Start the thread and immediately move on!
    threading.Thread(
        target=background_clinical_tasks, 
        args=(patient.id, report.id, symptoms_text, risk_category, new_risk, recommendations)
    ).start()

    # 8. Collect Symptoms for Frontend Response
    symptoms_reported = []
    if report.has_headache: symptoms_reported.append('Headache')
    if report.has_dizziness: symptoms_reported.append('Dizziness')
    if report.has_weakness: symptoms_reported.append('Weakness')
    if report.has_speech_difficulty: symptoms_reported.append('Speech Difficulty')
    if report.has_vision_changes: symptoms_reported.append('Vision Changes')
    if report.has_fever: symptoms_reported.append('Fever')
    if report.has_swallowing_difficulty: symptoms_reported.append('Swallowing Difficulty')
    
    # 9. Return IMMEDIATE Response (< 1 second)
    return Response({
        "success": True, 
        "report_id": report.id, 
        "message": "Daily report submitted successfully", 
        "new_risk_score": new_risk, 
        "risk_category": risk_category, 
        "risk_percentage": round(new_risk * 100, 1), 
        "symptoms_reported": symptoms_reported, 
        "recommendations": recommendations
    })
    
    # 10. Return Response
    return Response({
        "success": True, 
        "report_id": report.id, 
        "message": "Daily report submitted successfully", 
        "new_risk_score": new_risk, 
        "risk_category": risk_category, 
        "risk_percentage": round(new_risk * 100, 1), 
        "symptoms_reported": symptoms_reported, 
        "recommendations": recommendations, 
        "ai_recommendation": ai_text, # Send it immediately to the frontend
        "redirect_to": f"/reports/{report.id}/results" if getattr(settings, 'ENABLE_NEW_RESULTS_PAGE', False) else None
    })
    
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_reports(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: return Response({"error": "Permission denied"}, status=403)
    
    reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date', '-submitted_at')
    data = []
    for r in reports:
        try:
            recommendations = RecommendationEngine.generate(patient, r) if RecommendationEngine else []
        except Exception:
            recommendations = []

        data.append({
            'id': r.id,
            'date': r.report_date,
            'submitted_at': getattr(r, 'submitted_at', r.report_date),
            'notes': r.notes,
            'well_being_score': r.well_being_score,
            'took_medications': r.took_medications,
            'has_headache': r.has_headache,
            'has_dizziness': r.has_dizziness,
            'has_weakness': r.has_weakness,
            'has_speech_difficulty': r.has_speech_difficulty,
            'has_vision_changes': r.has_vision_changes,
            'has_fever': r.has_fever,
            'has_swallowing_difficulty': r.has_swallowing_difficulty,
            'recommendations': recommendations,
            'ai_recommendation': getattr(r, 'ai_recommendation', '') or '',
            'ai_ready': bool(getattr(r, 'ai_recommendation', '')),
        })
    return Response({"reports": data, "count": len(data)})

# ========== RISK PREDICTION ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def predict_readmission_ml(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: return Response({"error": "Permission denied"}, status=403)
    features = {'age': patient.age, 'nihss_score': patient.nihss_score or 0, 'length_of_stay_days': patient.length_of_stay_days or 0, 'has_urinary_catheter': 0, 'hypercoagulable_state': 0, 'percutaneous_gastrostomy': 0, 'hemodialysis': 0, 'malnutrition': 0, 'discharge_destination': patient.discharge_destination or 'home'}
    try:
        prediction = predictor.predict(features)
        risk_score = prediction.get('risk_score', 0.5)
        risk_category = prediction.get('risk_category', 'Medium')
        patient.current_risk_score = risk_score
        patient.current_risk_category = risk_category
        patient.save()
        return Response({"success": True, "risk_score": risk_score, "risk_category": risk_category, "factors": prediction.get('factors', [])})
    except Exception as e: return Response({"error": f"Prediction failed: {str(e)}"}, status=500)

# ========== DOCTOR DASHBOARD ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_doctor_dashboard(request):
    patients = StrokePatient.objects.filter(is_active=True)
    high = medium = low = 0
    patient_list = []
    for p in patients:
        cat = p.current_risk_category
        if cat == 'High': high += 1
        elif cat == 'Medium': medium += 1
        else: low += 1
        patient_list.append({'id': p.id, 'hospital_id': p.hospital_id, 'name': f"{p.first_name} {p.last_name}", 'age': p.age, 'gender': p.gender, 'risk_score': p.current_risk_score, 'risk_category': cat, 'nihss_score': p.nihss_score, 'admission_date': p.admission_date})
    return Response({'total_patients': patients.count(), 'high_risk_count': high, 'medium_risk_count': medium, 'low_risk_count': low, 'patients': patient_list})

# ========== NOTIFICATIONS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    if not request.user.is_staff: return Response({'count': 0, 'notifications': []})
    qs = Notification.objects.filter(doctor=request.user)
    status = request.GET.get('status', 'unread')
    sort = request.GET.get('sort', '-created_at')
    if status == 'unread': qs = qs.filter(is_read=False, is_archived=False)
    elif status == 'read': qs = qs.filter(is_read=True, is_archived=False)
    elif status == 'archived': qs = qs.filter(is_archived=True)
    qs = qs.order_by(sort)
    data = [{'id': n.id, 'patient_name': f"{n.patient.first_name} {n.patient.last_name}", 'message': n.message, 'created_at': n.created_at, 'is_read': n.is_read, 'is_archived': n.is_archived} for n in qs]
    return Response({'count': qs.count(), 'notifications': data})

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_read = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist: return Response({"error": "Not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.delete()
        return Response({"success": True})
    except Notification.DoesNotExist: return Response({"error": "Not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def archive_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_archived = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist: return Response({"error": "Not found"}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def unarchive_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_archived = False
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist: return Response({"error": "Not found"}, status=404)

# ========== PANIC ALERT ==========
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny]) # Allows access without logging in
def create_panic_alert(request):
    data = request.data
    
    # NEW: Accept standard 'patient_id' OR the new 'identifier' (Hospital ID / Phone)
    identifier = data.get('identifier', '').strip() or data.get('patient_id')
    message = data.get('message', 'EMERGENCY: Patient needs immediate assistance!')
    
    if not identifier: 
        return Response({"error": "Hospital ID or Phone Number is required"}, status=400)
    
    try:
        # If it's a pure number, try finding by internal database ID first
        if str(identifier).isdigit():
            patient = StrokePatient.objects.get(id=int(identifier))
        else:
            # Otherwise, search by Hospital ID (e.g., ST-0004) or Phone Number
            patient = StrokePatient.objects.filter(
                Q(hospital_id__iexact=identifier) | Q(phone_number__iexact=identifier)
            ).first()
            
            if not patient: 
                raise StrokePatient.DoesNotExist
                
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found. Please check the Hospital ID or Phone Number."}, status=404)
        
    # --- ROBUSTNESS: Enforce 3 alerts per day per patient on the server ---
    today = timezone.now().date()
    today_alerts_count = PanicAlert.objects.filter(patient=patient, created_at__date=today).count()
    if today_alerts_count >= 3:
        return Response({"error": "Daily limit reached. Maximum 3 panic alerts per day."}, status=429)

    # Create the alert
    alert = PanicAlert.objects.create(patient=patient, message=message, created_at=timezone.now(), is_resolved=False)
    doctors = User.objects.filter(is_staff=True)
    
    for doctor in doctors:
        # 1. In-app notification
        Notification.objects.create(
            doctor=doctor, patient=patient, 
            message=f"🚨 PANIC ALERT: {patient.first_name} {patient.last_name} - {message}", 
            created_at=timezone.now(), is_read=False, is_archived=False
        )
        
        # 2. Send Instant Email to Doctor
        if doctor.email:
            try:
                send_mail(
                    subject=f"🚨 URGENT: Panic Alert - {patient.first_name} {patient.last_name}",
                    message=f"EMERGENCY!\n\nPatient: {patient.first_name} {patient.last_name} (ID: {patient.hospital_id})\nMessage: {message}\n\nPlease log in to the StrokeReadmit dashboard immediately.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[doctor.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send panic email to {doctor.username}: {e}")

    return Response({
        "success": True, 
        "alert_id": alert.id, 
        "message": "🚨 EMERGENCY ALERT SENT! All doctors have been notified immediately."
    })

# ========== FOLLOW-UP (CLEANED UP) ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def schedule_followup(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    data = request.data
    followup = FollowUp.objects.create(
        patient=patient, doctor=request.user, title=data.get('title', 'Follow-up Appointment'),
        date=data.get('date', timezone.now().date() + timedelta(days=7)), time=data.get('time', '09:00:00'),
        notes=data.get('notes', ''), status='scheduled', created_at=timezone.now(),
    )
    
    # --- TRIGGER APPOINTMENT EMAIL ---
    if EmailNotificationHandler is not None:
        try:
            appt_date = followup.date.strftime('%Y-%m-%d') if followup.date else 'N/A'
            appt_time = str(followup.time)[:5] if followup.time else 'N/A'
            doctor_name = request.user.get_full_name() or request.user.username
            EmailNotificationHandler.send_appointment_confirmation(
                patient_obj=patient,
                appointment_date=appt_date,
                appointment_time=appt_time,
                doctor_name=doctor_name,
                notes=followup.notes
            )
        except Exception as e:
            print(f"⚠️ Appointment email trigger failed: {e}")

    return Response({"success": True, "followup_id": followup.id, "message": "Follow-up scheduled successfully"})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_followups(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: return Response({"error": "Permission denied"}, status=403)
    followups = FollowUp.objects.filter(patient=patient).order_by('date', 'time')
    data = [{'id': f.id, 'doctor': f.doctor.username, 'title': f.title, 'date': f.date, 'time': f.time, 'notes': f.notes, 'status': f.status, 'created_at': f.created_at} for f in followups]
    return Response({"followups": data, "count": len(data)})

@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDoctor])
def update_followup_status(request, followup_id):
    try: followup = FollowUp.objects.get(id=followup_id)
    except FollowUp.DoesNotExist: return Response({"error": "Follow-up not found"}, status=404)
    if followup.doctor != request.user: return Response({"error": "You can only update your own follow-ups"}, status=403)
    status = request.data.get('status')
    if status not in ['scheduled', 'completed', 'cancelled']: return Response({"error": "Invalid status"}, status=400)
    followup.status = status
    followup.save()
    return Response({"success": True, "message": f"Follow-up {status}"})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_doctor_appointments(request):
    followups = FollowUp.objects.filter(doctor=request.user).order_by('date', 'time')
    data = [{'id': f.id, 'patient_id': f.patient.id, 'patient_name': f"{f.patient.first_name} {f.patient.last_name}", 'title': f.title, 'date': f.date, 'time': f.time, 'notes': f.notes, 'status': f.status, 'created_at': f.created_at} for f in followups]
    return Response(data)

# ========== PROFILE ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    user = request.user
    try:
        patient = StrokePatient.objects.get(user=user)
        phone = patient.phone_number
        patient_id = patient.id
    except StrokePatient.DoesNotExist: phone = ''; patient_id = None
    return Response({'id': user.id, 'username': user.username, 'first_name': user.first_name, 'last_name': user.last_name, 'email': user.email, 'role': 'doctor' if user.is_staff else 'patient', 'patient_id': patient_id, 'phone': phone})

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    if 'first_name' in data: user.first_name = data['first_name']
    if 'last_name' in data: user.last_name = data['last_name']
    if 'email' in data: user.email = data['email']
    user.save()
    try:
        patient = StrokePatient.objects.get(user=user)
        if 'phone' in data: patient.phone_number = data['phone']; patient.save()
    except StrokePatient.DoesNotExist: pass
    return Response({"success": True})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    data = request.data
    current = data.get('current')
    new_pass = data.get('new')
    if not current or not new_pass: return Response({"error": "Current and new password are required"}, status=400)
    if not user.check_password(current): return Response({"error": "Current password is incorrect"}, status=400)
    user.set_password(new_pass)
    user.save()
    return Response({"success": True})

# ========== USER MANAGEMENT ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_users(request):
    users = User.objects.all()
    data = []
    for u in users:
        try:
            patient = StrokePatient.objects.get(user=u)
            role = 'patient'
            patient_name = f"{patient.first_name} {patient.last_name}"
            phone = patient.phone_number
        except StrokePatient.DoesNotExist:
            role = 'doctor' if u.is_staff else 'user'
            patient_name = None
            phone = None
        data.append({'id': u.id, 'username': u.username, 'first_name': u.first_name, 'last_name': u.last_name, 'email': u.email, 'role': role, 'patient_name': patient_name, 'phone': phone, 'is_staff': u.is_staff, 'is_active': u.is_active})
    return Response(data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDoctor])
def update_user(request, user_id):
    try: user = User.objects.get(id=user_id)
    except User.DoesNotExist: return Response({"error": "User not found"}, status=404)
    role = request.data.get('role')
    if role:
        if role == 'doctor':
            user.is_staff = True
            StrokePatient.objects.filter(user=user).delete()
        elif role == 'patient':
            user.is_staff = False
            try: StrokePatient.objects.get(user=user)
            except StrokePatient.DoesNotExist:
                StrokePatient.objects.create(user=user, hospital_id=f"ST-{user.id:03d}", first_name=user.first_name or 'Patient', last_name=user.last_name or 'Unknown', age=0, gender='M', assigned_doctor=get_available_doctor())
        else: return Response({"error": "Invalid role"}, status=400)
    if 'is_active' in request.data: user.is_active = request.data['is_active']
    user.save()
    return Response({"success": True})

# ========== PDF/CSV EXPORTS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def export_patient_pdf(request, patient_id):
    try: 
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: 
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: 
        return Response({"error": "Permission denied"}, status=403)
    
    reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date')
    buffer = BytesIO()
    
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    story = []
    
    # --- CUSTOM STYLES ---
    hospital_name_style = ParagraphStyle('HospitalName', parent=styles['Title'], fontSize=22, textColor=colors.HexColor('#0d47a1'), alignment=1, spaceAfter=2, fontName='Helvetica-Bold')
    doc_title_style = ParagraphStyle('DocTitle', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#4b5563'), alignment=1, spaceAfter=4, fontName='Helvetica')
    date_style = ParagraphStyle('DateStyle', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#6b7280'), alignment=1, spaceAfter=15)
    section_title = ParagraphStyle('SectionTitle', parent=styles['Heading2'], fontSize=13, textColor=colors.HexColor('#111827'), spaceBefore=15, spaceAfter=8, fontName='Helvetica-Bold')
    normal_text = ParagraphStyle('NormalText', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#374151'), leading=14)
    
    # --- HEADER ---
    story.append(Paragraph("GIHUNDWE HOSPITAL", hospital_name_style))
    story.append(Paragraph("Department of Neurology & Stroke Care", doc_title_style))
    story.append(Paragraph(f"Confidential Patient Clinical Report | Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}", date_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0d47a1'), spaceAfter=15))
    
    # --- 1. PATIENT DEMOGRAPHICS ---
    story.append(Paragraph("1. PATIENT DEMOGRAPHICS", section_title))
    demo_data = [
        ['Patient Name:', f"{patient.first_name} {patient.last_name}", 'Hospital ID:', patient.hospital_id],
        ['Age / Gender:', f"{patient.age} years / {patient.gender}", 'Phone Number:', patient.phone_number or 'N/A'],
        ['Admission Date:', patient.admission_date.strftime('%Y-%m-%d') if patient.admission_date else 'N/A', 'Length of Stay:', f"{patient.length_of_stay_days or 0} days"],
        ['Discharge Dest:', patient.discharge_destination or 'N/A', 'Assigned Doctor:', patient.assigned_doctor.username if patient.assigned_doctor else 'Unassigned'],
    ]
    demo_table = Table(demo_data, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
    demo_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#6b7280')), ('TEXTCOLOR', (2,0), (2,-1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1,0), (1,-1), colors.HexColor('#111827')), ('TEXTCOLOR', (3,0), (3,-1), colors.HexColor('#111827')),
        ('FONTNAME', (1,0), (1,-1), 'Helvetica-Bold'), ('FONTNAME', (3,0), (3,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6), ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')), ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor('#e2e8f0')),
    ]))
    story.append(demo_table)
    
    # --- 2. CLINICAL RISK PROFILE ---
    story.append(Paragraph("2. CLINICAL RISK PROFILE", section_title))
    risk_percent = f"{patient.current_risk_score*100:.1f}%" if patient.current_risk_score else "0.0%"
    risk_cat = patient.current_risk_category or 'Low'
    
    if risk_cat == 'High': risk_color, risk_bg = colors.HexColor('#dc2626'), colors.HexColor('#fef2f2')
    elif risk_cat == 'Medium': risk_color, risk_bg = colors.HexColor('#d97706'), colors.HexColor('#fffbeb')
    else: risk_color, risk_bg = colors.HexColor('#16a34a'), colors.HexColor('#f0fdf4')
        
    risk_data = [
        ['Current Readmission Risk:', risk_percent, 'Risk Category:', risk_cat.upper()],
        ['Baseline NIHSS Score:', str(patient.nihss_score) if patient.nihss_score is not None else 'N/A', 'Patient Status:', 'Active' if patient.is_active else 'Inactive'],
    ]
    risk_table = Table(risk_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
    risk_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'), ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (0,0), (0,-1), colors.HexColor('#6b7280')), ('TEXTCOLOR', (2,0), (2,-1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1,0), (1,-1), risk_color), ('TEXTCOLOR', (3,0), (3,-1), risk_color),
        ('FONTNAME', (1,0), (1,-1), 'Helvetica-Bold'), ('FONTNAME', (3,0), (3,-1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8), ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BACKGROUND', (0,0), (-1,-1), risk_bg),
        ('BOX', (0,0), (-1,-1), 1, risk_color), ('INNERGRID', (0,0), (-1,-1), 0.5, colors.white),
    ]))
    story.append(risk_table)

    
    
    # --- 3. DAILY MONITORING & SYMPTOM LOG ---
    story.append(Paragraph("3. DAILY MONITORING & SYMPTOM LOG", section_title))
    if reports.exists():
        table_data = [['Date', 'Well-being', 'Meds', 'Reported Symptoms', 'Clinical Notes']]
        for r in reports[:15]: 
            symptoms = []
            if getattr(r, 'has_headache', False): symptoms.append('Headache')
            if getattr(r, 'has_dizziness', False): symptoms.append('Dizziness')
            if getattr(r, 'has_weakness', False): symptoms.append('<b><font color="#dc2626">Weakness</font></b>')
            if getattr(r, 'has_speech_difficulty', False): symptoms.append('<b><font color="#dc2626">Speech</font></b>')
            if getattr(r, 'has_vision_changes', False): symptoms.append('<b><font color="#dc2626">Vision</font></b>')
            if getattr(r, 'has_fever', False): symptoms.append('Fever')
            if getattr(r, 'has_swallowing_difficulty', False): symptoms.append('<b><font color="#dc2626">Swallowing</font></b>')
            
            symptoms_str = ', '.join(symptoms) if symptoms else '<i>None reported</i>'
            notes_str = r.notes if r.notes else '-'
            
            table_data.append([
                Paragraph(r.report_date.strftime('%Y-%m-%d'), normal_text), 
                Paragraph(f"{getattr(r, 'well_being_score', 'N/A')}/5", normal_text),
                Paragraph('Yes' if getattr(r, 'took_medications', False) else '<font color="#dc2626">No</font>', normal_text), 
                Paragraph(symptoms_str, normal_text), 
                Paragraph(notes_str, normal_text)
            ])
            
        report_table = Table(table_data, colWidths=[0.8*inch, 0.7*inch, 0.6*inch, 2.2*inch, 2.7*inch])
        report_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0d47a1')), ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'), ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'), ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 8), ('TOPPADDING', (0,0), (-1,0), 8),
            ('BACKGROUND', (0,1), (-1,-1), colors.white), 
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('FONTSIZE', (0,1), (-1,-1), 8), ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ]))
        story.append(report_table)
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"<i>Showing up to {min(15, reports.count())} recent reports. Total reports on file: {reports.count()}</i>", ParagraphStyle('Italic', parent=normal_text, fontSize=8, textColor=colors.HexColor('#6b7280'))))
    else:
        empty_box_data = [[Paragraph("<i>No daily clinical reports have been submitted for this patient yet. Regular monitoring is highly recommended to establish a baseline for readmission prediction.</i>", ParagraphStyle('Empty', parent=normal_text, textColor=colors.HexColor('#6b7280'), alignment=1))]]
        empty_table = Table(empty_box_data, colWidths=[7*inch])
        empty_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1'), 1, colors.dash),
            ('TOPPADDING', (0,0), (-1,-1), 15), ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ]))
        story.append(empty_table)
        
    # --- FOOTER ---
    story.append(Spacer(1, 0.5*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#94a3b8'), alignment=1)
    story.append(Paragraph("CONFIDENTIAL MEDICAL RECORD - GIHUNDWE HOSPITAL STROKE CARE TEAM", footer_style))
    story.append(Paragraph("This document is generated by the StrokeReadmit Prediction System and is intended for authorized medical personnel only.", footer_style))

    doc.build(story)
    buffer.seek(0)
    
    filename = f"Clinical_Report_{patient.hospital_id}_{patient.last_name}.pdf"
    return FileResponse(buffer, as_attachment=True, filename=filename, content_type='application/pdf')
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def export_patient_csv(request, patient_id):
    try: 
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: 
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user: 
        return Response({"error": "Permission denied"}, status=403)
    
    # Fetch daily reports for the log
    reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date')
    
    # Create the HTTP response with UTF-8 encoding for special characters
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="Clinical_Report_{patient.hospital_id}_{patient.last_name}.csv"'
    
    writer = csv.writer(response)
    
    # --- METADATA HEADER ---
    writer.writerow(['GIHUNDWE HOSPITAL - DEPARTMENT OF NEUROLOGY & STROKE CARE'])
    writer.writerow(['Confidential Patient Clinical Report'])
    writer.writerow([f"Generated: {timezone.now().strftime('%Y-%m-%d %H:%M')}"])
    writer.writerow([]) # Empty row for visual spacing in Excel
    
    # --- 1. PATIENT DEMOGRAPHICS ---
    writer.writerow(['1. PATIENT DEMOGRAPHICS'])
    writer.writerow(['Hospital ID', 'Full Name', 'Age', 'Gender', 'Phone Number', 'Admission Date', 'Length of Stay (Days)', 'Discharge Destination', 'Assigned Doctor'])
    writer.writerow([
        patient.hospital_id,
        f"{patient.first_name} {patient.last_name}",
        patient.age,
        patient.gender,
        patient.phone_number or 'N/A',
        patient.admission_date.strftime('%Y-%m-%d') if patient.admission_date else 'N/A',
        patient.length_of_stay_days or 0,
        patient.discharge_destination or 'N/A',
        patient.assigned_doctor.username if patient.assigned_doctor else 'Unassigned'
    ])
    writer.writerow([]) 
    
    # --- 2. CLINICAL RISK PROFILE ---
    writer.writerow(['2. CLINICAL RISK PROFILE'])
    writer.writerow(['Current Risk Score (%)', 'Risk Category', 'Baseline NIHSS Score', 'Patient Status'])
    
    risk_percent = f"{patient.current_risk_score*100:.1f}%" if patient.current_risk_score else "0.0%"
    risk_cat = patient.current_risk_category or 'Low'
    nihss = str(patient.nihss_score) if patient.nihss_score is not None else 'N/A'
    status = 'Active' if patient.is_active else 'Inactive'
    
    writer.writerow([risk_percent, risk_cat.upper(), nihss, status])
    writer.writerow([]) 
    
    # --- 3. DAILY MONITORING & SYMPTOM LOG ---
    writer.writerow(['3. DAILY MONITORING & SYMPTOM LOG'])
    
    if reports.exists():
        writer.writerow(['Date', 'Well-being Score', 'Medications Taken', 'Reported Symptoms', 'Clinical Notes'])
        for r in reports:
            symptoms = []
            # Highlight severe neurological symptoms for Excel visibility
            if getattr(r, 'has_headache', False): symptoms.append('Headache')
            if getattr(r, 'has_dizziness', False): symptoms.append('Dizziness')
            if getattr(r, 'has_weakness', False): symptoms.append('WEAKNESS (Severe)')
            if getattr(r, 'has_speech_difficulty', False): symptoms.append('SPEECH (Severe)')
            if getattr(r, 'has_vision_changes', False): symptoms.append('VISION (Severe)')
            if getattr(r, 'has_fever', False): symptoms.append('Fever')
            if getattr(r, 'has_swallowing_difficulty', False): symptoms.append('SWALLOWING (Severe)')
            
            symptoms_str = ', '.join(symptoms) if symptoms else 'None reported'
            meds_str = 'Yes' if getattr(r, 'took_medications', False) else 'NO (Missed)'
            notes_str = r.notes if r.notes else '-'
            
            writer.writerow([
                r.report_date.strftime('%Y-%m-%d'),
                f"{getattr(r, 'well_being_score', 'N/A')}/5",
                meds_str,
                symptoms_str,
                notes_str
            ])
    else:
        writer.writerow(['No daily clinical reports have been submitted for this patient yet. Regular monitoring is highly recommended.'])
        
    # --- FOOTER ---
    writer.writerow([])
    writer.writerow(['CONFIDENTIAL MEDICAL RECORD - GIHUNDWE HOSPITAL STROKE CARE TEAM'])
    writer.writerow(['This document is generated by the StrokeReadmit Prediction System and is intended for authorized medical personnel only.'])

    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def export_all_patients_csv(request):
    patients = StrokePatient.objects.filter(is_active=True)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="all_patients_report.csv"'
    writer = csv.writer(response)
    writer.writerow(['Hospital ID', 'Name', 'Age', 'Gender', 'NIHSS Score', 'Risk Score (%)', 'Risk Category', 'Admission Date', 'Last Updated'])
    for p in patients:
        writer.writerow([p.hospital_id, f"{p.first_name} {p.last_name}", p.age, p.gender, p.nihss_score or 'N/A', f"{p.current_risk_score*100:.1f}", p.current_risk_category, p.admission_date.strftime('%Y-%m-%d') if p.admission_date else '', p.last_updated.strftime('%Y-%m-%d %H:%M') if hasattr(p, 'last_updated') and p.last_updated else ''])
    return response

@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_user(request, user_id):
    try: user = User.objects.get(id=user_id)
    except User.DoesNotExist: return Response({"error": "User not found"}, status=404)
    if request.user == user: return Response({"error": "You cannot delete yourself"}, status=400)
    user.delete()
    return Response({"success": True})

# ========== PATIENT REPORT SUMMARY ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_patient_report_summary(request):
    # 1. Initialize the base queryset (THIS WAS MISSING!)
    patients = StrokePatient.objects.filter(is_active=True)
    
    # 2. Get Search Query
    q = request.GET.get('q', '').strip()
    
    # Enforce "Empty by Default" rule: If no search query, return empty results immediately
    if not q:
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 10
        return paginator.get_paginated_response([])

    # 3. Apply Search Filter
    patients = patients.filter(
        Q(first_name__icontains=q) |
        Q(last_name__icontains=q) |
        Q(phone_number__icontains=q) |
        Q(hospital_id__icontains=q)
    )
    
    # 4. Apply Risk Category Filter
    risk_category = request.GET.get('risk_category')
    if risk_category: 
        patients = patients.filter(current_risk_category=risk_category)
        
    # 5. Apply Compliance Filter
    today = timezone.now().date()
    compliance = request.GET.get('compliance')
    if compliance == 'missing':
        patients_with_report_today = DailyPatientReport.objects.filter(report_date=today).values_list('patient_id', flat=True)
        patients = patients.exclude(id__in=patients_with_report_today)
    elif compliance == 'submitted':
        patients_with_report_today = DailyPatientReport.objects.filter(report_date=today).values_list('patient_id', flat=True)
        patients = patients.filter(id__in=patients_with_report_today)
        
    # 6. Pagination & Data Formatting
    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = request.GET.get('page_size', 10)
    paginated = paginator.paginate_queryset(patients, request)
    
    data = []
    for patient in paginated:
        reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date', '-submitted_at')[:5]
        report_list = [{
            'id': r.id, 'date': r.report_date, 'well_being_score': r.well_being_score, 
            'took_medications': r.took_medications, 'has_headache': r.has_headache, 
            'has_dizziness': r.has_dizziness, 'has_weakness': r.has_weakness, 
            'has_speech_difficulty': r.has_speech_difficulty, 'has_vision_changes': r.has_vision_changes, 
            'has_fever': r.has_fever, 'has_swallowing_difficulty': r.has_swallowing_difficulty, 
            'notes': r.notes
        } for r in reports]
        
        latest = report_list[0] if report_list else None
        risk_data = get_synced_risk_data(patient) # Uses our synced helper!
        
        data.append({
            'patient_id': patient.id, 
            'hospital_id': patient.hospital_id, 
            'patient_name': f"{patient.first_name} {patient.last_name}", 
            'risk_score': risk_data['risk_score'], 
            'risk_category': risk_data['risk_category'], 
            'last_report_date': latest['date'] if latest else None, 
            'latest_report': latest, 
            'recent_reports': report_list, 
            'has_report_today': DailyPatientReport.objects.filter(patient=patient, report_date=today).exists()
        })
        
    return paginator.get_paginated_response(data)

# ========== PATIENT REMINDERS ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def send_patient_reminder(request, patient_id):
    try: patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    message = request.data.get('message', "Please submit your daily report today to help us monitor your recovery.")
    reminder = PatientReminder.objects.create(patient=patient, message=message, sent_by=request.user)
    return Response({"success": True, "message": f"Reminder sent to {patient.first_name} {patient.last_name}."})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsPatient])
def get_patient_reminders(request):
    try: patient = StrokePatient.objects.get(user=request.user)
    except StrokePatient.DoesNotExist: return Response({"error": "Patient not found"}, status=404)
    reminders = PatientReminder.objects.filter(patient=patient, is_read=False).order_by('-created_at')
    data = [{'id': r.id, 'message': r.message, 'created_at': r.created_at} for r in reminders]
    return Response({"reminders": data})

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPatient])
def mark_reminder_read(request, reminder_id):
    try:
        reminder = PatientReminder.objects.get(id=reminder_id, patient__user=request.user)
        reminder.is_read = True
        reminder.save()
        return Response({"success": True})
    except PatientReminder.DoesNotExist: return Response({"error": "Reminder not found"}, status=404)

# ========== SEARCH PATIENTS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def search_patients(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 2: return Response({"patients": [], "count": 0, "message": "Please enter at least 2 characters to search."})
    patients = StrokePatient.objects.filter(is_active=True).filter(Q(first_name__icontains=query) | Q(last_name__icontains=query) | Q(phone_number__icontains=query) | Q(hospital_id__icontains=query) | Q(id__icontains=query)).order_by('first_name')
    
    data = []
    for p in patients:
        risk_data = get_synced_risk_data(p)
        data.append({
            'id': p.id, 'hospital_id': p.hospital_id, 'first_name': p.first_name, 
            'last_name': p.last_name, 'age': p.age, 'gender': p.gender, 
            'phone_number': p.phone_number, 'risk_score': risk_data['risk_score'], 
            'risk_category': risk_data['risk_category'], 'admission_date': p.admission_date, 
            'assigned_doctor': p.assigned_doctor.username if p.assigned_doctor else None
        })
    return Response({"patients": data, "count": len(data)})
# ========== BULK EXPORT ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def bulk_export_patients_csv(request):
    patient_ids = request.data.get('patient_ids', [])
    if not patient_ids: return Response({"error": "No patient IDs provided"}, status=400)
    patients = StrokePatient.objects.filter(id__in=patient_ids, is_active=True)
    if not patients.exists(): return Response({"error": "No active patients found for these IDs"}, status=404)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="bulk_patients_export.csv"'
    writer = csv.writer(response)
    writer.writerow(['Hospital ID', 'Name', 'Age', 'Gender', 'Phone', 'NIHSS Score', 'Risk Score (%)', 'Risk Category', 'Admission Date', 'Assigned Doctor', 'Length of Stay (days)'])
    for p in patients:
        writer.writerow([p.hospital_id, f"{p.first_name} {p.last_name}", p.age, p.gender, p.phone_number or 'N/A', p.nihss_score or 'N/A', f"{p.current_risk_score * 100:.1f}" if p.current_risk_score else '0.0', p.current_risk_category or 'N/A', p.admission_date.strftime('%Y-%m-%d') if p.admission_date else '', p.assigned_doctor.username if p.assigned_doctor else 'None', p.length_of_stay_days or '0'])
    return response

# ========== AUTOMATION: MISSED REPORT REMINDERS (NEW) ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def send_missed_report_reminders(request):
    today = timezone.now().date()
    
    # Find patients who already submitted today
    patients_submitted_today = DailyPatientReport.objects.filter(
        report_date=today
    ).values_list('patient_id', flat=True)
    
    # Find active patients who have NOT submitted today
    patients_missing_report = StrokePatient.objects.filter(
        is_active=True
    ).exclude(id__in=patients_submitted_today)
    
    sent_count = 0
    skipped_no_email = 0
    
    if EmailNotificationHandler is not None:
        for patient in patients_missing_report:
            # Check if patient has a user and an email
            if not patient.user or not patient.user.email:
                skipped_no_email += 1
                continue # Skip this patient
                
            try:
                EmailNotificationHandler.send_missed_report_reminder(patient)
                sent_count += 1
            except Exception as e:
                print(f"Failed to send reminder to {patient.first_name}: {e}")
                
    # Build a transparent message for the frontend
    message = f"Reminders sent to {sent_count} patients."
    if skipped_no_email > 0:
        message += f" (Skipped {skipped_no_email} patients: no email on file)."
        
    return Response({
        "success": True,
        "message": message,
        "sent_count": sent_count,
        "skipped_no_email": skipped_no_email
    })
    # ========== STAFF ONBOARDING (DOCTORS & NURSES) ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def create_staff_user(request):
    data = request.data
    first_name = data.get('first_name', '').strip()
    last_name = data.get('last_name', '').strip()
    email = data.get('email', '').strip()
    role = data.get('role', 'doctor') # 'doctor' or 'nurse'

    if not first_name or not email:
        return Response({"error": "First name and email are required."}, status=400)

    # Auto-generate username from email (e.g., john.doe@hospital.com -> john.doe)
    base_username = email.split('@')[0]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    # Generate secure temporary password
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))

    # Create the Staff User
    user = User.objects.create_user(
        username=username,
        email=email,
        password=temp_password,
        first_name=first_name,
        last_name=last_name,
        is_staff=True,  # Grants access to the Doctor/Clinical Dashboard
        is_active=True
    )

    return Response({
        "success": True,
        "message": f"{role.capitalize()} onboarded successfully.",
        "username": username,
        "password": temp_password,
        "email": email,
        "role": role
    })
# ========== FORGOT PASSWORD (TOKEN FLOW) ==========
@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    email = request.data.get('email', '').strip()
    try:
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Send email with the token
        send_mail(
            subject='🔐 Password Reset Request - StrokeReadmit',
            message=f'Hello {user.first_name or user.username},\n\nYou requested a password reset.\n\nYour User ID is: {uid}\nYour Reset Token is: {token}\n\nPlease copy and paste these into the "Forgot Password" screen in the app.\n\nIf you did not request this, please ignore this email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=True,
        )
        return Response({"success": True, "message": "Reset instructions sent to your email."})
    except User.DoesNotExist:
        # We return success anyway to prevent hackers from guessing which emails exist in the DB
        return Response({"success": True, "message": "If an account exists, reset instructions have been sent."})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get('uid', '').strip()
    token = request.data.get('token', '').strip()
    new_password = request.data.get('new_password', '')
    
    if not uid or not token or not new_password:
        return Response({"error": "All fields are required."}, status=400)
    if len(new_password) < 6:
        return Response({"error": "Password must be at least 6 characters."}, status=400)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
        
        if default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({"success": True, "message": "Password reset successful! You can now log in."})
        else:
            return Response({"error": "Invalid or expired token. Please request a new one."}, status=400)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({"error": "Invalid reset request."}, status=400)
   # ========== AI CHATBOT ENDPOINT (NEW SDK) ==========
api_key = getattr(settings, 'GEMINI_API_KEY', '')
# FORCE THE STABLE V1 API
client = genai.Client(
    api_key=api_key,
    http_options=types.HttpOptions(api_version='v1')
) if api_key else None

SYSTEM_PROMPT = """You are the Virtual Care Assistant for Gihundwe Hospital in Rwanda. 
    
CRITICAL LANGUAGE RULE: You must instantly detect the language the patient is typing in (English, Kinyarwanda, French, or Swahili). You MUST reply in the EXACT SAME LANGUAGE they used. Do not reply in English if they speak Kinyarwanda.

MEDICAL TRIAGE RULE: If the patient mentions dizziness, weakness, chest pain, numbness, falling, or emergencies in ANY language, you must urgently tell them to close the chat and click the red 'Panic Button' on their screen immediately.

TONE: Keep answers concise (under 3 sentences), empathetic, and highly professional."""

@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_ai_response(request):
    user_message = request.data.get('message', '').strip()
    if not user_message:
        return Response({"error": "Message is required"}, status=400)
    if client is None:
        return Response({"reply": "The AI assistant is not configured yet. Please contact the hospital support team."}, status=503)

    try:
        # USE THE NEWEST, FASTEST FREE MODEL
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=user_message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT
            )
        )
        return Response({"reply": response.text})
    except Exception as e:
        print(f"AI Error: {e}")
        return Response({"reply": "I am currently experiencing technical difficulties. Please try again in a moment."})
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_report_detail(request, report_id):
    try:
        report = DailyPatientReport.objects.get(id=report_id)
        patient = report.patient
        
        # Gather symptoms from boolean fields
        symptoms_list = []
        if report.has_headache: symptoms_list.append('Headache')
        if report.has_dizziness: symptoms_list.append('Dizziness')
        if report.has_weakness: symptoms_list.append('Weakness')
        if report.has_speech_difficulty: symptoms_list.append('Speech Difficulty')
        if report.has_vision_changes: symptoms_list.append('Vision Changes')
        if report.has_fever: symptoms_list.append('Fever')
        if report.has_swallowing_difficulty: symptoms_list.append('Swallowing Difficulty')
        
        data = {
            'id': report.id,
            'date': report.report_date,
            'submitted_at': getattr(report, 'submitted_at', report.report_date),
            'well_being_score': report.well_being_score,
            'took_medications': report.took_medications,
            'symptoms': ', '.join(symptoms_list) if symptoms_list else (report.notes or 'No specific symptoms reported.'),
            'ai_recommendation': getattr(report, 'ai_recommendation', 'Standard monitoring protocols apply.'),
            'risk_score': getattr(patient, 'current_risk_score', 0) or 0
        }
        return Response(data, status=200)
    except DailyPatientReport.DoesNotExist: 
        return Response({'error': 'Report not found'}, status=404)