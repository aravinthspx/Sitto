"""Security regression tests for the SITTO API.

These run fully offline: Supabase and JWT verification are mocked.
"""
import importlib
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import jwt as pyjwt
import pytest

from app.config import Config
from app.routes.reservations import validate_booking_window


# ─── Authentication ──────────────────────────────────────────────────────────

PROTECTED_ROUTES = [
    ("GET", "/api/auth/me"),
    ("POST", "/api/auth/logout"),
    ("GET", "/api/buildings"),
    ("GET", "/api/floors"),
    ("GET", "/api/spaces"),
    ("GET", "/api/seats?space_id=LAB001"),
    ("POST", "/api/reservations"),
    ("GET", "/api/reservations/me"),
    ("GET", "/api/reservations/RES1"),
    ("POST", "/api/reservations/RES1/cancel"),
    ("POST", "/api/reservations/RES1/checkin"),
    ("POST", "/api/reservations/RES1/checkout"),
    ("GET", "/api/notifications"),
    ("GET", "/api/notifications/unread-count"),
    ("POST", "/api/notifications/abc/read"),
    ("POST", "/api/notifications/read-all"),
    ("POST", "/api/seatsure/respond-active"),
    ("GET", "/api/admin/dashboard"),
    ("GET", "/api/admin/stats"),
    ("GET", "/api/admin/tasks"),
    ("POST", "/api/admin/verify"),
    ("POST", "/api/admin/tasks/abc/resolve"),
    ("GET", "/api/admin/rooms/LAB001"),
]


@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
def test_protected_routes_reject_anonymous(client, method, path):
    rv = client.open(path, method=method, json={})
    assert rv.status_code == 401


@pytest.mark.parametrize("header", ["Basic abc", "Bearer", "Bearer ", "token abc"])
def test_malformed_authorization_header_rejected(client, header):
    rv = client.get("/api/auth/me", headers={"Authorization": header})
    assert rv.status_code == 401


def test_alg_none_token_rejected(client):
    token = pyjwt.encode({"sub": "attacker", "aud": "authenticated"}, key="", algorithm="none")
    rv = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert rv.status_code == 401


def test_hs256_token_signed_with_guessable_secret_rejected(client):
    # Algorithm-confusion attempt: a symmetric token instead of Supabase's ES256
    token = pyjwt.encode({"sub": "attacker", "aud": "authenticated"}, key="secret", algorithm="HS256")
    rv = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert rv.status_code == 401


def test_garbage_token_rejected_without_leaking_details(client):
    rv = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert rv.status_code == 401
    assert rv.get_json()["message"] == "Invalid or expired session"


def test_expired_token_rejected(client):
    with patch("app.middleware.auth.jwt.get_unverified_header", return_value={"alg": "ES256"}), \
         patch("app.middleware.auth._jwk_client") as jwk, \
         patch("app.middleware.auth.jwt.decode", side_effect=pyjwt.ExpiredSignatureError()):
        jwk.get_signing_key_from_jwt.return_value = MagicMock(key="k")
        rv = client.get("/api/auth/me", headers={"Authorization": "Bearer t"})
    assert rv.status_code == 401


def test_token_decode_requires_audience_issuer_and_expiry(client):
    with patch("app.middleware.auth.jwt.get_unverified_header", return_value={"alg": "ES256"}), \
         patch("app.middleware.auth._jwk_client") as jwk, \
         patch("app.middleware.auth.jwt.decode") as decode, \
         patch("app.middleware.auth.supabase") as db:
        jwk.get_signing_key_from_jwt.return_value = MagicMock(key="k")
        decode.return_value = {"sub": "u1"}
        db.table().select().eq().execute.return_value = MagicMock(data=[])
        client.get("/api/auth/me", headers={"Authorization": "Bearer t"})
    kwargs = decode.call_args.kwargs
    assert kwargs["algorithms"] == ["ES256"]
    assert kwargs["audience"] == "authenticated"
    assert kwargs["issuer"] == f"{Config.SUPABASE_URL}/auth/v1"
    assert {"exp", "sub"} <= set(kwargs["options"]["require"])


def test_user_without_profile_defaults_to_student(client):
    with patch("app.middleware.auth.jwt.get_unverified_header", return_value={"alg": "ES256"}), \
         patch("app.middleware.auth._jwk_client") as jwk, \
         patch("app.middleware.auth.jwt.decode", return_value={"sub": "u1"}), \
         patch("app.middleware.auth.supabase") as db:
        jwk.get_signing_key_from_jwt.return_value = MagicMock(key="k")
        db.table().select().eq().execute.return_value = MagicMock(data=[])
        rv = client.get("/api/auth/me", headers={"Authorization": "Bearer t"})
    assert rv.get_json()["user"]["role"] == "student"


