from django.urls import path
from . import views

urlpatterns = [
    # CSRF Token (call this FIRST from React on app load)
    path('api/csrf/', views.get_csrf_token, name='csrf_token'),

    # Authentication
    path('api/login/', views.login_user, name='login'),
    path('api/logout/', views.logout_user, name='logout'),

    # Profile
    path('api/profile/', views.get_profile, name='get_profile'),
    path('api/profile/update/', views.update_profile, name='update_profile'),
    path('api/change-password/', views.change_password, name='change_password'),

    # User Management (Doctor only)
    path('api/users/', views.get_users, name='get_users'),
    path('api/users/<int:user_id>/update/', views.update_user, name='update_user'),

    # Patient Management
    path('api/register-patient/', views.register_patient, name='register_patient'),
    path('api/patients/', views.get_all_patients, name='all_patients'),
    path('api/patient/<int:patient_id>/', views.get_patient_detail, name='patient_detail'),
    path('api/patient/<int:patient_id>/delete/', views.delete_patient, name='delete_patient'),

    # Daily Reports
    path('api/patient/<int:patient_id>/report/', views.submit_daily_report, name='submit_report'),
    path('api/patient/<int:patient_id>/reports/', views.get_patient_reports, name='patient_reports'),

    # Risk Prediction
    path('api/patient/<int:patient_id>/predict/', views.predict_readmission_ml, name='predict_risk'),
    path('api/patient/<int:patient_id>/predict-ml/', views.predict_readmission_ml, name='predict_ml'),

    # Doctor Dashboard
    path('api/doctor/dashboard/', views.get_doctor_dashboard, name='doctor_dashboard'),
    path('api/doctor/appointments/', views.get_doctor_appointments, name='doctor_appointments'),

    # Notifications
    path('api/notifications/', views.get_notifications, name='notifications'),
    path('api/notification/<int:notification_id>/read/', views.mark_notification_read, name='mark_read'),
    path('api/notification/<int:notification_id>/delete/', views.delete_notification, name='delete_notif'),
    path('api/notification/<int:notification_id>/archive/', views.archive_notification, name='archive_notif'),
    path('api/notification/<int:notification_id>/unarchive/', views.unarchive_notification, name='unarchive_notif'),

    # Panic Alert
    path('api/panic-alert/', views.create_panic_alert, name='panic_alert'),

    # Follow-up
    path('api/patient/<int:patient_id>/followup/', views.schedule_followup, name='schedule_followup'),
    path('api/patient/<int:patient_id>/followups/', views.get_patient_followups, name='get_followups'),
    path('api/followup/<int:followup_id>/status/', views.update_followup_status, name='update_followup_status'),

    # Exports
    path('api/patient/<int:patient_id>/export-pdf/', views.export_patient_pdf, name='export_pdf'),
    path('api/patient/<int:patient_id>/export-csv/', views.export_patient_csv, name='export_patient_csv'),
    path('api/export/all-patients/', views.export_all_patients_csv, name='export_all'),
]