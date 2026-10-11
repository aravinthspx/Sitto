from flask import Blueprint, request, jsonify, g
from app.database.connection import supabase, get_supabase_client
from app.middleware.auth import require_auth

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('username', '').strip()  # frontend sends 'username' field
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"message": "Email and password required"}), 400

    try:
        temp_client = get_supabase_client()
        res = temp_client.auth.sign_in_with_password({"email": email, "password": password})
        if not res.session:
            return jsonify({"message": "Invalid credentials"}), 401

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
                "role": profile.get("role", "student")
            }
        }), 200

    except Exception as e:
        msg = str(e)
        if "Email not confirmed" in msg:
            return jsonify({"message": "Please verify your email before signing in."}), 401
        if "Invalid login credentials" in msg:
            return jsonify({"message": "Incorrect email or password."}), 401
        return jsonify({"message": "Sign-in failed. Please try again."}), 401


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json or {}
    email = data.get('email', '').strip()
    password = data.get('password', '')
    name = data.get('name', '').strip()

    if not email or not password or not name:
        return jsonify({"message": "Full name, email, and password are required."}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters."}), 400

    try:
        temp_client = get_supabase_client()
        res = temp_client.auth.sign_up({
            "email": email,
            "password": password,
            "options": {
                "data": {"full_name": name}
            }
        })

        if not res.user:
            return jsonify({"message": "Signup failed. Please try again."}), 400

        # Identities list is empty when the user already exists but is unconfirmed.
        # Supabase returns a 200 in that case — we must detect it.
        if hasattr(res.user, 'identities') and res.user.identities is not None and len(res.user.identities) == 0:
            return jsonify({
                "message": "An account with this email already exists. Check your inbox for a confirmation email.",
                "already_exists": True
            }), 200

        # Create/upsert the student profile using the service-role client
        try:
            supabase.table("profiles").upsert({
                "id": res.user.id,
                "name": name,
                "role": "student"  # always student — never accept role from client
            }).execute()
        except Exception as profile_err:
            # Log but don't fail the signup — a DB trigger may have already created it
            print(f"Profile upsert warning: {profile_err}")

        email_confirmation_required = res.session is None
        if email_confirmation_required:
            return jsonify({
                "message": "Account created! Please check your email to verify your account before signing in.",
                "requires_confirmation": True
            }), 200
        else:
            return jsonify({
                "message": "Account created successfully. You can now sign in.",
                "requires_confirmation": False
            }), 200

    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower() or "already exists" in msg.lower():
            return jsonify({"message": "An account with this email already exists."}), 409
        if "invalid email" in msg.lower():
            return jsonify({"message": "Please enter a valid email address."}), 400
        if "weak password" in msg.lower() or "password should" in msg.lower():
            return jsonify({"message": "Password is too weak. Please use at least 6 characters with letters and numbers."}), 400
        return jsonify({"message": f"Signup failed: {msg}"}), 400


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = data.get('email', '').strip()
    if not email:
        return jsonify({"message": "Email required"}), 400

    try:
        temp_client = get_supabase_client()
        temp_client.auth.reset_password_for_email(
            email,
            {"redirect_to": "http://localhost:5173/update-password"}
        )
        # Never reveal whether the email exists
        return jsonify({"message": "If your email is registered, a reset link has been sent."}), 200
    except Exception as e:
        # Still return 200 to avoid email enumeration
        print(f"Reset password error (suppressed): {e}")
        return jsonify({"message": "If your email is registered, a reset link has been sent."}), 200


@auth_bp.route('/update-password', methods=['POST'])
def update_password():
    data = request.json or {}
    new_password = data.get('password', '')
    access_token = data.get('access_token', '')
    refresh_token = data.get('refresh_token', '')

    if not new_password or not access_token or not refresh_token:
        return jsonify({"message": "Password and valid session tokens required"}), 400

    if len(new_password) < 6:
        return jsonify({"message": "Password must be at least 6 characters."}), 400

    try:
        temp_client = get_supabase_client()
        temp_client.auth.set_session(access_token, refresh_token)
        temp_client.auth.update_user({"password": new_password})
        return jsonify({"message": "Password updated successfully. You can now sign in."}), 200
    except Exception as e:
        msg = str(e)
        if "expired" in msg.lower() or "invalid" in msg.lower():
            return jsonify({"message": "The reset link has expired. Please request a new one."}), 400
        return jsonify({"message": "Failed to update password. Please try again."}), 400


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.json or {}
    refresh_token = data.get('refresh_token', '')
    if not refresh_token:
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
    except Exception as e:
        return jsonify({"message": "Session expired. Please sign in again."}), 401


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    # JWT is stateless; session cleanup is client-side.
    # Optionally we could call supabase auth.sign_out() with the user token here.
    return '', 204


@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    return jsonify({"user": g.user}), 200
