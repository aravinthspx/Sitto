import os
from dotenv import load_dotenv

# Ensure we load exactly from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=env_path)

class Config:
    url = os.environ.get("SUPABASE_URL", "")
    if url.endswith("/rest/v1/"):
        url = url[:-9]
    elif url.endswith("/rest/v1"):
        url = url[:-8]
    SUPABASE_URL = url.rstrip('/')
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET")

    # Booking config
    MAX_SEATS_PER_STUDENT = int(os.environ.get("MAX_SEATS_PER_STUDENT", 4))
    BOOKING_START_HOUR = int(os.environ.get("BOOKING_START_HOUR", 8))
    BOOKING_END_HOUR = int(os.environ.get("BOOKING_END_HOUR", 17))
    SESSION_DURATION_MINS = int(os.environ.get("SESSION_DURATION_MINS", 60))
