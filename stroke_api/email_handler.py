# stroke_api/email_handler.py

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

class EmailNotificationHandler:
    """
    Handles sending email alerts for high-risk patients.
    All sending is wrapped in try/except to prevent breaking the main app.
    """

    @staticmethod
    def send_doctor_emergency_alert(doctor_user, patient_obj, risk_percent, recommendations):
        """
        Sends an emergency HTML email to the assigned doctor.
        """
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return

        subject = f"🚨 URGENT: High Readmission Risk Alert for {patient_obj.first_name} {patient_obj.last_name}"

        context = {
            'doctor_name': doctor_user.first_name,
            'patient_name': f"{patient_obj.first_name} {patient_obj.last_name}",
            'patient_id': patient_obj.id,
            'risk_score': risk_percent,
            'risk_level': 'HIGH',
            'recommendations': recommendations,
            'dashboard_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/patients/{patient_obj.id}",
            'hospital_phone': getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788123456'),
        }

        try:
            # If you have email templates, use them; otherwise fallback to plain text.
            # For simplicity, we'll send a plain text email for now.
            plain_message = f"""
            EMERGENCY ALERT: HIGH READMISSION RISK

            Patient: {patient_obj.first_name} {patient_obj.last_name}
            Patient ID: {patient_obj.id}
            Risk Score: {risk_percent:.1f}%
            Risk Level: HIGH

            Recommendations:
            {self._format_recommendations(recommendations)}

            View full details: {context['dashboard_url']}

            Hospital Contact: {context['hospital_phone']}
            """

            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[doctor_user.email],
                fail_silently=False,
            )
            print(f"✅ Emergency email sent to Dr. {doctor_user.last_name}")
        except Exception as e:
            print(f"❌ Email failed to send: {e}")

    @staticmethod
    def send_patient_confirmation(patient_obj, risk_percent, risk_level, recommendations):
        """
        Sends a confirmation/alert email to the patient.
        """
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return

        subject = f"Your Health Risk Assessment Results - Gihundwe Hospital"

        plain_message = f"""
        Dear {patient_obj.first_name} {patient_obj.last_name},

        Your recent health assessment has been processed.

        Readmission Risk Score: {risk_percent:.1f}%
        Risk Level: {risk_level}

        Recommendations:
        {self._format_recommendations(recommendations)}

        Please contact the hospital at {getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788123456')} if you have questions or experience any concerning symptoms.

        Thank you,
        Gihundwe Hospital Stroke Care Team
        """

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[patient_obj.user.email],
                fail_silently=False,
            )
            print(f"✅ Confirmation email sent to patient {patient_obj.last_name}")
        except Exception as e:
            print(f"❌ Patient email failed: {e}")

    @staticmethod
    def _format_recommendations(recommendations):
        """Helper to format recommendations as bullet points."""
        if not recommendations:
            return "No specific recommendations."
        lines = []
        for rec in recommendations:
            lines.append(f"  • [{rec.get('priority', 'STANDARD')}] {rec.get('action', '')}")
            if rec.get('details'):
                lines.append(f"      {rec['details']}")
        return "\n".join(lines)