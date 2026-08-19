import os
import re
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

# ------------------------------------------------------------
# CONFIGURATION - Edit these if you want, or leave as is
# ------------------------------------------------------------
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_EMAIL = "admin@example.com"
# ------------------------------------------------------------

PROJECT_ROOT = Path.cwd()
print(f"\n🤖 AUTOPILOT ENGAGED in: {PROJECT_ROOT}\n")

# --- 1. BACKUP DATABASE (Just in case) ---
if os.path.exists("db.sqlite3"):
    shutil.copy("db.sqlite3", "db_backup_before_fix.sqlite3")
    print("✅ Backed up your old database to 'db_backup_before_fix.sqlite3'")

# --- 2. DELETE THE CLUTTER (FastAPI app + frontend submodule) ---
for folder in ["app", "frontend"]:
    if os.path.exists(folder):
        try:
            shutil.rmtree(folder)
            print(f"✅ Removed redundant folder: {folder}")
        except Exception as e:
            print(f"⚠️ Could not delete {folder}, but continuing... ({e})")

# --- 3. SURGERY ON settings.py (Fix Security, CORS, Installed Apps) ---
settings_path = PROJECT_ROOT / "stroke_project" / "settings.py"
if settings_path.exists():
    print("🔧 Performing open-heart surgery on settings.py...")
    with open(settings_path, 'r') as f:
        content = f.read()

    # Ensure import os exists
    if "import os" not in content:
        content = "import os\n" + content

    # Fix Secret Key (Use env)
    if "SECRET_KEY = " in content and "os.environ" not in content:
        content = re.sub(
            r'SECRET_KEY = .+?\n',
            'SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "django-insecure-ultimate-fix-' + str(uuid.uuid4()) + '")\n',
            content
        )

    # Fix Debug (Default to False for safety)
    content = re.sub(r'DEBUG = True', 'DEBUG = os.environ.get("DEBUG", "False") == "True"', content)
    content = re.sub(r'DEBUG = False', 'DEBUG = os.environ.get("DEBUG", "False") == "True"', content)

    # Fix Allowed Hosts
    if "ALLOWED_HOSTS = []" in content:
        content = content.replace("ALLOWED_HOSTS = []", 'ALLOWED_HOSTS = ["*"]')
    if "ALLOWED_HOSTS = ['*']" not in content and "ALLOWED_HOSTS =" in content:
         content = re.sub(r'ALLOWED_HOSTS = .+?\n', 'ALLOWED_HOSTS = ["*"]\n', content)

    # Fix CORS
    content = re.sub(r'CORS_ALLOW_ALL_ORIGINS = True', 'CORS_ALLOW_ALL_ORIGINS = False', content)
    if "CORS_ALLOWED_ORIGINS" not in content:
        content = content.replace('CORS_ALLOW_ALL_ORIGINS = False', 'CORS_ALLOW_ALL_ORIGINS = False\nCORS_ALLOWED_ORIGINS = ["http://localhost:8000", "http://127.0.0.1:8000"]')
    else:
        content = re.sub(r'CORS_ALLOWED_ORIGINS = .+?\n', 'CORS_ALLOWED_ORIGINS = ["http://localhost:8000", "http://127.0.0.1:8000"]\n', content)

    # Secure Cookies
    content = re.sub(r'CSRF_COOKIE_SECURE = False', 'CSRF_COOKIE_SECURE = True', content)
    content = re.sub(r'SESSION_COOKIE_SECURE = False', 'SESSION_COOKIE_SECURE = True', content)
    if "SESSION_COOKIE_HTTPONLY" not in content:
        content = content.replace('SESSION_COOKIE_SECURE = True', 'SESSION_COOKIE_SECURE = True\nSESSION_COOKIE_HTTPONLY = True')

    # --- CRITICAL: REMOVE 'app' and 'frontend' from INSTALLED_APPS ---
    # Find the INSTALLED_APPS list and filter out bad apps
    def clean_installed_apps(match):
        list_content = match.group(0)
        # Split into lines and filter
        lines = list_content.split('\n')
        cleaned_lines = []
        for line in lines:
            if "'app'" in line or '"app"' in line:
                continue
            if "'frontend'" in line or '"frontend"' in line:
                continue
            if "app.apps" in line:
                continue
            cleaned_lines.append(line)
        return '\n'.join(cleaned_lines)

    content = re.sub(r'INSTALLED_APPS = \[.*?\]', clean_installed_apps, content, flags=re.DOTALL)

    # Ensure corsheaders is in INSTALLED_APPS
    if "'corsheaders'" not in content:
        content = content.replace('INSTALLED_APPS = [', 'INSTALLED_APPS = [\n    "corsheaders",')

    # Ensure CorsMiddleware is in MIDDLEWARE (must be at top)
    if "corsheaders.middleware.CorsMiddleware" not in content:
        content = content.replace('MIDDLEWARE = [', 'MIDDLEWARE = [\n    "corsheaders.middleware.CorsMiddleware",')

    # Write the fixed settings
    with open(settings_path, 'w') as f:
        f.write(content)
    print("✅ settings.py fully patched and cleaned.")
