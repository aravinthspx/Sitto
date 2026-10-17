"""Web Push: subscription validation, SSRF protection and one-tap SeatSure actions."""
import base64
from unittest.mock import MagicMock, patch

import pytest

from app import push
from app.config import Config


def _b64(n):
    return base64.urlsafe_b64encode(b"\x04" + b"a" * (n - 1)).rstrip(b"=").decode()


VALID_KEYS = {"p256dh": _b64(65), "auth": base64.urlsafe_b64encode(b"b" * 16).rstrip(b"=").decode()}
FCM = "https://fcm.googleapis.com/fcm/send/abc123"


@pytest.fixture(autouse=True)
def vapid(monkeypatch):
    monkeypatch.setattr(Config, "VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setattr(Config, "VAPID_PRIVATE_KEY", base64.urlsafe_b64encode(b"\x01" * 32).rstrip(b"=").decode())
    monkeypatch.setattr(Config, "PUSH_ACTION_SECRET", "test-secret")


@pytest.mark.parametrize("endpoint,ok", [
    (FCM, True),
    ("https://updates.push.services.mozilla.com/wpush/v2/x", True),
    ("https://web.push.apple.com/abc", True),
    ("https://db5p.notify.windows.com/w/?token=x", True),
    ("http://fcm.googleapis.com/fcm/send/x", False),          # not https
    ("https://fcm.googleapis.com.evil.com/x", False),         # look-alike host
    ("https://evilfcm.googleapis.com.attacker.io/x", False),
    ("https://169.254.169.254/latest/meta-data", False),      # cloud metadata (SSRF)
    ("https://localhost/x", False),
    ("https://fcm.googleapis.com:8443/x", False),             # non-standard port
    ("javascript:alert(1)", False),
    ("https://fcm.googleapis.com/" + "a" * 2000, False),      # oversized
    (None, False),
])
def test_endpoint_allowlist(endpoint, ok):
    assert push.is_allowed_endpoint(endpoint) is ok


def test_subscribe_requires_login(client):
    assert client.post("/api/push/subscribe", json={}).status_code == 401


def test_subscribe_rejects_ssrf_endpoint(client, login_as):
    with login_as() as headers, patch("app.routes.push.supabase") as db:
        rv = client.post("/api/push/subscribe", headers=headers,
                         json={"endpoint": "https://169.254.169.254/x", "keys": VALID_KEYS})
    assert rv.status_code == 400
    db.table.assert_not_called()


def test_subscribe_rejects_bad_keys(client, login_as):
    with login_as() as headers, patch("app.routes.push.supabase"):
        rv = client.post("/api/push/subscribe", headers=headers,
                         json={"endpoint": FCM, "keys": {"p256dh": "short", "auth": "x"}})
    assert rv.status_code == 400


def test_subscribe_stores_for_current_user_only(client, login_as):
    with login_as(user_id="me") as headers, patch("app.routes.push.supabase") as db:
        rv = client.post("/api/push/subscribe", headers=headers,
                         json={"endpoint": FCM, "keys": VALID_KEYS, "user_id": "someone-else"})
    assert rv.status_code == 201
    row = db.table().upsert.call_args.args[0]
    assert row["user_id"] == "me"
    assert row["endpoint"] == FCM


def test_unsubscribe_only_touches_own_subscription(client, login_as):
    with login_as(user_id="me") as headers, patch("app.routes.push.supabase") as db:
        rv = client.post("/api/push/unsubscribe", headers=headers, json={"endpoint": FCM})
    assert rv.status_code == 204
    eq_calls = [c.args for c in db.table().delete().eq.call_args_list] + \
               [c.args for c in db.table().delete().eq().eq.call_args_list]
    assert ("user_id", "me") in eq_calls


def test_public_key_unavailable_when_not_configured(client, login_as, monkeypatch):
    monkeypatch.setattr(Config, "VAPID_PRIVATE_KEY", None)
    with login_as() as headers:
        assert client.get("/api/push/public-key", headers=headers).status_code == 503


# ─── One-tap SeatSure actions ────────────────────────────────────────────────

def test_action_token_is_bound_to_task_and_user():
    token = push.make_action_token("u1", "task-1")
    assert push.read_action_token(token, "task-1") == "u1"
    assert push.read_action_token(token, "task-2") is None
    assert push.read_action_token(token + "x", "task-1") is None
    assert push.read_action_token("", "task-1") is None


def test_action_token_expires():
    token = push.make_action_token("u1", "task-1")
    assert push.read_action_token(token, "task-1", max_age=-1) is None


def test_action_token_from_other_secret_rejected(monkeypatch):
    token = push.make_action_token("u1", "task-1")
    monkeypatch.setattr(Config, "PUSH_ACTION_SECRET", "different")
    assert push.read_action_token(token, "task-1") is None


def test_push_respond_rejects_forged_token(client):
    task = "11111111-1111-1111-1111-111111111111"
    rv = client.post(f"/api/seatsure/{task}/push-respond", json={"token": "forged", "response": "YES"})
    assert rv.status_code == 401


@patch("app.routes.seatsure.supabase")
def test_push_respond_confirms_presence_with_valid_token(db, client):
    task = "11111111-1111-1111-1111-111111111111"
    db.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": task, "status": "PENDING", "deadline": "2999-01-01T00:00:00+00:00",
                         "occupancy_session_id": "o1", "occupancy_session": {"reservation_id": "RES1"}}]),
        MagicMock(data=[{"user_id": "u1"}]),
    ]
    token = push.make_action_token("u1", task)
    rv = client.post(f"/api/seatsure/{task}/push-respond", json={"token": token, "response": "YES"})
    assert rv.status_code == 200
    db.table().update.assert_any_call({"status": "CONFIRMED"})