# ─── Authorisation (role and ownership checks) ───────────────────────────────

@pytest.mark.parametrize("method,path", [
    ("GET", "/api/admin/dashboard"),
    ("GET", "/api/admin/stats"),
    ("GET", "/api/admin/tasks"),
    ("POST", "/api/admin/verify"),
    ("POST", "/api/admin/tasks/abc/resolve"),
    ("GET", "/api/admin/rooms/LAB001"),
    ("POST", "/api/reservations/RES1/checkin"),
    ("POST", "/api/reservations/RES1/checkout"),
])
def test_students_cannot_use_admin_functions(client, login_as, method, path):
    with login_as("student") as headers:
        rv = client.open(path, method=method, json={}, headers=headers)
    assert rv.status_code == 403


@patch("app.routes.reservations.supabase")
def test_student_cannot_read_someone_elses_reservation(db, client, login_as):
    db.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": "RES1", "user_id": "someone_else", "space_id": "LAB001", "status": "RESERVED",
        "start_time": "x", "end_time": "y", "check_in_deadline": "z", "qr_token": "QR_secret",
    }])
    with login_as("student", user_id="me") as headers:
        rv = client.get("/api/reservations/RES1", headers=headers)
    assert rv.status_code == 403
    assert b"QR_secret" not in rv.data


@patch("app.routes.reservations.supabase")
def test_student_cannot_cancel_someone_elses_reservation(db, client, login_as):
    db.table().select().eq().execute.return_value = MagicMock(data=[{
        "id": "RES1", "user_id": "someone_else", "status": "RESERVED", "seat_id": "s", "space_id": "LAB001",
    }])
    with login_as("student", user_id="me") as headers:
        rv = client.post("/api/reservations/RES1/cancel", headers=headers)
    assert rv.status_code == 403
    db.table().update.assert_not_called()


@patch("app.routes.notifications.supabase")
def test_student_cannot_mark_someone_elses_notification(db, client, login_as):
    db.table().select().eq().execute.return_value = MagicMock(data=[{"user_id": "someone_else"}])
    with login_as("student", user_id="me") as headers:
        rv = client.post("/api/notifications/n1/read", headers=headers)
    assert rv.status_code == 403


@patch("app.routes.seatsure.supabase")
def test_student_cannot_answer_someone_elses_seatsure_task(db, client, login_as):
    task_id = "11111111-1111-1111-1111-111111111111"
    db.table().select().eq().execute.side_effect = [
        MagicMock(data=[{
            "id": task_id, "status": "PENDING", "deadline": "2999-01-01T00:00:00+00:00",
            "occupancy_session_id": "o1", "occupancy_session": {"reservation_id": "RES1"},
        }]),
        MagicMock(data=[{"user_id": "someone_else"}]),
    ]
    with login_as("student", user_id="me") as headers:
        rv = client.post(f"/api/seatsure/{task_id}/respond", json={"response": "NO"}, headers=headers)
    assert rv.status_code == 403


def test_seatsure_rejects_non_uuid_task_id(client, login_as):
    with login_as("student") as headers:
        rv = client.post("/api/seatsure/1;DROP TABLE x/respond", json={"response": "YES"}, headers=headers)
    assert rv.status_code in (400, 404)


# ─── Sign-up rules ────────────────────────────────────────────────────────────

@pytest.fixture
def signup_env(monkeypatch):
    monkeypatch.setattr(Config, "ALLOWED_EMAIL_DOMAINS", ["srmist.edu.in"])
    monkeypatch.setattr(Config, "MIN_PASSWORD_LENGTH", 8)


def _signup(client, **overrides):
    body = {"email": "a@srmist.edu.in", "password": "goodpass123", "name": "A Student",
            "accepted_privacy": True}
    body.update(overrides)
    return client.post("/api/auth/signup", json=body)


@pytest.mark.parametrize("email", ["a@gmail.com", "a@srmist.edu.in.evil.com", "a@evil-srmist.edu.in"])
def test_signup_rejects_non_college_email(client, signup_env, email):
    rv = _signup(client, email=email)
    assert rv.status_code == 400
    assert "college email" in rv.get_json()["message"]


@pytest.mark.parametrize("password", ["short1", "allletters", "1234567890", "x" * 80 + "1"])
def test_signup_rejects_weak_passwords(client, signup_env, password):
    assert _signup(client, password=password).status_code == 400


