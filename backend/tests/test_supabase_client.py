import pytest
from unittest.mock import patch
from supabase import create_client, Client
from app.config import _clean_env, Config
from app.database.connection import get_supabase_client

DUMMY_URL = "https://mock-project-id.supabase.co"
DUMMY_SB_SECRET = "sb_secret_0123456789abcdef0123456789abcdef"
DUMMY_LEGACY_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dummy_signature"

def test_modern_sb_secret_key_initialization():
    """Verify that create_client succeeds with modern sb_secret_ API keys."""
    client = create_client(DUMMY_URL, DUMMY_SB_SECRET)
    assert isinstance(client, Client)
    assert str(client.supabase_url).rstrip('/') == DUMMY_URL

def test_legacy_jwt_key_initialization():
    """Verify backwards-compatibility with legacy JWT service_role tokens."""
    client = create_client(DUMMY_URL, DUMMY_LEGACY_JWT)
    assert isinstance(client, Client)
    assert str(client.supabase_url).rstrip('/') == DUMMY_URL

def test_clean_env_strips_whitespace_and_quotes():
    """Verify environment variable sanitization against accidental copy-paste artifacts."""
    assert _clean_env("  sb_secret_test123  \n") == "sb_secret_test123"
    assert _clean_env('"sb_secret_test123"') == "sb_secret_test123"
    assert _clean_env("'sb_secret_test123'") == "sb_secret_test123"
    assert _clean_env('  "sb_secret_test123"  ') == "sb_secret_test123"
    assert _clean_env(None) is None
    assert _clean_env("   ") is None

def test_missing_credentials_raises_error():
    """Verify that get_supabase_client raises ValueError if URL or Key is missing."""
    with patch.object(Config, "SUPABASE_URL", ""):
        with patch.object(Config, "SUPABASE_KEY", DUMMY_SB_SECRET):
            with pytest.raises(ValueError, match="Supabase URL or Key is missing"):
                get_supabase_client()

    with patch.object(Config, "SUPABASE_URL", DUMMY_URL):
        with patch.object(Config, "SUPABASE_KEY", None):
            with pytest.raises(ValueError, match="Supabase URL or Key is missing"):
                get_supabase_client()

def test_get_supabase_client_success_with_sb_secret():
    """Verify get_supabase_client builds a valid client when Config holds an sb_secret_ key."""
    with patch.object(Config, "SUPABASE_URL", DUMMY_URL):
        with patch.object(Config, "SUPABASE_KEY", DUMMY_SB_SECRET):
            client = get_supabase_client()
            assert isinstance(client, Client)
