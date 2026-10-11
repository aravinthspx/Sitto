import jwt
import requests
from functools import wraps
from flask import request, jsonify, g
from app.config import Config
from app.database.connection import supabase

def get_jwks():
    url = f"{Config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
    return None

_jwk_client = None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        global _jwk_client
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"message": "Missing or invalid authorization header"}), 401
            
        token = auth_header.split(" ")[1]
        try:
            # Check algorithm
            unverified_headers = jwt.get_unverified_header(token)
            alg = unverified_headers.get("alg")
            
            # Verify using ES256 ONLY
            if alg != "ES256":
                return jsonify({"message": f"Only ES256 tokens are supported. Got: {alg}"}), 401
                
            if _jwk_client is None:
                jwks_url = f"{Config.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
                _jwk_client = jwt.PyJWKClient(jwks_url)
                
            signing_key = _jwk_client.get_signing_key_from_jwt(token)
            
            # The issuer for Supabase is exactly the SUPABASE_URL/auth/v1
            issuer = f"{Config.SUPABASE_URL}/auth/v1"
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256"],
                audience="authenticated",
                issuer=issuer
            )

            # Look up profile role
            user_id = payload.get("sub")
            if not user_id:
                return jsonify({"message": "Invalid token payload"}), 401
                
            res = supabase.table("profiles").select("role, name").eq("id", user_id).execute()
            profile = res.data[0] if res.data else {"role": "student", "name": "Unknown"}
            
            g.user = {
                "id": user_id,
                "role": profile.get("role", "student"),
                "name": profile.get("name")
            }
            
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"message": f"Invalid token: {str(e)}"}), 401
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"message": f"Auth error: {str(e)}"}), 500
            
    return decorated
