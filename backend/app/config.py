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

class Config:
    raw_url = _clean_env(os.environ.get("SUPABASE_URL")) or ""
    if raw_url.endswith("/rest/v1/"):
        raw_url = raw_url[:-9]
    elif raw_url.endswith("/rest/v1"):
        raw_url = raw_url[:-8]
    SUPABASE_URL = raw_url.rstrip('/')
    SUPABASE_KEY = _clean_env(os.environ.get("SUPABASE_KEY"))
    SUPABASE_JWT_SECRET = _clean_env(os.environ.get("SUPABASE_JWT_SECRET"))

    # Booking config
    MAX_SEATS_PER_STUDENT = int(_clean_env(os.environ.get("MAX_SEATS_PER_STUDENT")) or 4)
    BOOKING_START_HOUR = int(_clean_env(os.environ.get("BOOKING_START_HOUR")) or 8)
    BOOKING_END_HOUR = int(_clean_env(os.environ.get("BOOKING_END_HOUR")) or 17)
    SESSION_DURATION_MINS = int(_clean_env(os.environ.get("SESSION_DURATION_MINS")) or 60)

