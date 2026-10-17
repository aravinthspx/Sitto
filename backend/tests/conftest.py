import contextlib
from unittest.mock import MagicMock, patch

import pytest

from app import create_app
from app.security import limiter


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    limiter.reset()
    return app


@pytest.fixture
def client(app):
    with app.test_client() as client:
        yield client


@pytest.fixture
def login_as():
    """Context manager that makes any Bearer token authenticate as the given role."""
    @contextlib.contextmanager
    def _login_as(role="student", user_id="user_123", name="Test User"):
        profile = MagicMock(data=[{"role": role, "name": name}])
        with patch('app.middleware.auth.jwt.get_unverified_header', return_value={"alg": "ES256"}), \
             patch('app.middleware.auth._jwk_client') as jwk, \
             patch('app.middleware.auth.jwt.decode', return_value={"sub": user_id, "email": "u@x.edu"}), \
             patch('app.middleware.auth.supabase') as auth_db:
            jwk.get_signing_key_from_jwt.return_value = MagicMock(key="k")
            auth_db.table().select().eq().execute.return_value = profile
            yield {"Authorization": "Bearer test_token"}
    return _login_as
