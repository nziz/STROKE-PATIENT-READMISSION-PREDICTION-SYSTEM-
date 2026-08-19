import csv
import secrets
import string
from datetime import timedelta
from io import BytesIO

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

from .models import (
    StrokePatient,
    DailyPatientReport,
    Notification,
    PanicAlert,
    FollowUp,
    PatientReminder,
)
from .ml_models import StrokeReadmissionPredictor
from django.conf import settings

# ========== NEW IMPORTS – FALLBACK IF MODULES MISSING ==========
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
    """Allows access only to staff users (doctors)."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_staff


class IsPatient(BasePermission):
    """Allows access only to users with a linked Patient record."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return StrokePatient.objects.filter(user=request.user).exists()


class IsOwnerOrDoctor(BasePermission):
    """Allows if user is the patient themselves OR a doctor."""
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
    if patient.nihss_score and patient.nihss_score > 24:
        risk += 0.30
    elif patient.nihss_score and patient.nihss_score > 12:
        risk += 0.20
    elif patient.nihss_score and patient.nihss_score > 4:
        risk += 0.10
    if patient.discharge_destination in ['snf', 'rehab']:
        risk += 0.10
    if patient.length_of_stay_days and patient.length_of_stay_days > 7:
        risk += 0.05
    return min(risk, 1.0)


# ========== CSRF TOKEN ==========
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    return Response({'csrfToken': get_token(request)})


