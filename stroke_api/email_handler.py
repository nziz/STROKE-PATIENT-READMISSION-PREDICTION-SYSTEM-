from django.core.mail import send_mail
from django.conf import settings

class EmailNotificationHandler:
    _email_quota_exhausted = False

    @staticmethod
    def _send(subject, message, recipient):
        """Send one notification without allowing SMTP failure to break clinical workflows."""
        if EmailNotificationHandler._email_quota_exhausted:
            return False

        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient], fail_silently=False)
            return True
        except Exception as e:
            error_text = str(e).lower()
            if '550' in error_text and ('limit' in error_text or 'quota' in error_text or 'sending' in error_text):
                EmailNotificationHandler._email_quota_exhausted = True
                print('Email notifications paused: the configured SMTP account reached its sending limit.')
            else:
                print(f'Email notification failed: {e}')
            return False

    def _format_recommendations(recommendations):
        """Helper to format recommendations as bullet points."""
        if not recommendations:
            return "No specific recommendations."
        lines = []
        for rec in recommendations:
            lines.append(f" • [{rec.get('priority', 'STANDARD')}] {rec.get('action', '')}")
            if rec.get('details'):
                lines.append(f"   {rec['details']}")
        return "\n".join(lines)

    @staticmethod
    def send_doctor_emergency_alert(doctor_user, patient_obj, risk_percent, recommendations):
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return
            
        formatted_recs = EmailNotificationHandler._format_recommendations(recommendations)
        subject = f" URGENT: High Readmission Risk Alert for {patient_obj.first_name} {patient_obj.last_name}"
        plain_message = f"""
EMERGENCY ALERT: HIGH READMISSION RISK

Patient: {patient_obj.first_name} {patient_obj.last_name}
Patient ID: {patient_obj.id}
Risk Score: {risk_percent:.1f}%

Recommendations:
{formatted_recs}

View full details: {getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/patients/{patient_obj.id}
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, doctor_user.email):
                print(f" Emergency email sent to Dr. {doctor_user.last_name}")
        except Exception as e:
            print(f"❌ Emergency email failed to send: {e}")

    @staticmethod
    def send_patient_confirmation(patient_obj, risk_percent, risk_level, recommendations):
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return
            
        formatted_recs = EmailNotificationHandler._format_recommendations(recommendations)
        subject = f"Your Health Risk Assessment Results - Gihundwe Hospital"
        plain_message = f"""
Dear {patient_obj.first_name} {patient_obj.last_name},

Your recent health assessment has been processed.
Readmission Risk Score: {risk_percent:.1f}%
Risk Level: {risk_level}

Recommendations:
{formatted_recs}

Please contact the hospital if you experience any concerning symptoms.
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, patient_obj.user.email):
                print(f" Confirmation email sent to patient {patient_obj.last_name}")
        except Exception as e:
            print(f"❌ Patient confirmation email failed: {e}")

    # --- NEW: APPOINTMENT REMINDER ---
    @staticmethod
    def send_appointment_confirmation(patient_obj, appointment_date, appointment_time, doctor_name, notes=""):
        """Sends an appointment reminder email to the patient."""
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return
        if not patient_obj.user or not patient_obj.user.email:
            return

        subject = f" Upcoming Appointment Reminder - Gihundwe Hospital"
        plain_message = f"""
Dear {patient_obj.first_name} {patient_obj.last_name},

This is an automated reminder that you have an upcoming medical appointment scheduled with your care team.

 Date: {appointment_date}
 Time: {appointment_time}
 Doctor: Dr. {doctor_name}

Please ensure you bring any recent medical reports, your ID, and a list of medications you are currently taking.

If you need to reschedule or have urgent concerns,
please contact the hospital at {getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788973787')}.

Wishing you a smooth recovery,
The Gihundwe Hospital Stroke Care Team
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, patient_obj.user.email):
                print(f" Appointment email sent to patient {patient_obj.last_name}")
        except Exception as e:
            print(f"❌ Appointment email failed to send: {e}")

    # --- NEW: MISSED DAILY REPORT REMINDER ---
    @staticmethod
    def send_missed_report_reminder(patient_obj):
        """Sends a reminder email to a patient who hasn't submitted their daily report."""
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False):
            return
        if not patient_obj.user or not patient_obj.user.email:
            return

        subject = " Reminder: Please Submit Your Daily Health Report"
        plain_message = f"""
Dear {patient_obj.first_name} {patient_obj.last_name},

We noticed that you haven't submitted your daily health report today. 

Regular monitoring is crucial for your stroke recovery and helps your medical team ensure you are on the right track.
Please take a few minutes to log into the system and submit your report.

If you are experiencing any sudden symptoms or emergencies, please contact the hospital immediately at {getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788973787')}.

Stay safe,
The Gihundwe Hospital Stroke Care Team
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, patient_obj.user.email):
                print(f" Missed report reminder sent to {patient_obj.last_name}")
        except Exception as e:
            print(f"❌ Missed report reminder failed: {e}")
                

    @staticmethod
    def send_appointment_confirmation(patient_obj, appointment_date, appointment_time, doctor_name, notes=""):
        """Sends an appointment reminder email to the patient."""
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False): return
        if not patient_obj.user or not patient_obj.user.email: return

        subject = " Upcoming Appointment Reminder - Gihundwe Hospital"
        plain_message = f"""
Dear {patient_obj.first_name} {patient_obj.last_name},

You have an upcoming appointment with Dr. {doctor_name}.
 Date: {appointment_date}
 Time: {appointment_time}

Please bring your ID and current medication list.
Contact us at {getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788973787')} to reschedule.

Wishing you a smooth recovery,
Gihundwe Hospital Stroke Care Team
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, patient_obj.user.email):
                print(f" Appointment email sent to {patient_obj.last_name}")
        except Exception as e:
            print(f"Appointment email failed: {e}")

    @staticmethod
    def send_missed_report_reminder(patient_obj):
        """Sends a reminder to patients who haven't submitted today's report."""
        if not getattr(settings, 'ENABLE_EMAIL_NOTIFICATIONS', False): return
        if not patient_obj.user or not patient_obj.user.email: return

        subject = "Reminder: Please Submit Your Daily Health Report"
        plain_message = f"""
Dear {patient_obj.first_name} {patient_obj.last_name},

We noticed you haven't submitted your daily health report today.
Regular monitoring is vital for your stroke recovery.

Please log in and submit your report as soon as possible.

If you are experiencing emergencies, call {getattr(settings, 'HOSPITAL_CONTACT_NUMBER', '+250788973787')} immediately.

Stay safe,
Gihundwe Hospital Stroke Care Team
        """
        try:
            if EmailNotificationHandler._send(subject, plain_message, patient_obj.user.email):
                print(f" Missed report reminder sent to {patient_obj.last_name}")
        except Exception as e:
            print(f"Missed report reminder failed: {e}")