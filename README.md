# Maternal Health USSD Early Warning System

A USSD-based early warning system for maternal health risk detection in rural Rwanda. 

## Project Goals
- Provide a simple, text-based interactive USSD interface accessible on basic mobile phones (no internet required).
- Capture maternal health symptoms/risk factors (e.g., bleeding, fever, headache, abdominal pain).
- Perform triage/risk assessment (Low, Medium, High risk) and generate real-time alerts.
- Notify community health workers (Binômes/CHWs) or health facilities for urgent cases.
- Maintain clinical history and basic registration of pregnant women.

## Twilio SMS / OTP Configuration

This project can send OTPs over SMS using Twilio. By default the app will not send SMS unless the following environment variables are set:

- `TWILIO_SID` — your Twilio Account SID
- `TWILIO_TOKEN` — your Twilio Auth Token
- `TWILIO_FROM` — the Twilio phone number to send from (e.g. +1234567890)

To enable SMS in development or production, set the vars and restart the app. Example (PowerShell):

```powershell
$env:TWILIO_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_TOKEN="your_auth_token"
$env:TWILIO_FROM="+15005550006"
py -3 -m uvicorn app.main:app --reload --port 8000
```

When Twilio is not configured, the OTP endpoints return the OTP in the JSON response for local testing only. Never leave OTPs returned in responses in production.

## Security Configuration

Use environment variables for the app’s security settings:

- `SECRET_KEY` — strong JWT signing secret (replace the default)
- `JWT_ALGORITHM` — defaults to `HS256`
- `ACCESS_TOKEN_EXPIRE_MINUTES` — default `60`
- `REFRESH_TOKEN_EXPIRE_MINUTES` — default `1440`
- `ALLOWED_ORIGINS` — comma-separated allowed origins for CORS

Example:

```powershell
$env:SECRET_KEY="a-very-strong-secret-key"
$env:ALLOWED_ORIGINS="http://localhost:8000,https://yourdomain.com"
$env:ACCESS_TOKEN_EXPIRE_MINUTES="60"
$env:REFRESH_TOKEN_EXPIRE_MINUTES="1440"
```

## Install

Install dependencies listed in `requirements.txt` into your virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # or .\.venv\Scripts\activate on Windows
pip install -r requirements.txt
```