@patch("app.routes.seatsure.supabase")
def test_push_respond_still_checks_ownership(db, client):
    task = "11111111-1111-1111-1111-111111111111"
    db.table().select().eq().execute.side_effect = [
        MagicMock(data=[{"id": task, "status": "PENDING", "deadline": "2999-01-01T00:00:00+00:00",
                         "occupancy_session_id": "o1", "occupancy_session": {"reservation_id": "RES1"}}]),
        MagicMock(data=[{"user_id": "someone-else"}]),
    ]
    token = push.make_action_token("u1", task)
    rv = client.post(f"/api/seatsure/{task}/push-respond", json={"token": token, "response": "NO"})
    assert rv.status_code == 403


# ─── Which notifications get pushed ──────────────────────────────────────────

@pytest.mark.parametrize("notif_type,pushed", [
    ("SEATSURE_CHECK", True), ("BOOKING_CONFIRMED", True), ("CHECKIN_REMINDER", True),
    ("RESERVATION_EXPIRED", True), ("RESERVATION_RELEASED", True),
    ("CHECKIN_SUCCESS", False), ("BOOKING_CANCELLED", False),
])
def test_only_selected_events_are_pushed(notif_type, pushed):
    with patch("app.push.send_to_user") as send:
        push.push_for_notification("u1", notif_type, "t", "m", reservation_id="R1")
    assert send.called is pushed


def test_seatsure_push_carries_action_buttons():
    with patch("app.push.send_to_user") as send:
        push.push_for_notification("u1", "SEATSURE_CHECK", "t", "m", seatsure_task_id="task-9")
    payload = send.call_args.args[1]
    assert payload["urgent"] is True
    assert payload["seatsure"]["taskId"] == "task-9"
    assert push.read_action_token(payload["seatsure"]["token"], "task-9") == "u1"


def test_dead_subscriptions_are_removed():
    from pywebpush import WebPushException
    gone = WebPushException("gone", response=MagicMock(status_code=410))
    with patch("app.push.supabase") as db, patch("pywebpush.webpush", side_effect=gone):
        db.table().select().eq().execute.return_value = MagicMock(
            data=[{"id": "s1", "endpoint": FCM, "p256dh": VALID_KEYS["p256dh"], "auth": VALID_KEYS["auth"]}])
        sent = push.send_to_user("u1", {"title": "x"}, wait=True)
    assert sent == 0
    db.table().delete().eq.assert_called_with("id", "s1")


def test_push_skips_non_allowlisted_stored_endpoints():
    with patch("app.push.supabase") as db, patch("pywebpush.webpush") as wp:
        db.table().select().eq().execute.return_value = MagicMock(
            data=[{"id": "s1", "endpoint": "https://169.254.169.254/x", "p256dh": "x", "auth": "y"}])
        push.send_to_user("u1", {"title": "x"}, wait=True)
    wp.assert_not_called()


def test_vapid_private_key_matches_public_key(monkeypatch):
    # Regression: the raw key was base64-decoded twice, silently signing with the
    # wrong key, which push services reject.
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    key = ec.generate_private_key(ec.SECP256R1())
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    monkeypatch.setattr(Config, "VAPID_PRIVATE_KEY", b64(key.private_numbers().private_value.to_bytes(32, "big")))
    derived = push._vapid().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    assert derived == pub