# ========== AUTHENTICATION ==========
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'success': False, 'error': 'Invalid credentials'}, status=401)
    login(request, user)
    try:
        patient = StrokePatient.objects.get(user=user)
        role = 'patient'
        patient_id = patient.id
        name = f"{patient.first_name} {patient.last_name}"
    except StrokePatient.DoesNotExist:
        if not user.is_staff:
            return Response(
                {'success': False, 'error': 'Your account has not been assigned a patient or doctor role.'},
                status=403,
            )
        role = 'doctor'
        patient_id = None
        name = user.get_full_name() or user.username
    return Response({
        'success': True,
        'username': user.username,
        'role': role,
        'patient_id': patient_id,
        'name': name,
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
    user = User.objects.create_user(
        username=username,
        password=password,
        email=data.get('email', ''),
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', '')
    )
    assigned_doctor = request.user if request.user.is_staff else get_available_doctor()
    patient = StrokePatient.objects.create(
        user=user,
        hospital_id=data.get('hospital_id', f"ST-{user.id:04d}"),
        first_name=data.get('first_name') or 'Patient',
        last_name=data.get('last_name') or 'Unknown',
        age=data.get('age', 0),
        gender=data.get('gender', 'M'),
        phone_number=data.get('phone_number', ''),
        admission_date=data.get('admission_date', timezone.now().date()),
        nihss_score=data.get('nihss_score', 0),
        discharge_destination=data.get('discharge_destination', 'home'),
        length_of_stay_days=data.get('length_of_stay_days', 0),
        assigned_doctor=assigned_doctor,
        is_active=True,
    )
    patient.current_risk_score = calculate_initial_risk(patient)
    if patient.current_risk_score >= 0.5:
        patient.current_risk_category = 'High'
    elif patient.current_risk_score >= 0.25:
        patient.current_risk_category = 'Medium'
    else:
        patient.current_risk_category = 'Low'
    patient.save()
    if assigned_doctor:
        Notification.objects.create(
            doctor=assigned_doctor,
            patient=patient,
            message=f"New patient {patient.first_name} {patient.last_name} registered and assigned to you.",
            created_at=timezone.now(),
            is_read=False,
            is_archived=False,
        )
    return Response({
        "success": True,
        "patient_id": patient.id,
        "hospital_id": patient.hospital_id,
        "username": username,
        "password": password,
        "risk_score": patient.current_risk_score,
        "risk_category": patient.current_risk_category,
        "assigned_doctor": assigned_doctor.username if assigned_doctor else None,
        "message": "Patient registered successfully"
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_all_patients(request):
    patients = StrokePatient.objects.filter(is_active=True)
    data = [{
        'id': p.id,
        'hospital_id': p.hospital_id,
        'name': f"{p.first_name} {p.last_name}",
        'age': p.age,
        'gender': p.gender,
        'risk_score': p.current_risk_score,
        'risk_category': p.current_risk_category,
        'admission_date': p.admission_date,
        'phone_number': p.phone_number,
        'assigned_doctor': p.assigned_doctor.username if p.assigned_doctor else None,
    } for p in patients]
    return Response({"patients": data, "count": len(data)})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_detail(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user:
        return Response({"error": "Permission denied"}, status=403)
    response_data = {
        'id': patient.id,
        'hospital_id': patient.hospital_id,
        'first_name': patient.first_name,
        'last_name': patient.last_name,
        'age': patient.age,
        'gender': patient.gender,
        'phone_number': patient.phone_number,
        'admission_date': patient.admission_date,
        'nihss_score': patient.nihss_score,
        'risk_score': patient.current_risk_score,
        'risk_category': patient.current_risk_category,
        'discharge_destination': patient.discharge_destination,
        'length_of_stay_days': patient.length_of_stay_days,
        'assigned_doctor': patient.assigned_doctor.username if patient.assigned_doctor else None,
    }
    if hasattr(patient, 'created_at'):
        response_data['created_at'] = patient.created_at
    if hasattr(patient, 'last_updated'):
        response_data['last_updated'] = patient.last_updated
    return Response(response_data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_patient(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id)
        user = patient.user
        patient.delete()
        if user:
            user.delete()
        return Response({"success": True})
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)


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

    # 1. Create Report
    report = DailyPatientReport.objects.create(
        patient=patient,
        report_date=timezone.now().date(),
        notes=data.get('notes', ''),
        well_being_score=data.get('well_being_score', 3),
        took_medications=data.get('took_medications', False),
        has_headache=data.get('has_headache', False),
        has_dizziness=data.get('has_dizziness', False),
        has_weakness=data.get('has_weakness', False),
        has_speech_difficulty=data.get('has_speech_difficulty', False),
        has_vision_changes=data.get('has_vision_changes', False),
        has_fever=data.get('has_fever', False),
        has_swallowing_difficulty=data.get('has_swallowing_difficulty', False),
    )

    # 2. Update Risk
    risk_increase = report.calculate_risk_increase()
    old_risk = patient.current_risk_score or 0.0

    if data.get('nihss_score') is not None:
        patient.nihss_score = data['nihss_score']
        patient.current_risk_score = calculate_initial_risk(patient)
        if patient.current_risk_score >= 0.5:
            patient.current_risk_category = 'High'
        elif patient.current_risk_score >= 0.25:
            patient.current_risk_category = 'Medium'
        else:
            patient.current_risk_category = 'Low'
        patient.save()
        new_risk = patient.current_risk_score
        risk_category = patient.current_risk_category
    else:
        new_risk = min(old_risk + risk_increase, 1.0)
        if new_risk >= 0.5:
            risk_category = 'High'
        elif new_risk >= 0.25:
            risk_category = 'Medium'
        else:
            risk_category = 'Low'
        patient.current_risk_score = new_risk
        patient.current_risk_category = risk_category
        patient.save()

    # 3. Generate Recommendations (if module exists)
    recommendations = []
    if RecommendationEngine is not None:
        try:
            recommendations = RecommendationEngine.generate(patient, report)
        except Exception as e:
            print(f"⚠️ Recommendation generation failed: {e}")
            recommendations = []
    else:
        # Provide a fallback default recommendation
        recommendations = [{
            'priority': 'STANDARD',
            'action': 'Monitor patient regularly',
            'details': 'Complete daily report and follow standard protocols.'
        }]

    # 4. Trigger Email if High Risk (only if handler exists)
    if (getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False) and
        risk_category == 'High' and patient.assigned_doctor and
        EmailNotificationHandler is not None):
        risk_percent = new_risk * 100
        try:
            EmailNotificationHandler.send_doctor_emergency_alert(
                doctor_user=patient.assigned_doctor,
                patient_obj=patient,
                risk_percent=risk_percent,
                recommendations=recommendations
            )
        except Exception as e:
            print(f"⚠️ Doctor email failed: {e}")

        if patient.user and patient.user.email:
            try:
                EmailNotificationHandler.send_patient_confirmation(
                    patient_obj=patient,
                    risk_percent=risk_percent,
                    risk_level=risk_category,
                    recommendations=recommendations
                )
            except Exception as e:
                print(f"⚠️ Patient email failed: {e}")

    # 5. Collect symptoms
    symptoms_reported = []
    if report.has_headache: symptoms_reported.append('Headache')
    if report.has_dizziness: symptoms_reported.append('Dizziness')
    if report.has_weakness: symptoms_reported.append('Weakness')
    if report.has_speech_difficulty: symptoms_reported.append('Speech Difficulty')
    if report.has_vision_changes: symptoms_reported.append('Vision Changes')
    if report.has_fever: symptoms_reported.append('Fever')
    if report.has_swallowing_difficulty: symptoms_reported.append('Swallowing Difficulty')

    # 6. Return Response
    return Response({
        "success": True,
        "report_id": report.id,
        "message": "Daily report submitted successfully",
        "risk_increase": risk_increase,
        "new_risk_score": new_risk,
        "risk_category": risk_category,
        "risk_percentage": round(new_risk * 100, 1),
        "symptoms_reported": symptoms_reported,
        "recommendations": recommendations,
        "redirect_to": f"/reports/{report.id}/results" if getattr(settings, 'ENABLE_NEW_RESULTS_PAGE', False) else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_reports(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user:
        return Response({"error": "Permission denied"}, status=403)
    reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date', '-submitted_at')
    data = [{
        'id': r.id,
        'date': r.report_date,
        'submitted_at': r.submitted_at,
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
    } for r in reports]
    return Response({"reports": data, "count": len(data)})


# ========== RISK PREDICTION ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def predict_readmission_ml(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user:
        return Response({"error": "Permission denied"}, status=403)
    features = {
        'age': patient.age,
        'nihss_score': patient.nihss_score or 0,
        'length_of_stay_days': patient.length_of_stay_days or 0,
        'has_urinary_catheter': 0,
        'hypercoagulable_state': 0,
        'percutaneous_gastrostomy': 0,
        'hemodialysis': 0,
        'malnutrition': 0,
        'discharge_destination': patient.discharge_destination or 'home',
    }
    try:
        prediction = predictor.predict(features)
        risk_score = prediction.get('risk_score', 0.5)
        risk_category = prediction.get('risk_category', 'Medium')
        patient.current_risk_score = risk_score
        patient.current_risk_category = risk_category
        patient.save()
        return Response({
            "success": True,
            "risk_score": risk_score,
            "risk_category": risk_category,
            "factors": prediction.get('factors', []),
        })
    except Exception as e:
        return Response({"error": f"Prediction failed: {str(e)}"}, status=500)


# ========== DOCTOR DASHBOARD ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_doctor_dashboard(request):
    patients = StrokePatient.objects.filter(is_active=True)
    high = medium = low = 0
    patient_list = []
    for p in patients:
        cat = p.current_risk_category
        if cat == 'High':
            high += 1
        elif cat == 'Medium':
            medium += 1
        else:
            low += 1
        patient_list.append({
            'id': p.id,
            'hospital_id': p.hospital_id,
            'name': f"{p.first_name} {p.last_name}",
            'age': p.age,
            'gender': p.gender,
            'risk_score': p.current_risk_score,
            'risk_category': cat,
            'nihss_score': p.nihss_score,
            'admission_date': p.admission_date
        })
    return Response({
        'total_patients': patients.count(),
        'high_risk_count': high,
        'medium_risk_count': medium,
        'low_risk_count': low,
        'patients': patient_list
    })


# ========== NOTIFICATIONS (NO 403 FOR NON-DOCTORS) ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Allow any authenticated user
def get_notifications(request):
    # If the user is not a doctor, return empty list (no 403)
    if not request.user.is_staff:
        return Response({'count': 0, 'notifications': []})

    qs = Notification.objects.filter(doctor=request.user)
    status = request.GET.get('status', 'unread')
    sort = request.GET.get('sort', '-created_at')
    if status == 'unread':
        qs = qs.filter(is_read=False, is_archived=False)
    elif status == 'read':
        qs = qs.filter(is_read=True, is_archived=False)
    elif status == 'archived':
        qs = qs.filter(is_archived=True)
    qs = qs.order_by(sort)
    data = [{
        'id': n.id,
        'patient_name': f"{n.patient.first_name} {n.patient.last_name}",
        'message': n.message,
        'created_at': n.created_at,
        'is_read': n.is_read,
        'is_archived': n.is_archived,
    } for n in qs]
    return Response({'count': qs.count(), 'notifications': data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_read = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.delete()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def archive_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_archived = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def unarchive_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_archived = False
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


# ========== PANIC ALERT ==========
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def create_panic_alert(request):
    data = request.data
    patient_id = data.get('patient_id')
    message = data.get('message', 'Panic alert triggered!')
    if not patient_id:
        return Response({"error": "Patient ID required"}, status=400)
    try:
        patient = StrokePatient.objects.get(id=patient_id)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    alert = PanicAlert.objects.create(
        patient=patient,
        message=message,
        created_at=timezone.now(),
        is_resolved=False
    )
    doctors = User.objects.filter(is_staff=True)
    for doctor in doctors:
        Notification.objects.create(
            doctor=doctor,
            patient=patient,
            message=f"🚨 PANIC ALERT: {patient.first_name} {patient.last_name} - {message}",
            created_at=timezone.now(),
            is_read=False,
            is_archived=False,
        )
    return Response({
        "success": True,
        "alert_id": alert.id,
        "message": "Panic alert sent to all doctors"
    })


# ========== FOLLOW-UP ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def schedule_followup(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    data = request.data
    followup = FollowUp.objects.create(
        patient=patient,
        doctor=request.user,
        title=data.get('title', 'Follow-up Appointment'),
        date=data.get('date', timezone.now().date() + timedelta(days=7)),
        time=data.get('time', '09:00:00'),
        notes=data.get('notes', ''),
        status='scheduled',
        created_at=timezone.now(),
    )
    return Response({
        "success": True,
        "followup_id": followup.id,
        "message": "Follow-up scheduled successfully"
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def get_patient_followups(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user:
        return Response({"error": "Permission denied"}, status=403)
    followups = FollowUp.objects.filter(patient=patient).order_by('date', 'time')
    data = [{
        'id': f.id,
        'doctor': f.doctor.username,
        'title': f.title,
        'date': f.date,
        'time': f.time,
        'notes': f.notes,
        'status': f.status,
        'created_at': f.created_at,
    } for f in followups]
    return Response({"followups": data, "count": len(data)})


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDoctor])
def update_followup_status(request, followup_id):
    try:
        followup = FollowUp.objects.get(id=followup_id)
    except FollowUp.DoesNotExist:
        return Response({"error": "Follow-up not found"}, status=404)
    if followup.doctor != request.user:
        return Response({"error": "You can only update your own follow-ups"}, status=403)
    status = request.data.get('status')
    if status not in ['scheduled', 'completed', 'cancelled']:
        return Response({"error": "Invalid status"}, status=400)
    followup.status = status
    followup.save()
    return Response({"success": True, "message": f"Follow-up {status}"})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_doctor_appointments(request):
    followups = FollowUp.objects.filter(doctor=request.user).order_by('date', 'time')
    data = [{
        'id': f.id,
        'patient_id': f.patient.id,
        'patient_name': f"{f.patient.first_name} {f.patient.last_name}",
        'title': f.title,
        'date': f.date,
        'time': f.time,
        'notes': f.notes,
        'status': f.status,
        'created_at': f.created_at,
    } for f in followups]
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
    except StrokePatient.DoesNotExist:
        phone = ''
        patient_id = None
    return Response({
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'role': 'doctor' if user.is_staff else 'patient',
        'patient_id': patient_id,
        'phone': phone,
    })


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user
    data = request.data
    if 'first_name' in data:
        user.first_name = data['first_name']
    if 'last_name' in data:
        user.last_name = data['last_name']
    if 'email' in data:
        user.email = data['email']
    user.save()
    try:
        patient = StrokePatient.objects.get(user=user)
        if 'phone' in data:
            patient.phone_number = data['phone']
            patient.save()
    except StrokePatient.DoesNotExist:
        pass
    return Response({"success": True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    data = request.data
    current = data.get('current')
    new_pass = data.get('new')
    if not current or not new_pass:
        return Response({"error": "Current and new password are required"}, status=400)
    if not user.check_password(current):
        return Response({"error": "Current password is incorrect"}, status=400)
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
        data.append({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'role': role,
            'patient_name': patient_name,
            'phone': phone,
            'is_staff': u.is_staff,
            'is_active': u.is_active,
        })
    return Response(data)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsDoctor])
def update_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    role = request.data.get('role')
    if role:
        if role == 'doctor':
            user.is_staff = True
            StrokePatient.objects.filter(user=user).delete()
        elif role == 'patient':
            user.is_staff = False
            try:
                patient = StrokePatient.objects.get(user=user)
            except StrokePatient.DoesNotExist:
                StrokePatient.objects.create(
                    user=user,
                    hospital_id=f"ST-{user.id:03d}",
                    first_name=user.first_name or 'Patient',
                    last_name=user.last_name or 'Unknown',
                    age=0,
                    gender='M',
                    assigned_doctor=get_available_doctor()
                )
        else:
            return Response({"error": "Invalid role"}, status=400)
    if 'is_active' in request.data:
        user.is_active = request.data['is_active']
        user.save()
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
    doc = SimpleDocTemplate(buffer, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    story = []
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Title'],
        fontSize=18,
        textColor=colors.darkblue,
        alignment=1,
        spaceAfter=12
    )
    story.append(Paragraph(f"Patient Report: {patient.first_name} {patient.last_name}", title_style))
    story.append(Spacer(1, 0.25*inch))
    details_style = styles['Normal']
    details = [
        f"<b>Patient ID:</b> {patient.hospital_id}",
        f"<b>Admission Date:</b> {patient.admission_date.strftime('%Y-%m-%d') if patient.admission_date else 'N/A'}",
        f"<b>Age:</b> {patient.age} years",
        f"<b>Gender:</b> {patient.gender}",
        f"<b>Phone:</b> {patient.phone_number or 'N/A'}",
        f"<b>NIHSS Score:</b> {patient.nihss_score or 'N/A'}",
        f"<b>Risk Score:</b> {patient.current_risk_score*100:.1f}%",
        f"<b>Risk Category:</b> {patient.current_risk_category}",
        f"<b>Length of Stay:</b> {patient.length_of_stay_days} days",
        f"<b>Discharge Destination:</b> {patient.discharge_destination}",
        f"<b>Assigned Doctor:</b> {patient.assigned_doctor.username if patient.assigned_doctor else 'None'}",
    ]
    for line in details:
        story.append(Paragraph(line, details_style))
        story.append(Spacer(1, 0.1*inch))
    if reports.exists():
        story.append(PageBreak())
        story.append(Paragraph("<b>Daily Reports History</b>", title_style))
        story.append(Spacer(1, 0.2*inch))
        table_data = [['Date', 'Well-being', 'Meds Taken', 'Symptoms']]
        for r in reports[:10]:
            symptoms = []
            if getattr(r, 'has_headache', False): symptoms.append('Headache')
            if getattr(r, 'has_dizziness', False): symptoms.append('Dizziness')
            if getattr(r, 'has_weakness', False): symptoms.append('Weakness')
            if getattr(r, 'has_speech_difficulty', False): symptoms.append('Speech')
            if getattr(r, 'has_vision_changes', False): symptoms.append('Vision')
            if getattr(r, 'has_fever', False): symptoms.append('Fever')
            if getattr(r, 'has_swallowing_difficulty', False): symptoms.append('Swallowing')
            symptoms_str = ', '.join(symptoms) if symptoms else 'None'
            table_data.append([
                r.report_date.strftime('%Y-%m-%d'),
                str(getattr(r, 'well_being_score', 'N/A')),
                'Yes' if getattr(r, 'took_medications', False) else 'No',
                symptoms_str
            ])
        table = Table(table_data, colWidths=[1.2*inch, 0.8*inch, 0.8*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('BACKGROUND', (0,1), (-1,-1), colors.beige),
            ('GRID', (0,0), (-1,-1), 1, colors.black),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph(f"<i>Showing up to {min(10, reports.count())} recent reports. Total: {reports.count()}</i>", styles['Normal']))
    else:
        story.append(Paragraph("<i>No daily reports found for this patient.</i>", styles['Normal']))
    doc.build(story)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True,
                       filename=f"patient_{patient.hospital_id}_report.pdf",
                       content_type='application/pdf')


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOwnerOrDoctor])
def export_patient_csv(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    if not request.user.is_staff and patient.user != request.user:
        return Response({"error": "Permission denied"}, status=403)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="patient_{patient.hospital_id}_report.csv"'
    writer = csv.writer(response)
    writer.writerow([
        'Hospital ID', 'Name', 'Age', 'Gender', 'Phone',
        'NIHSS Score', 'Risk Score (%)', 'Risk Category',
        'Admission Date', 'Last Updated'
    ])
    writer.writerow([
        patient.hospital_id,
        f"{patient.first_name} {patient.last_name}",
        patient.age,
        patient.gender,
        patient.phone_number,
        patient.nihss_score or 'N/A',
        f"{patient.current_risk_score*100:.1f}",
        patient.current_risk_category,
        patient.admission_date.strftime('%Y-%m-%d') if patient.admission_date else '',
        patient.last_updated.strftime('%Y-%m-%d %H:%M') if hasattr(patient, 'last_updated') and patient.last_updated else ''
    ])
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def export_all_patients_csv(request):
    patients = StrokePatient.objects.filter(is_active=True)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="all_patients_report.csv"'
    writer = csv.writer(response)
    writer.writerow([
        'Hospital ID', 'Name', 'Age', 'Gender',
        'NIHSS Score', 'Risk Score (%)', 'Risk Category',
        'Admission Date', 'Last Updated'
    ])
    for p in patients:
        writer.writerow([
            p.hospital_id,
            f"{p.first_name} {p.last_name}",
            p.age,
            p.gender,
            p.nihss_score or 'N/A',
            f"{p.current_risk_score*100:.1f}",
            p.current_risk_category,
            p.admission_date.strftime('%Y-%m-%d') if p.admission_date else '',
            p.last_updated.strftime('%Y-%m-%d %H:%M') if hasattr(p, 'last_updated') and p.last_updated else ''
        ])
    return response


# ========== DELETE USER ==========
@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsDoctor])
def delete_user(request, user_id):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    if request.user == user:
        return Response({"error": "You cannot delete yourself"}, status=400)
    user.delete()
    return Response({"success": True})


# ========== PATIENT REPORT SUMMARY ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def get_patient_report_summary(request):
    patients = StrokePatient.objects.filter(is_active=True)
    risk_category = request.GET.get('risk_category')
    if risk_category:
        patients = patients.filter(current_risk_category=risk_category)
    today = timezone.now().date()
    compliance = request.GET.get('compliance')
    if compliance == 'missing':
        patients_with_report_today = DailyPatientReport.objects.filter(
            report_date=today
        ).values_list('patient_id', flat=True)
        patients = patients.exclude(id__in=patients_with_report_today)
    elif compliance == 'submitted':
        patients_with_report_today = DailyPatientReport.objects.filter(
            report_date=today
        ).values_list('patient_id', flat=True)
        patients = patients.filter(id__in=patients_with_report_today)

    from rest_framework.pagination import PageNumberPagination
    paginator = PageNumberPagination()
    paginator.page_size = request.GET.get('page_size', 10)
    paginated = paginator.paginate_queryset(patients, request)

    data = []
    for patient in paginated:
        reports = DailyPatientReport.objects.filter(patient=patient).order_by('-report_date', '-submitted_at')[:5]
        report_list = [{
            'id': r.id,
            'date': r.report_date,
            'well_being_score': r.well_being_score,
            'took_medications': r.took_medications,
            'has_headache': r.has_headache,
            'has_dizziness': r.has_dizziness,
            'has_weakness': r.has_weakness,
            'has_speech_difficulty': r.has_speech_difficulty,
            'has_vision_changes': r.has_vision_changes,
            'has_fever': r.has_fever,
            'has_swallowing_difficulty': r.has_swallowing_difficulty,
            'notes': r.notes,
        } for r in reports]

        latest = report_list[0] if report_list else None
        data.append({
            'patient_id': patient.id,
            'hospital_id': patient.hospital_id,
            'patient_name': f"{patient.first_name} {patient.last_name}",
            'risk_score': patient.current_risk_score,
            'risk_category': patient.current_risk_category,
            'last_report_date': latest['date'] if latest else None,
            'latest_report': latest,
            'recent_reports': report_list,
            'has_report_today': DailyPatientReport.objects.filter(patient=patient, report_date=today).exists(),
        })
    return paginator.get_paginated_response(data)


# ========== PATIENT REMINDERS ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def send_patient_reminder(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id, is_active=True)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    message = request.data.get('message', "Please submit your daily report today to help us monitor your recovery.")
    reminder = PatientReminder.objects.create(
        patient=patient,
        message=message,
        sent_by=request.user
    )
    return Response({
        "success": True,
        "message": f"Reminder sent to {patient.first_name} {patient.last_name}."
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsPatient])
def get_patient_reminders(request):
    try:
        patient = StrokePatient.objects.get(user=request.user)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    reminders = PatientReminder.objects.filter(patient=patient, is_read=False).order_by('-created_at')
    data = [{
        'id': r.id,
        'message': r.message,
        'created_at': r.created_at,
    } for r in reminders]
    return Response({"reminders": data})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsPatient])
def mark_reminder_read(request, reminder_id):
    try:
        reminder = PatientReminder.objects.get(id=reminder_id, patient__user=request.user)
        reminder.is_read = True
        reminder.save()
        return Response({"success": True})
    except PatientReminder.DoesNotExist:
        return Response({"error": "Reminder not found"}, status=404)


# ========== SEARCH PATIENTS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsDoctor])
def search_patients(request):
    query = request.GET.get('q', '').strip()
    if len(query) < 2:
        return Response({"patients": [], "count": 0, "message": "Please enter at least 2 characters to search."})
    patients = StrokePatient.objects.filter(is_active=True).filter(
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query) |
        Q(phone_number__icontains=query) |
        Q(hospital_id__icontains=query) |
        Q(id__icontains=query)
    ).order_by('first_name')
    data = [{
        'id': p.id,
        'hospital_id': p.hospital_id,
        'first_name': p.first_name,
        'last_name': p.last_name,
        'age': p.age,
        'gender': p.gender,
        'phone_number': p.phone_number,
        'risk_score': p.current_risk_score,
        'risk_category': p.current_risk_category,
        'admission_date': p.admission_date,
        'assigned_doctor': p.assigned_doctor.username if p.assigned_doctor else None,
    } for p in patients]
    return Response({"patients": data, "count": len(data)})


# ========== BULK EXPORT ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDoctor])
def bulk_export_patients_csv(request):
    patient_ids = request.data.get('patient_ids', [])
    if not patient_ids:
        return Response({"error": "No patient IDs provided"}, status=400)
    patients = StrokePatient.objects.filter(id__in=patient_ids, is_active=True)
    if not patients.exists():
        return Response({"error": "No active patients found for these IDs"}, status=404)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="bulk_patients_export.csv"'
    writer = csv.writer(response)
    writer.writerow([
        'Hospital ID', 'Name', 'Age', 'Gender', 'Phone',
        'NIHSS Score', 'Risk Score (%)', 'Risk Category',
        'Admission Date', 'Assigned Doctor', 'Length of Stay (days)'
    ])
    for p in patients:
        writer.writerow([
            p.hospital_id,
            f"{p.first_name} {p.last_name}",
            p.age,
            p.gender,
            p.phone_number or 'N/A',
            p.nihss_score or 'N/A',
            f"{p.current_risk_score * 100:.1f}" if p.current_risk_score else '0.0',
            p.current_risk_category or 'N/A',
            p.admission_date.strftime('%Y-%m-%d') if p.admission_date else '',
            p.assigned_doctor.username if p.assigned_doctor else 'None',
            p.length_of_stay_days or '0'
        ])
    return response