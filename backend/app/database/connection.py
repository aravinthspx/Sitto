import threading

from supabase import create_client, Client
from app.config import Config


# Initialize Supabase client
def get_supabase_client() -> Client:
    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise ValueError("Supabase URL or Key is missing. Check your .env file.")
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


class _PerThreadClient:
    """Looks like a Supabase client, but each thread gets its own instance.

    supabase-py talks to PostgREST over HTTP/2 with a synchronous httpx client,
    which must not be shared between threads: concurrent use from the web
    request threads, the SeatSure scheduler thread and the push sender threads
    can deadlock them all (the API stops answering while the scheduler keeps
    running).
    """

    def __init__(self):
        self._local = threading.local()

    def _client(self) -> Client:
        client = getattr(self._local, "client", None)
        if client is None:
            client = self._local.client = get_supabase_client()
        return client

    def __getattr__(self, name):
        return getattr(self._client(), name)


supabase = None
try:
    get_supabase_client()  # fail fast at startup if misconfigured
    supabase = _PerThreadClient()
except Exception as e:
    print(f"Warning: Could not initialize Supabase client: {e}")
