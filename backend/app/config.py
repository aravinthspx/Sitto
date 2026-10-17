import os
from dotenv import load_dotenv

# Ensure we load exactly from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

def _clean_env(val: str | None) -> str | None:
    if val is None:
        return None
    cleaned = val.strip().strip("'\"")
    return cleaned if cleaned else None

def _env(name: str, default: str | None = None) -> str | None:
    return _clean_env(os.environ.get(name)) or default

def _env_list(name: str, default: str = "") -> list[str]:
    raw = _env(name, default) or ""
    return [item.strip() for item in raw.split(",") if item.strip()]

def _env_bool(name: str, default: bool = False) -> bool:
    raw = _env(name)
    if raw is None:
        return default
    return raw.lower() in ("1", "true", "yes", "on")

class Config:
    raw_url = _clean_env(os.environ.get("SUPABASE_URL")) or ""
    if raw_url.endswith("/rest/v1/"):
        raw_url = raw_url[:-9]
    elif raw_url.endswith("/rest/v1"):
        raw_url = raw_url[:-8]
    SUPABASE_URL = raw_url.rstrip('/')
    SUPABASE_KEY = _clean_env(os.environ.get("SUPABASE_KEY"))
    SUPABASE_JWT_SECRET = _clean_env(os.environ.get("SUPABASE_JWT_SECRET"))

    # Runtime environment. Anything other than "development" is treated as production.
    APP_ENV = (_env("APP_ENV", "production") or "production").lower()
    IS_PRODUCTION = APP_ENV != "development"
    # The Werkzeug debugger allows remote code execution — never on in production.
    DEBUG = _env_bool("FLASK_DEBUG", False) and not IS_PRODUCTION

    # Browser origins allowed to call the API (comma-separated)
    ALLOWED_ORIGINS = _env_list(
        "ALLOWED_ORIGINS",
        "" if IS_PRODUCTION else "http://localhost:5173,http://127.0.0.1:5173",
    )
    # Public URL of the frontend, used in password-reset emails
    FRONTEND_URL = (_env("FRONTEND_URL", "http://localhost:5173") or "").rstrip('/')
    # Number of reverse proxies in front of the app (for correct client IPs)
    TRUSTED_PROXY_COUNT = int(_env("TRUSTED_PROXY_COUNT", "0") or 0)

    # Sign-up restrictions
    ALLOWED_EMAIL_DOMAINS = [d.lower().lstrip("@") for d in _env_list("ALLOWED_EMAIL_DOMAINS")]
    MIN_PASSWORD_LENGTH = int(_env("MIN_PASSWORD_LENGTH", "8") or 8)
    PRIVACY_POLICY_VERSION = _env("PRIVACY_POLICY_VERSION", "2026-10-17")

    # Rate limiting (Flask-Limiter). Use redis://... when running several workers.
    RATELIMIT_STORAGE_URI = _env("RATELIMIT_STORAGE_URI", "memory://")

    # Booking config
    MAX_SEATS_PER_STUDENT = int(_env("MAX_SEATS_PER_STUDENT", "4") or 4)
    BOOKING_START_HOUR = int(_env("BOOKING_START_HOUR", "8") or 8)
    BOOKING_END_HOUR = int(_env("BOOKING_END_HOUR", "17") or 17)
    SESSION_DURATION_MINS = int(_env("SESSION_DURATION_MINS", "60") or 60)
    MAX_BOOKING_HOURS = int(_env("MAX_BOOKING_HOURS", "3") or 3)
    MAX_BOOKING_DAYS_AHEAD = int(_env("MAX_BOOKING_DAYS_AHEAD", "3") or 3)
    # Campus local time offset from UTC, in minutes (IST = +330)
    CAMPUS_UTC_OFFSET_MINS = int(_env("CAMPUS_UTC_OFFSET_MINS", "330") or 330)
