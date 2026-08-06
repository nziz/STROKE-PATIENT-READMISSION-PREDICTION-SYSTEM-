from django.contrib import admin
from .models import StrokePatient, DailyPatientReport, Notification, PanicAlert

admin.site.register(StrokePatient)
admin.site.register(DailyPatientReport)
admin.site.register(Notification)
admin.site.register(PanicAlert)