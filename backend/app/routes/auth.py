import logging
import re
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g
from app.config import Config
from app.database.connection import supabase, get_supabase_client
from app.middleware.auth import require_auth
from app.security import limiter

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger("sitto.auth")

EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")
MAX_PASSWORD_LENGTH = 72  # bcrypt ignores anything beyond 72 bytes


def _json():
    return request.get_json(silent=True) or {}


def _email_allowed(email: str) -> bool:
    if not Config.ALLOWED_EMAIL_DOMAINS:
        return True
    domain = email.rsplit("@", 1)[-1].lower()
    return any(domain == d or domain.endswith("." + d) for d in Config.ALLOWED_EMAIL_DOMAINS)


def _password_problem(password: str):
    if len(password) < Config.MIN_PASSWORD_LENGTH:
        return f"Password must be at least {Config.MIN_PASSWORD_LENGTH} characters."
    if len(password.encode("utf-8")) > MAX_PASSWORD_LENGTH:
        return f"Password must be at most {MAX_PASSWORD_LENGTH} characters."
    if not (re.search(r"[A-Za-z]", password) and re.search(r"\d", password)):
        return "Password must contain both letters and numbers."
    return None


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
def login():
    data = _json()
    email = str(data.get('username', '')).strip().lower()  # frontend sends 'username' field
    password = str(data.get('password', ''))

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400
    if len(email) > 320 or len(password) > 256:
        return jsonify({"message": "Incorrect email or password."}), 401

    try:
        temp_client = get_supabase_client()
        res = temp_client.auth.sign_in_with_password({"email": email, "password": password})
        if not res.session:
            return jsonify({"message": "Incorrect email or password."}), 401

        user_id = res.user.id
        token = res.session.access_token
        refresh_token = res.session.refresh_token

        # Role comes exclusively from the server-side profiles table
        profile_res = supabase.table("profiles").select("role, name").eq("id", user_id).execute()
        profile = profile_res.data[0] if profile_res.data else {"role": "student", "name": email}

        return jsonify({
            "token": token,
            "refresh_token": refresh_token,
            "user": {
                "id": user_id,
                "name": profile.get("name") or email,
                "email": email,
                "role": profile.get("role", "student")
            }
        }), 200

    except Exception as e:
        msg = str(e)
        if "Email not confirmed" in msg:
            return jsonify({"message": "Please verify your email before signing in."}), 401
        if "Invalid login credentials" not in msg:
            logger.warning("Login failed with unexpected error: %s", msg)
        # Same message for unknown email and wrong password (no account enumeration)
        return jsonify({"message": "Incorrect email or password."}), 401


