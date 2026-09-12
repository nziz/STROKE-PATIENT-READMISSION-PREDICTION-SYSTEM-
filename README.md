# Stroke Patient Readmission Prediction System

A Django and React application for monitoring stroke patients, collecting daily health reports, estimating readmission risk, and providing symptom-based clinical recommendations.

## Features

- Doctor and patient dashboards
- Per-browser-tab authentication sessions
- Daily patient symptom and medication reports
- Readmission risk scoring and risk categories
- AI-generated recommendations based on submitted symptoms
- Rule-based recommendation fallback when AI is unavailable
- Patient search, reports, appointments, notifications, and reminders
- Emergency panic alerts
- CSV and PDF patient report exports
- Profile and user management

## Technology

- Backend: Django, Django REST Framework, PostgreSQL
- Frontend: React, Material UI, Axios
- AI: Google Gemini API, optional
- Authentication: Django sessions with tab-specific session headers

## Requirements

- Python 3.10 or newer
- Node.js and npm
- PostgreSQL
- Google Gemini API key, optional for AI features

## Backend Setup

Create and activate a virtual environment, then install dependencies:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a local `.env` file in the project root. Do not commit it:

```env
SECRET_KEY=change-this-development-secret
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=stroke_db
DB_USER=stroke_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432

GEMINI_API_KEY=your_gemini_api_key
ENABLE_EMAIL_NOTIFICATIONS=False
ENABLE_NEW_RESULTS_PAGE=True
FRONTEND_URL=http://localhost:3000
```

Apply migrations and start Django:

```powershell
python manage.py migrate
python manage.py check
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`.

## Frontend Setup

In a second terminal:

```powershell
cd frontend
npm install
npm start
```

The React application runs at `http://localhost:3000`.

## AI Recommendations

When a patient submits a daily report, the backend uses the reported symptoms, medication adherence, wellbeing score, and current risk level to generate a short AI clinical recommendation. If the Gemini key is unavailable or the service fails, the application continues using the rule-based fallback recommendations.

## Email Notifications

Email notifications are optional. Gmail may reject messages after its daily sending limit is reached. For production use, configure a transactional email provider and keep credentials in `.env` only.

## Security

- Never commit `.env` files, API keys, passwords, or database credentials.
- Rotate any key that has been exposed.
- Use a strong `SECRET_KEY` and database password outside development.
- Set `DEBUG=False` in production.
- Configure production hosts, HTTPS, cookies, CSRF, and CORS before deployment.
