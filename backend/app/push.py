"""Web Push: phone/desktop notifications that arrive even when SITTO isn't open.

Subscriptions live in public.push_subscriptions (migrations/002). Delivery is
best-effort and never blocks or fails the request that triggered it.
"""
import base64
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from urllib.parse import urlparse

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import Config
from app.database.connection import supabase

logger = logging.getLogger("sitto.push")

# Only real browser push services may be used as endpoints. The server POSTs
# to the endpoint, so accepting arbitrary URLs would allow SSRF.
ALLOWED_PUSH_HOSTS = (
    "fcm.googleapis.com",                # Chrome, Edge (Android), Samsung Internet
    "updates.push.services.mozilla.com",  # Firefox
    "web.push.apple.com",                # Safari / iOS home-screen apps
    ".push.apple.com",
    ".notify.windows.com",               # Edge on Windows
)

# Which in-app notification types are also pushed to the phone, and how
PUSH_TYPES = {
    "SEATSURE_CHECK": {"urgent": True, "seatsure_actions": True, "ttl": 300},
    "BOOKING_CONFIRMED": {"ttl": 3600},
    "CHECKIN_REMINDER": {"urgent": True, "ttl": 900},
    "RESERVATION_EXPIRED": {"ttl": 3600},
    "RESERVATION_RELEASED": {"urgent": True, "ttl": 3600},
}

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="push")
_ACTION_SALT = "sitto-seatsure-push-action"


def is_configured() -> bool:
    return bool(Config.VAPID_PUBLIC_KEY and Config.VAPID_PRIVATE_KEY)


def is_allowed_endpoint(endpoint) -> bool:
    if not isinstance(endpoint, str) or len(endpoint) > 1024:
        return False
    try:
        url = urlparse(endpoint)
    except ValueError:
        return False
    if url.scheme != "https" or not url.hostname or url.port not in (None, 443):
        return False
    host = url.hostname.lower()
    return any(host == h.lstrip(".") or (h.startswith(".") and host.endswith(h)) for h in ALLOWED_PUSH_HOSTS)


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def is_valid_key_material(p256dh, auth) -> bool:
    try:
        return (
            isinstance(p256dh, str) and isinstance(auth, str)
            and len(_b64url_decode(p256dh)) == 65 and len(_b64url_decode(auth)) == 16
        )
    except (ValueError, TypeError):
        return False


# ─── One-tap SeatSure actions ────────────────────────────────────────────────

def _serializer():
    return URLSafeTimedSerializer(Config.PUSH_ACTION_SECRET or "", salt=_ACTION_SALT)


def make_action_token(user_id: str, task_id: str) -> str:
    return _serializer().dumps({"u": user_id, "t": task_id})


def read_action_token(token: str, task_id: str, max_age: int = 900):
    """Return the user id the token was issued to, or None if invalid/expired/for another task."""
    if not Config.PUSH_ACTION_SECRET or not isinstance(token, str) or len(token) > 512:
        return None
    try:
        data = _serializer().loads(token, max_age=max_age)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(data, dict) or data.get("t") != task_id:
        return None
    return data.get("u")


# ─── Delivery ────────────────────────────────────────────────────────────────

def _vapid():
    from py_vapid import Vapid02
    return Vapid02.from_raw(Config.VAPID_PRIVATE_KEY.encode())


def _deliver(user_id: str, payload: dict, ttl: int, urgent: bool):
    from pywebpush import WebPushException, webpush

    try:
        res = supabase.table("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", user_id).execute()
    except Exception as e:
        logger.warning("Could not load push subscriptions (run migrations/002?): %s", e)
        return 0

    sent = 0
    vapid = _vapid()
    body = json.dumps(payload, separators=(",", ":"))
    for sub in res.data or []:
        if not is_allowed_endpoint(sub["endpoint"]):
            continue
        try:
            webpush(
                subscription_info={"endpoint": sub["endpoint"], "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]}},
                data=body,
                vapid_private_key=vapid,
                vapid_claims={"sub": Config.VAPID_SUBJECT},
                ttl=ttl,
                headers={"Urgency": "high" if urgent else "normal"},
                timeout=10,
            )
            sent += 1
            supabase.table("push_subscriptions").update(
                {"last_used_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", sub["id"]).execute()
        except WebPushException as e:
            status = getattr(e.response, "status_code", None)
            if status in (404, 410):
                # The browser unsubscribed or the subscription expired — forget it
                supabase.table("push_subscriptions").delete().eq("id", sub["id"]).execute()
            else:
                logger.warning("Push to %s failed (%s): %s", urlparse(sub["endpoint"]).hostname, status, e)
        except Exception:
            logger.exception("Push delivery error")
    return sent


def send_to_user(user_id: str, payload: dict, ttl: int = 3600, urgent: bool = False, wait: bool = False):
    """Push a notification to every device the user enabled. Non-blocking unless wait=True."""
    if not is_configured() or not user_id:
        return None
    if wait:
        return _deliver(user_id, payload, ttl, urgent)
    _executor.submit(_deliver, user_id, payload, ttl, urgent)
    return None


def push_for_notification(user_id, notif_type, title, message,
                          reservation_id=None, seatsure_task_id=None, action_url=None, wait=False):
    """Mirror an in-app notification to the user's phone if its type is one we push."""
    opts = PUSH_TYPES.get(notif_type)
    if not opts:
        return None
    payload = {
        "title": title,
        "body": message,
        "type": notif_type,
        "url": action_url or ("/reservations" if reservation_id else "/notifications"),
        "tag": f"{notif_type}:{reservation_id or seatsure_task_id or ''}",
        "urgent": bool(opts.get("urgent")),
    }
    if opts.get("seatsure_actions") and seatsure_task_id:
        payload["seatsure"] = {
            "taskId": seatsure_task_id,
            "token": make_action_token(user_id, seatsure_task_id),
        }
    return send_to_user(user_id, payload, ttl=opts.get("ttl", 3600), urgent=bool(opts.get("urgent")), wait=wait)