@auth_bp.route('/signup', methods=['POST'])
@limiter.limit("5 per minute; 20 per hour")
def signup():
    data = _json()
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    name = " ".join(str(data.get('name', '')).split())

    if not email or not password or not name:
        return jsonify({"message": "Full name, email, and password are required."}), 400
    if len(name) > 100:
        return jsonify({"message": "Name is too long."}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"message": "Please enter a valid email address."}), 400
    if not _email_allowed(email):
        domains = ", ".join("@" + d for d in Config.ALLOWED_EMAIL_DOMAINS)
        return jsonify({"message": f"Please sign up with your college email ({domains})."}), 400
    problem = _password_problem(password)
    if problem:
        return jsonify({"message": problem}), 400
    if data.get('accepted_privacy') is not True:
        return jsonify({"message": "Please accept the Privacy Policy to create an account."}), 400

    try:
        temp_client = get_supabase_client()
        res = temp_client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "email_redirect_to": f"{Config.FRONTEND_URL}/login",
                "data": {
                    "full_name": name,
                    # Record of consent to the privacy notice (DPDP Act 2023)
                    "privacy_policy_version": Config.PRIVACY_POLICY_VERSION,
                    "privacy_accepted_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        })

        if not res.user:
            return jsonify({"message": "Signup failed. Please try again."}), 400

        # Identities list is empty when the user already exists.
        # Respond exactly like a fresh signup so the form can't be used to discover accounts.
        already_exists = (
            getattr(res.user, 'identities', None) is not None and len(res.user.identities) == 0
        )
        if not already_exists:
            # Create/upsert the student profile using the service-role client
            try:
                supabase.table("profiles").upsert({
                    "id": res.user.id,
                    "name": name,
                    "role": "student"  # always student — never accept role from client
                }).execute()
            except Exception as profile_err:
                # Log but don't fail the signup — a DB trigger may have already created it
                logger.warning("Profile upsert warning: %s", profile_err)

        if res.session is None or already_exists:
            return jsonify({
                "message": "Account created! Please check your email to verify your account before signing in.",
                "requires_confirmation": True
            }), 200
        return jsonify({
            "message": "Account created successfully. You can now sign in.",
            "requires_confirmation": False
        }), 200

    except Exception as e:
        msg = str(e).lower()
        if "already registered" in msg or "already exists" in msg:
            return jsonify({
                "message": "Account created! Please check your email to verify your account before signing in.",
                "requires_confirmation": True
            }), 200
        if "invalid" in msg and "email" in msg:
            return jsonify({"message": "Please enter a valid email address."}), 400
        if "weak password" in msg or "password should" in msg or "pwned" in msg:
            return jsonify({"message": "That password is too weak or has appeared in a data breach. Please choose another."}), 400
        logger.exception("Signup failed")
        return jsonify({"message": "Signup failed. Please try again later."}), 400


@auth_bp.route('/reset-password', methods=['POST'])
@limiter.limit("3 per minute; 10 per hour")
def reset_password():
    data = _json()
    email = str(data.get('email', '')).strip().lower()
    if not email or len(email) > 320:
        return jsonify({"message": "Email required"}), 400

    try:
        temp_client = get_supabase_client()
        temp_client.auth.reset_password_for_email(
            email,
            {"redirect_to": f"{Config.FRONTEND_URL}/update-password"}
        )
    except Exception as e:
        # Still return 200 to avoid email enumeration
        logger.warning("Reset password error (suppressed): %s", e)
    # Never reveal whether the email exists
    return jsonify({"message": "If your email is registered, a reset link has been sent."}), 200


@auth_bp.route('/update-password', methods=['POST'])
@limiter.limit("5 per minute")
def update_password():
    data = _json()
    new_password = str(data.get('password', ''))
    access_token = str(data.get('access_token', ''))
    refresh_token = str(data.get('refresh_token', ''))

    if not new_password or not access_token or not refresh_token:
        return jsonify({"message": "Password and valid session tokens required"}), 400

    problem = _password_problem(new_password)
    if problem:
        return jsonify({"message": problem}), 400

    try:
        temp_client = get_supabase_client()
        temp_client.auth.set_session(access_token, refresh_token)
        temp_client.auth.update_user({"password": new_password})
        # Sign out every other session that might be using the old password
        try:
            temp_client.auth.sign_out({"scope": "others"})
        except Exception:
            pass
        return jsonify({"message": "Password updated successfully. You can now sign in."}), 200
    except Exception as e:
        msg = str(e).lower()
        if "expired" in msg or "invalid" in msg:
            return jsonify({"message": "The reset link has expired. Please request a new one."}), 400
        if "weak" in msg or "pwned" in msg:
            return jsonify({"message": "That password is too weak or has appeared in a data breach. Please choose another."}), 400
        if "different from the old" in msg or "same" in msg:
            return jsonify({"message": "Choose a password you haven't used before."}), 400
        logger.exception("Password update failed")
        return jsonify({"message": "Failed to update password. Please try again."}), 400


@auth_bp.route('/refresh', methods=['POST'])
@limiter.limit("30 per minute")
def refresh():
    data = _json()
    refresh_token = str(data.get('refresh_token', ''))
    if not refresh_token or len(refresh_token) > 512:
        return jsonify({"message": "Refresh token required"}), 400

    try:
        temp_client = get_supabase_client()
        res = temp_client.auth.refresh_session(refresh_token)
        if not res.session:
            return jsonify({"message": "Session expired. Please sign in again."}), 401

        return jsonify({
            "token": res.session.access_token,
            "refresh_token": res.session.refresh_token
        }), 200
    except Exception:
        return jsonify({"message": "Session expired. Please sign in again."}), 401


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    # Revoke this session's refresh token so a stolen copy can't be reused
    try:
        supabase.auth.admin.sign_out(g.access_token, "local")
    except Exception as e:
        logger.warning("Session revoke failed on logout: %s", e)
    return '', 204


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    return jsonify({"user": g.user}), 200
