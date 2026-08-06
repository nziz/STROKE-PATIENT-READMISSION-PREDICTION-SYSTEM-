# app/views.py (add this to your existing file)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import StrokePatient, Notification
from .ml_predictor import predict_readmission

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def predict_readmission_endpoint(request, patient_id):
    try:
        patient = StrokePatient.objects.get(id=patient_id)
    except StrokePatient.DoesNotExist:
        return Response({"error": "Patient not found"}, status=404)
    
    # Prepare data for the model (map database fields to model features)
    patient_data = {
        'age': patient.age,
        'nihss_score': patient.nihss_score or 0,
        'length_of_stay_days': patient.length_of_stay_days,
        'has_urinary_catheter': 1 if patient.has_urinary_catheter else 0,
        'hypercoagulable_state': 1 if patient.hypercoagulable_state else 0,
        'percutaneous_gastrostomy': 1 if patient.percutaneous_gastrostomy else 0,
        'hemodialysis': 1 if patient.hemodialysis else 0,
        'malnutrition': 1 if patient.malnutrition else 0,
    }
    
    # Get prediction
    risk_result = predict_readmission(patient_data)
    
    # Update patient's last risk score
    patient.last_risk_score = risk_result['final_score']
    patient.last_risk_category = risk_result['risk_category']
    patient.save()
    
    # Create notification if risk is High or Medium
    if risk_result['risk_category'] in ['High', 'Medium']:
        Notification.objects.create(
            user=request.user,
            patient=patient,
            message=f"Patient {patient.first_name} {patient.last_name} has a {risk_result['risk_category']} readmission risk ({risk_result['final_score']*100:.1f}%). Please review discharge plan."
        )
    
    return Response(risk_result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    notifications = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')
    data = [{
        'id': n.id,
        'patient': f"{n.patient.first_name} {n.patient.last_name}",
        'message': n.message,
        'created_at': n.created_at,
        'is_read': n.is_read
    } for n in notifications]
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    try:
        notification = Notification.objects.get(id=notification_id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"success": True})
    except Notification.DoesNotExist:
        return Response({"error": "Notification not found"}, status=404)