def test_signup_requires_privacy_consent(client, signup_env):
    rv = _signup(client, accepted_privacy=False)
    assert rv.status_code == 400
    assert "Privacy Policy" in rv.get_json()["message"]
    assert _signup(client, accepted_privacy="true").status_code == 400  # must be a real boolean


@patch("app.routes.auth.supabase")
@patch("app.routes.auth.get_supabase_client")
def test_signup_ignores_client_supplied_role_and_records_consent(get_client, db, client, signup_env):
    user = MagicMock(id="new-user", identities=[MagicMock()])
    get_client.return_value.auth.sign_up.return_value = MagicMock(user=user, session=None)
    rv = _signup(client, role="admin")
    assert rv.status_code == 200
    db.table().upsert.assert_called_once()
    assert db.table().upsert.call_args.args[0]["role"] == "student"
    meta = get_client.return_value.auth.sign_up.call_args.args[0]["options"]["data"]
    assert meta["privacy_policy_version"] and meta["privacy_accepted_at"]


@patch("app.routes.auth.supabase")
@patch("app.routes.auth.get_supabase_client")
def test_signup_does_not_reveal_existing_accounts(get_client, db, client, signup_env):
    existing = MagicMock(id="u", identities=[])
    get_client.return_value.auth.sign_up.return_value = MagicMock(user=existing, session=None)
    rv_existing = _signup(client)
    get_client.return_value.auth.sign_up.return_value = MagicMock(user=MagicMock(id="v", identities=[1]), session=None)
    rv_new = _signup(client, email="b@srmist.edu.in")
    assert rv_existing.get_json() == rv_new.get_json()


@patch("app.routes.auth.get_supabase_client")
def test_login_does_not_reveal_whether_email_exists(get_client, client):
    get_client.return_value.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
    rv = client.post("/api/auth/login", json={"username": "x@srmist.edu.in", "password": "nope12345"})
    assert rv.status_code == 401
    assert rv.get_json()["message"] == "Incorrect email or password."


@patch("app.routes.auth.get_supabase_client")
def test_password_reset_link_points_to_configured_frontend(get_client, client, monkeypatch):
    monkeypatch.setattr(Config, "FRONTEND_URL", "https://sitto.example.edu")
    rv = client.post("/api/auth/reset-password", json={"email": "x@srmist.edu.in"})
    assert rv.status_code == 200
    opts = get_client.return_value.auth.reset_password_for_email.call_args.args[1]
    assert opts["redirect_to"] == "https://sitto.example.edu/update-password"


@patch("app.routes.auth.supabase")
def test_logout_revokes_the_session(db, client, login_as):
    with login_as("student") as headers:
        rv = client.post("/api/auth/logout", headers=headers)
    assert rv.status_code == 204
    db.auth.admin.sign_out.assert_called_once_with("test_token", "local")


# ─── Rate limiting ────────────────────────────────────────────────────────────

@patch("app.routes.auth.get_supabase_client")
def test_login_is_rate_limited(get_client, client):
    get_client.return_value.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
    codes = [client.post("/api/auth/login", json={"username": "x@y.in", "password": f"p{i}"}).status_code
             for i in range(12)]
    assert codes[:10] == [401] * 10
    assert codes[10] == 429


@patch("app.routes.auth.get_supabase_client")
def test_password_reset_is_rate_limited(get_client, client):
    codes = [client.post("/api/auth/reset-password", json={"email": "x@y.in"}).status_code for _ in range(4)]
    assert codes[-1] == 429


# ─── Input handling, error leakage, headers ──────────────────────────────────

def test_oversized_request_body_rejected(client):
    rv = client.post("/api/auth/login", data="x" * (70 * 1024), content_type="application/json")
    assert rv.status_code == 413


def test_non_json_body_is_handled(client):
    rv = client.post("/api/auth/login", data="username=a&password=b",
                     content_type="application/x-www-form-urlencoded")
    assert rv.status_code == 400


@patch("app.routes.notifications.supabase")
def test_internal_errors_do_not_leak_details(db, client, login_as):
    db.table.side_effect = Exception("postgres://admin:hunter2@db.internal relation does not exist")
    with login_as("student") as headers:
        rv = client.get("/api/notifications/unread-count", headers=headers)
    assert rv.status_code == 500
    body = rv.get_data(as_text=True)
    assert "hunter2" not in body and "postgres" not in body


def test_unknown_routes_return_json_404(client):
    rv = client.get("/api/does-not-exist")
    assert rv.status_code == 404
    assert rv.is_json


