class RecommendationEngine:
    @staticmethod
    def generate(patient_obj, report_obj):
        risk_score = patient_obj.current_risk_score or 0.0
        recommendations = []

        # --- 1. BASE RISK RECOMMENDATIONS ---
        if risk_score > 0.70:
            recommendations.append({
                'priority': 'IMMEDIATE',
                'action': 'Do NOT discharge without further evaluation',
                'details': 'Patient is in the high-risk category (≥70%). Immediate clinical review required.'
            })
        elif risk_score > 0.40:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Standard discharge with enhanced follow-up',
                'details': 'Schedule neurology outpatient appointment within 2 weeks.'
            })
        else:
            recommendations.append({
                'priority': 'LOW',
                'action': 'Routine discharge protocol',
                'details': 'Patient can proceed with standard discharge procedures.'
            })

        # --- 2. INDEPENDENT CLINICAL FACTORS ---
        if patient_obj.age and patient_obj.age > 65:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Geriatric consultation recommended',
                'details': f'Patient is {patient_obj.age} years old – higher risk of complications.'
            })

        if patient_obj.nihss_score and patient_obj.nihss_score > 12:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Neurology specialist review required',
                'details': f'NIHSS score of {patient_obj.nihss_score} indicates severe stroke.'
            })
        elif patient_obj.nihss_score and patient_obj.nihss_score > 5:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'Outpatient neurology referral',
                'details': f'NIHSS score of {patient_obj.nihss_score} suggests need for specialized follow-up.'
            })

        if patient_obj.length_of_stay_days and patient_obj.length_of_stay_days > 7:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'Extended inpatient rehabilitation plan',
                'details': f'Length of stay: {patient_obj.length_of_stay_days} days – plan for discharge to rehabilitation.'
            })

        # --- 3. STANDARD PROTOCOLS ---
        recommendations.append({
            'priority': 'STANDARD',
            'action': 'Stroke warning signs education',
            'details': 'Educate on: facial droop, arm weakness, speech difficulty, vision changes, severe headache, and call 999 immediately.'
        })

        # Sort by priority (IMMEDIATE > HIGH > MEDIUM > LOW > STANDARD)
        priority_order = {"IMMEDIATE": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4, "STANDARD": 5}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 99))

        return recommendations