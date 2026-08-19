# stroke_api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # ============================================================
    # CSRF & AUTHENTICATION
    # ============================================================
    path('csrf/', views.get_csrf_token, name='csrf_token'),
    path('login/', views.login_user, name='login'),
    path('logout/', views.logout_user, name='logout'),

    # ============================================================
    # PROFILE & PASSWORD
    # ============================================================
    path('profile/', views.get_profile, name='get_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('change-password/', views.change_password, name='change_password'),

    # ============================================================
    # USER MANAGEMENT (Admin/Doctor Only)
    # ============================================================
    path('users/', views.get_users, name='get_users'),
    path('users/<int:user_id>/update/', views.update_user, name='update_user'),
    path('users/<int:user_id>/delete/', views.delete_user, name='delete_user'),

    # ============================================================
    # PATIENT MANAGEMENT
    # ============================================================
    path('register-patient/', views.register_patient, name='register_patient'),
    path('patients/', views.get_all_patients, name='all_patients'),
    path('patient/<int:patient_id>/', views.get_patient_detail, name='patient_detail'),
    path('patient/<int:patient_id>/delete/', views.delete_patient, name='delete_patient'),

    # ============================================================
    # PATIENT SEARCH & BULK EXPORT (NEW - Supervisor Feedback)
    # ============================================================
    path('patients/search/', views.search_patients, name='search_patients'),
    path('patients/bulk-export/', views.bulk_export_patients_csv, name='bulk_export_patients'),

    # ============================================================
    # DAILY REPORTS
    # ============================================================
    path('patient/<int:patient_id>/report/', views.submit_daily_report, name='submit_report'),
    path('patient/<int:patient_id>/reports/', views.get_patient_reports, name='patient_reports'),

    # ============================================================
    # RISK PREDICTION (ML)
    # ============================================================
    path('patient/<int:patient_id>/predict/', views.predict_readmission_ml, name='predict_risk'),
    path('patient/<int:patient_id>/predict-ml/', views.predict_readmission_ml, name='predict_ml'),

    # ============================================================
    # DOCTOR DASHBOARD & APPOINTMENTS
    # ============================================================
    path('doctor/dashboard/', views.get_doctor_dashboard, name='doctor_dashboard'),
    path('doctor/appointments/', views.get_doctor_appointments, name='doctor_appointments'),

    # ============================================================
    # NOTIFICATIONS
    # ============================================================
    path('notifications/', views.get_notifications, name='notifications'),
    path('notification/<int:notification_id>/read/', views.mark_notification_read, name='mark_read'),
    path('notification/<int:notification_id>/delete/', views.delete_notification, name='delete_notif'),
    path('notification/<int:notification_id>/archive/', views.archive_notification, name='archive_notif'),
    path('notification/<int:notification_id>/unarchive/', views.unarchive_notification, name='unarchive_notif'),

    # ============================================================
    # PANIC ALERT (Emergency)
    # ============================================================
    path('panic-alert/', views.create_panic_alert, name='panic_alert'),

    # ============================================================
    # FOLLOW-UPS
    # ============================================================
    path('patient/<int:patient_id>/followup/', views.schedule_followup, name='schedule_followup'),
    path('patient/<int:patient_id>/followups/', views.get_patient_followups, name='get_followups'),
    path('followup/<int:followup_id>/status/', views.update_followup_status, name='update_followup_status'),

    # ============================================================
    # EXPORTS (PDF, CSV)
    # ============================================================
    path('patient/<int:patient_id>/export-pdf/', views.export_patient_pdf, name='export_pdf'),
    path('patient/<int:patient_id>/export-csv/', views.export_patient_csv, name='export_patient_csv'),
    path('export/all-patients/', views.export_all_patients_csv, name='export_all'),

    # ============================================================
    # REPORT SUMMARY & REMINDERS
    # ============================================================
    path('patient-report-summary/', views.get_patient_report_summary, name='patient_report_summary'),
    path('patient/<int:patient_id>/send-reminder/', views.send_patient_reminder, name='send_reminder'),
    path('patient/reminders/', views.get_patient_reminders, name='patient_reminders'),
    path('patient/reminder/<int:reminder_id>/read/', views.mark_reminder_read, name='mark_reminder_read'),
]

