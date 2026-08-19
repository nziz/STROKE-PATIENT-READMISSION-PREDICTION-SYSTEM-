# stroke_api/recommendations.py

class RecommendationEngine:
    
    @staticmethod
    def generate(patient_obj, report_obj):
        """
        Generates a list of structured clinical recommendations.
        Expects patient_obj (StrokePatient) and report_obj (DailyPatientReport).
        Returns a list of dicts: [{"priority": "HIGH", "action": "...", "details": "..."}]
        """
        risk_score = patient_obj.current_risk_score or 0.0
        recommendations = []

        # --- 1. IMMEDIATE / HIGH RISK (score > 0.70) ---
        if risk_score > 0.70:
            recommendations.append({
                'priority': 'IMMEDIATE',
                'action': 'Do NOT discharge without further evaluation',
                'details': 'Patient is in the high-risk category (≥70%). Immediate clinical review required.'
            })
            
            # Age factor
            if patient_obj.age and patient_obj.age > 65:
                recommendations.append({
                    'priority': 'HIGH',
                    'action': 'Geriatric consultation recommended',
                    'details': f'Patient is {patient_obj.age} years old – higher risk of complications.'
                })
            
            # NIHSS severity
            if patient_obj.nihss_score and patient_obj.nihss_score > 12:
                recommendations.append({
                    'priority': 'HIGH',
                    'action': 'Neurology specialist review required',
                    'details': f'NIHSS score of {patient_obj.nihss_score} indicates severe stroke.'
                })
            
            # Length of stay
            if patient_obj.length_of_stay_days and patient_obj.length_of_stay_days > 7:
                recommendations.append({
                    'priority': 'HIGH',
                    'action': 'Extended inpatient rehabilitation plan',
                    'details': f'Length of stay: {patient_obj.length_of_stay_days} days – plan for discharge to rehabilitation.'
                })

        # --- 2. MODERATE RISK (0.40 - 0.70) ---
        elif risk_score > 0.40:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Standard discharge with enhanced follow-up',
                'details': 'Schedule neurology outpatient appointment within 2 weeks.'
            })
            
            if patient_obj.nihss_score and patient_obj.nihss_score > 5:
                recommendations.append({
                    'priority': 'MEDIUM',
                    'action': 'Outpatient neurology referral',
                    'details': f'NIHSS score of {patient_obj.nihss_score} suggests need for specialized follow-up.'
                })

            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Medication adherence counseling',
                'details': 'Provide written schedule and discuss potential side effects.'
            })

        # --- 3. LOW RISK (score < 0.40) ---
        else:
            recommendations.append({
                'priority': 'LOW',
                'action': 'Routine discharge protocol',
                'details': 'Patient can proceed with standard discharge procedures.'
            })
            recommendations.append({
                'priority': 'LOW',
                'action': 'Primary care follow-up (1 month)',
                'details': 'Schedule a routine check-up for 4 weeks post-discharge.'
            })
            recommendations.append({
                'priority': 'LOW',
                'action': 'Lifestyle counseling',
                'details': 'Provide standard stroke prevention and diet guidance.'
            })

        # --- 4. STANDARD (Always included) ---
        recommendations.append({
            'priority': 'STANDARD',
            'action': 'Stroke warning signs education',
            'details': 'Educate on: facial droop, arm weakness, speech difficulty, vision changes, severe headache, and call 999 immediately.'
        })

        return recommendations