import logging

import jwt
from functools import wraps
from flask import request, jsonify, g
from app.config import Config
from app.database.connection import supabase

logger = logging.getLogger("sitto.auth")

_jwk_client = None


def _get_jwk_client():
    global _jwk_client
    if _jwk_client is None:
        jwks_url = f"{Config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        _jwk_client = jwt.PyJWKClient(jwks_url, cache_keys=True, lifespan=3600)
    return _jwk_client


def get_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer "):].strip()
    return token or None


def authenticate_request():
    """Verify the Supabase access token on the current request.

    Returns (user, None) on success or (None, (response, status)) on failure.
    On success the user is also stored on flask.g.user.
    """
    token = get_bearer_token()
    if not token:
        return None, (jsonify({"message": "Missing or invalid authorization header"}), 401)

    try:
        # Only asymmetric ES256 tokens issued by our Supabase project are accepted
        if jwt.get_unverified_header(token).get("alg") != "ES256":
            return None, (jsonify({"message": "Invalid or expired session"}), 401)

        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
            issuer=f"{Config.SUPABASE_URL}/auth/v1",
            options={"require": ["exp", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError:
        return None, (jsonify({"message": "Token expired"}), 401)
    except (jwt.InvalidTokenError, jwt.PyJWKClientError):
        return None, (jsonify({"message": "Invalid or expired session"}), 401)
    except Exception:
        logger.exception("Token verification failed")
        return None, (jsonify({"message": "Could not verify your session. Please try again."}), 503)

    user_id = payload["sub"]
    try:
        res = supabase.table("profiles").select("role, name").eq("id", user_id).execute()
    except Exception:
        logger.exception("Profile lookup failed for %s", user_id)
        return None, (jsonify({"message": "Could not verify your session. Please try again."}), 503)

    # Role comes exclusively from the server-side profiles table
    profile = res.data[0] if res.data else {"role": "student", "name": None}
    g.user = {
        "id": user_id,
        "role": profile.get("role") or "student",
        "name": profile.get("name"),
        "email": payload.get("email"),
    }
    g.access_token = token
    return g.user, None


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        _, error = authenticate_request()
        if error:
            return error
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user, error = authenticate_request()
        if error:
            return error
        if user["role"] != "admin":
            return jsonify({"message": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated
