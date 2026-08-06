# app/models.py (add this new model)

class DailyPatientReport(models.Model):
    patient = models.ForeignKey(StrokePatient, on_delete=models.CASCADE, related_name='daily_reports')
    report_date = models.DateField(auto_now_add=True)
    
    # Symptoms (Yes/No)
    has_headache = models.BooleanField(default=False)
    has_dizziness = models.BooleanField(default=False)
    has_weakness = models.BooleanField(default=False)
    has_speech_difficulty = models.BooleanField(default=False)
    has_vision_changes = models.BooleanField(default=False)
    has_fever = models.BooleanField(default=False)
    has_swallowing_difficulty = models.BooleanField(default=False)
    took_medications = models.BooleanField(default=True)  # Default to True
    
    # Well-being scale (1-5)
    well_being_score = models.IntegerField(default=3, choices=[(1, 'Very Poor'), (2, 'Poor'), (3, 'Average'), (4, 'Good'), (5, 'Excellent')])
    
    # Additional notes (optional)
    notes = models.TextField(blank=True, null=True)
    
    # Metadata
    submitted_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Report for {self.patient.first_name} on {self.report_date}"
    
    def calculate_risk_increase(self):
        """
        Calculate how much this report increases the patient's readmission risk.
        Returns a percentage increase (0.0 to 1.0).
        """
        risk_factors = 0
        
        # Each symptom increases risk by 10%
        if self.has_headache: risk_factors += 0.10
        if self.has_dizziness: risk_factors += 0.10
        if self.has_weakness: risk_factors += 0.15  # More serious
        if self.has_speech_difficulty: risk_factors += 0.20  # Very serious
        if self.has_vision_changes: risk_factors += 0.10
        if self.has_fever: risk_factors += 0.15
        if self.has_swallowing_difficulty: risk_factors += 0.20  # Dysphagia is a strong predictor
        
        # Not taking medications increases risk by 20%
        if not self.took_medications: risk_factors += 0.20
        
        # Low well-being increases risk
        if self.well_being_score <= 2:
            risk_factors += 0.15
        elif self.well_being_score == 3:
            risk_factors += 0.05
        
        # Cap at 1.0 (100%)
        return min(risk_factors, 1.0)