else:
    print("❌ Could not find stroke_project/settings.py! Are you in the right folder?")
    sys.exit(1)

# --- 4. SURGERY ON urls.py (Remove broken includes) ---
urls_path = PROJECT_ROOT / "stroke_project" / "urls.py"
if urls_path.exists():
    print("🔧 Cleaning urls.py...")
    with open(urls_path, 'r') as f:
        url_content = f.read()
    
    # Remove any import or path to 'app' or 'frontend'
    lines = url_content.split('\n')
    new_lines = []
    skip_block = False
    for line in lines:
        if "app" in line and ("import" in line or "path" in line):
            continue
        if "frontend" in line and ("import" in line or "path" in line):
            continue
        # Remove admin.autodiscover() if it somehow exists
        if "admin.autodiscover()" in line:
            continue
        new_lines.append(line)
    
    with open(urls_path, 'w') as f:
        f.write('\n'.join(new_lines))
    print("✅ urls.py cleaned.")
else:
    print("❌ Could not find stroke_project/urls.py!")

# --- 5. RESET MIGRATIONS (The ultimate fix for DB errors) ---
print("🗄️  Resetting database migrations for a clean slate...")
# Delete old migration files
for root, dirs, files in os.walk("."):
    if "migrations" in root and "__pycache__" not in root:
        for file in files:
            if file != "__init__.py" and file.endswith(".py"):
                file_path = os.path.join(root, file)
                os.remove(file_path)
                print(f"   Removed: {file_path}")

# Delete the actual sqlite DB (we backed it up earlier)
if os.path.exists("db.sqlite3"):
    os.remove("db.sqlite3")
    print("✅ Removed old db.sqlite3 to prevent conflicts.")

# --- 6. INSTALL / UPDATE DEPENDENCIES ---
print("📦 Installing core Python libraries (This takes ~2 minutes)...")
with open("requirements.txt", "w") as f:
    f.write("Django>=4.2\n")
    f.write("djangorestframework>=3.14\n")
    f.write("django-cors-headers>=4.3\n")
    f.write("psycopg2-binary>=2.9\n")
    f.write("python-dotenv>=1.0\n")
    f.write("numpy>=1.24\n")
    f.write("pandas>=2.0\n")
    f.write("scikit-learn>=1.3\n")
    f.write("xgboost>=2.0\n")
    f.write("openpyxl>=3.1\n")
    f.write("djangorestframework-simplejwt>=5.3\n")

subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

# --- 7. MAKE MIGRATIONS AND MIGRATE ---
print("🛠️  Creating new migrations...")
subprocess.check_call([sys.executable, "manage.py", "makemigrations"])

print("🛠️  Applying migrations to fresh database...")
subprocess.check_call([sys.executable, "manage.py", "migrate"])

# --- 8. CREATE SUPERUSER (Fresh start) ---
print(f"👤 Creating superuser: {ADMIN_USERNAME} / {ADMIN_PASSWORD}")
create_user_cmd = [
    sys.executable, "manage.py", "shell",
    "-c",
    f"from django.contrib.auth.models import User; "
    f"User.objects.create_superuser('{ADMIN_USERNAME}', '{ADMIN_EMAIL}', '{ADMIN_PASSWORD}') "
    f"if not User.objects.filter(username='{ADMIN_USERNAME}').exists() else print('User already exists.')"
]
subprocess.check_call(create_user_cmd)

# --- 9. COLLECT STATIC FILES ---
print("📁 Collecting static files...")
subprocess.check_call([sys.executable, "manage.py", "collectstatic", "--noinput"])

# --- 10. FINAL LAUNCH ---
print("\n" + "="*60)
print("🚀 ALL SYSTEMS GO! Your project is fully rebuilt and clean.")
print(f"🌐 Open your browser and go to: http://localhost:8000/admin")
print(f"👤 Login: {ADMIN_USERNAME}")
print(f"🔑 Password: {ADMIN_PASSWORD}")
print("="*60 + "\n")

# Start the server
print("🔥 Starting Django development server...")
subprocess.check_call([sys.executable, "manage.py", "runserver", "0.0.0.0:8000"])