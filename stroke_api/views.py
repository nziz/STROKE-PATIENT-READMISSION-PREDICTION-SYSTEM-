# stroke_api/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from datetime import timedelta
import csv

from .models import StrokePatient, DailyPatientReport, Notification, PanicAlert, FollowUp
from .ml_models import StrokeReadmissionPredictor

predictor = StrokeReadmissionPredictor()


# ========== HELPER FUNCTIONS ==========
def get_doctor_for_notification(patient=None):
    if patient and patient.assigned_doctor:
        return patient.assigned_doctor
    return User.objects.filter(is_staff=True).first()


def calculate_initial_risk(patient):
    risk = 0.0
    if patient.nihss_score and patient.nihss_score > 24:
        risk += 0.30
    elif patient.nihss_score and patient.nihss_score > 12:
        risk += 0.20
    elif patient.nihss_score and patient.nihss_score > 4:
        risk += 0.10
    if patient.has_urinary_catheter:
        risk += 0.15
    if patient.hypercoagulable_state:
        risk += 0.15
    if patient.percutaneous_gastrostomy:
        risk += 0.15
    if patient.hemodialysis:
        risk += 0.10
    if patient.malnutrition:
        risk += 0.15
    if patient.discharge_destination in ['snf', 'rehab']:
        risk += 0.10
    if patient.length_of_stay_days > 7:
        risk += 0.05
    return min(risk, 1.0)


# ========== CSRF TOKEN ==========
@ensure_csrf_cookie
@api_view(['GET'])
@permission_classes([AllowAny])
def get_csrf_token(request):
    """Frontend should call this on app load to get CSRF cookie set."""
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
@permission_classes([IsAuthenticated])
def register_patient(request):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_patients(request):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_detail(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_patient(request, patient_id):
    if not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=403)
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
@permission_classes([IsAuthenticated])
def submit_daily_report(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_reports(request, patient_id):
    # ... (your existing code, unchanged)
    pass


# ========== RISK PREDICTION ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_readmission_ml(request, patient_id):
    # ... (your existing code, unchanged)
    pass


# ========== DOCTOR DASHBOARD ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
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


# ========== NOTIFICATIONS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
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
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_read = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.delete()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def archive_notification(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, doctor=request.user)
        notification.is_archived = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Not found"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
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
    # ... (your existing code, unchanged)
    pass


# ========== FOLLOW-UP ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def schedule_followup(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient_followups(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_followup_status(request, followup_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_doctor_appointments(request):
    if not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=403)
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


# ========== USER MANAGEMENT (Doctor only) ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    if not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=403)
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
@permission_classes([IsAuthenticated])
def update_user(request, user_id):
    if not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=403)
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    role = request.data.get('role')
    if not role:
        return Response({"error": "Role is required"}, status=400)
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
                assigned_doctor=User.objects.filter(is_staff=True).first()
            )
    else:
        return Response({"error": "Invalid role"}, status=400)
    user.save()
    return Response({"success": True})


# ========== PDF/CSV EXPORTS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_patient_pdf(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_patient_csv(request, patient_id):
    # ... (your existing code, unchanged)
    pass


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_all_patients_csv(request):
    if not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=403)
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
            p.last_updated.strftime('%Y-%m-%d %H:%M') if p.last_updated else ''
        ])
    return response