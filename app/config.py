import os
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    def __init__(self):
        self.SECRET_KEY = os.getenv('SECRET_KEY', 'default-dev-key')
        self.JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
        self.REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv('REFRESH_TOKEN_EXPIRE_MINUTES', '1440'))
        
        self.ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')]
        
        # Email settings (free SMS replacement)
        self.SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
        self.EMAIL_USER = os.getenv('EMAIL_USER')
        self.EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
        self.ALERT_RECIPIENTS = [r.strip() for r in os.getenv('ALERT_RECIPIENTS', '').split(',') if r.strip()]
        
        self.DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./maternal_health.db')
        self.DASHBOARD_URL = os.getenv('DASHBOARD_URL', 'http://localhost:3000')
        self.MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', 10485760))

settings = Settings()
class Settings:
    def __init__(self):
        self.SECRET_KEY = os.getenv('SECRET_KEY', 'MATERNAL_HEALTH_SECRET_KEY_2026_RWANDA')
        self.ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
        self.ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '60'))
        self.REFRESH_TOKEN_EXPIRE_MINUTES = int(os.getenv('REFRESH_TOKEN_EXPIRE_MINUTES', '1440'))
        self.ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('ALLOWED_ORIGINS', 'http://localhost:8000').split(',') if origin.strip()]
        self.TWILIO_SID = os.getenv('TWILIO_SID')
        self.TWILIO_TOKEN = os.getenv('TWILIO_TOKEN')
        self.TWILIO_FROM = os.getenv('TWILIO_FROM')
        self.ENABLE_TWILIO = bool(self.TWILIO_SID and self.TWILIO_TOKEN and self.TWILIO_FROM)

settings = Settings()

def is_twilio_configured():
    return settings.ENABLE_TWILIO
