from django.db import models
from django.contrib.auth.models import User
from datetime import date

class StrokePatient(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    hospital_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    age = models.IntegerField()
    gender = models.CharField(max_length=10, choices=[('M', 'Male'), ('F', 'Female')])
    phone_number = models.CharField(max_length=20, blank=True)
    nihss_score = models.IntegerField(null=True, blank=True)
    length_of_stay_days = models.IntegerField(default=1)
    discharge_date = models.DateField(null=True, blank=True)
    discharge_destination = models.CharField(
        max_length=50,
        choices=[('home', 'Home'), ('snf', 'Skilled Nursing Facility'),
                 ('rehab', 'Rehabilitation Facility'), ('hospice', 'Hospice'), ('other', 'Other')],
        default='home'
    )
    has_urinary_catheter = models.BooleanField(default=False)
    hypercoagulable_state = models.BooleanField(default=False)
    percutaneous_gastrostomy = models.BooleanField(default=False)
    hemodialysis = models.BooleanField(default=False)
    malnutrition = models.BooleanField(default=False)
    current_risk_score = models.FloatField(default=0.0)
    current_risk_category = models.CharField(
        max_length=10,
        choices=[('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')],
        default='Low'
    )
    assigned_doctor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stroke_patients')
    admission_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.hospital_id})"

    def update_risk_score(self, new_score):
        self.current_risk_score = min(max(new_score, 0.0), 1.0)
        if self.current_risk_score >= 0.7:
            self.current_risk_category = 'High'
        elif self.current_risk_score >= 0.4:
            self.current_risk_category = 'Medium'
        else:
            self.current_risk_category = 'Low'
        self.save()

class DailyPatientReport(models.Model):
    patient = models.ForeignKey(StrokePatient, on_delete=models.CASCADE, related_name='daily_reports')
    report_date = models.DateField(default=date.today)
    has_headache = models.BooleanField(default=False)
    has_dizziness = models.BooleanField(default=False)
    has_weakness = models.BooleanField(default=False)
    has_speech_difficulty = models.BooleanField(default=False)
    has_vision_changes = models.BooleanField(default=False)
    has_fever = models.BooleanField(default=False)
    has_swallowing_difficulty = models.BooleanField(default=False)
    took_medications = models.BooleanField(default=True)
    well_being_score = models.IntegerField(default=3)
    notes = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient.first_name} - {self.report_date}"

    def calculate_risk_increase(self):
        risk = 0.0
        if self.has_headache: risk += 0.10
        if self.has_dizziness: risk += 0.10
        if self.has_weakness: risk += 0.15
        if self.has_speech_difficulty: risk += 0.20
        if self.has_vision_changes: risk += 0.10
        if self.has_fever: risk += 0.15
        if self.has_swallowing_difficulty: risk += 0.20
        if not self.took_medications: risk += 0.20
        if self.well_being_score <= 2: risk += 0.15
        elif self.well_being_score == 3: risk += 0.05
        return min(risk, 1.0)

class Notification(models.Model):
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    patient = models.ForeignKey(StrokePatient, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.doctor.username} - {self.patient.first_name}"

class PanicAlert(models.Model):
    patient = models.ForeignKey(StrokePatient, on_delete=models.CASCADE, null=True, blank=True, related_name='panic_alerts')
    patient_name = models.CharField(max_length=200)
    patient_phone = models.CharField(max_length=20)
    message = models.TextField()
    location = models.CharField(max_length=255, blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f" Panic Alert from {self.patient_name} at {self.created_at}"
class FollowUp(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rescheduled', 'Rescheduled'),
    ]
    
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follow_ups')
    patient = models.ForeignKey(StrokePatient, on_delete=models.CASCADE, related_name='follow_ups')
    title = models.CharField(max_length=200, default="Follow-up Appointment")
    date = models.DateField()
    time = models.TimeField()
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Follow-up for {self.patient.first_name} on {self.date} at {self.time}"    