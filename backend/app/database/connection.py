from supabase import create_client, Client
from app.config import Config

# Initialize Supabase client
def get_supabase_client() -> Client:
    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise ValueError("Supabase URL or Key is missing. Check your .env file.")
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)

supabase = None
try:
    supabase = get_supabase_client()
except Exception as e:
    print(f"Warning: Could not initialize Supabase client: {e}")