@pytest.mark.parametrize("path", ["/health", "/api", "/api/auth/me"])
def test_security_headers_present(client, path):
    rv = client.get(path)
    h = rv.headers
    assert h["X-Content-Type-Options"] == "nosniff"
    assert h["X-Frame-Options"] == "DENY"
    assert h["Referrer-Policy"] == "no-referrer"
    assert "frame-ancestors 'none'" in h["Content-Security-Policy"]
    assert "Server" not in h


def test_api_responses_are_not_cached(client):
    assert client.get("/api/auth/me").headers["Cache-Control"] == "no-store"


def test_health_does_not_expose_version_or_errors(client):
    body = client.get("/health").get_json()
    assert set(body) == {"status", "database"}


# ─── CORS and production config ──────────────────────────────────────────────

def _app_with_origins(monkeypatch, origins):
    monkeypatch.setattr(Config, "ALLOWED_ORIGINS", origins)
    from app import create_app
    return create_app().test_client()


def test_cors_allows_configured_origin(monkeypatch):
    c = _app_with_origins(monkeypatch, ["https://sitto.example.edu"])
    rv = c.options("/api/auth/login", headers={
        "Origin": "https://sitto.example.edu", "Access-Control-Request-Method": "POST"})
    assert rv.headers.get("Access-Control-Allow-Origin") == "https://sitto.example.edu"


def test_cors_blocks_other_origins(monkeypatch):
    c = _app_with_origins(monkeypatch, ["https://sitto.example.edu"])
    rv = c.options("/api/auth/login", headers={
        "Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"})
    assert "Access-Control-Allow-Origin" not in rv.headers


def test_debugger_can_never_be_enabled_in_production(monkeypatch):
    import app.config as config_module
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("FLASK_DEBUG", "1")
    try:
        reloaded = importlib.reload(config_module)
        assert reloaded.Config.IS_PRODUCTION is True
        assert reloaded.Config.DEBUG is False
    finally:
        monkeypatch.undo()
        importlib.reload(config_module)


def test_production_is_the_default_environment(monkeypatch):
    import app.config as config_module
    monkeypatch.delenv("APP_ENV", raising=False)
    with patch("dotenv.load_dotenv"):
        try:
            assert importlib.reload(config_module).Config.IS_PRODUCTION is True
        finally:
            monkeypatch.undo()
            importlib.reload(config_module)


# ─── Booking rules ────────────────────────────────────────────────────────────

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime(2026, 10, 19, 9, 0, tzinfo=IST)  # Monday 09:00 IST


@pytest.mark.parametrize("start,end,ok", [
    (NOW.replace(hour=10), NOW.replace(hour=11), True),
    (NOW.replace(hour=10), NOW.replace(hour=13), True),              # 3 h = max
    (NOW.replace(hour=10), NOW.replace(hour=14), False),             # too long
    (NOW.replace(hour=11), NOW.replace(hour=10), False),             # ends before start
    (NOW.replace(hour=10), NOW.replace(hour=10, minute=15), False),  # too short
    (NOW - timedelta(hours=2), NOW - timedelta(hours=1), False),     # in the past
    (NOW.replace(hour=6), NOW.replace(hour=7), False),               # before opening
    (NOW.replace(hour=16), NOW.replace(hour=18), False),             # after closing
    (NOW + timedelta(days=10), NOW + timedelta(days=10, hours=1), False),  # too far ahead
])
def test_booking_window_rules(start, end, ok):
    assert (validate_booking_window(start, end, now=NOW) is None) == ok


def test_booking_rejects_timestamps_without_timezone(client, login_as):
    with login_as("student") as headers:
        rv = client.post("/api/reservations", headers=headers, json={
            "space_id": "LAB001", "seat_id": "S01",
            "start": "2026-10-19T10:00:00", "end": "2026-10-19T11:00:00"})
    assert rv.status_code == 400


def test_booking_rejects_non_string_ids(client, login_as):
    with login_as("student") as headers:
        rv = client.post("/api/reservations", headers=headers, json={
            "space_id": {"$ne": None}, "seat_id": ["S01"],
            "start": "2026-10-19T10:00:00Z", "end": "2026-10-19T11:00:00Z"})
    assert rv.status_code == 400


def test_qr_tokens_are_unguessable():
    from app.routes.reservations import generate_qr_token
    tokens = {generate_qr_token() for _ in range(200)}
    assert len(tokens) == 200
    assert all(len(t) >= 64 for t in tokens)
