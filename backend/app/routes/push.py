from flask import Blueprint, g, jsonify, request

from app import push
from app.config import Config
from app.database.connection import supabase
from app.middleware.auth import require_auth
from app.security import limiter, server_error

push_bp = Blueprint('push', __name__, url_prefix='/api/push')


def _json():
    return request.get_json(silent=True) or {}


@push_bp.route('/public-key', methods=['GET'])
@require_auth
def public_key():
    if not push.is_configured():
        return jsonify({"message": "Phone notifications are not set up on this server."}), 503
    return jsonify({"publicKey": Config.VAPID_PUBLIC_KEY}), 200


@push_bp.route('/subscribe', methods=['POST'])
@require_auth
@limiter.limit("20 per hour")
def subscribe():
    data = _json()
    endpoint = data.get('endpoint')
    keys = data.get('keys') if isinstance(data.get('keys'), dict) else {}
    if not push.is_allowed_endpoint(endpoint):
        return jsonify({"message": "Unsupported push service."}), 400
    if not push.is_valid_key_material(keys.get('p256dh'), keys.get('auth')):
        return jsonify({"message": "Invalid subscription keys."}), 400

    try:
        # Upsert by endpoint: a device that was used by someone else now belongs to this user
        supabase.table('push_subscriptions').upsert({
            'user_id': g.user['id'],
            'endpoint': endpoint,
            'p256dh': keys['p256dh'],
            'auth': keys['auth'],
            'user_agent': (request.headers.get('User-Agent') or '')[:300],
        }, on_conflict='endpoint').execute()
        return jsonify({"success": True}), 201
    except Exception as e:
        return server_error(e)


@push_bp.route('/unsubscribe', methods=['POST'])
@require_auth
def unsubscribe():
    endpoint = _json().get('endpoint')
    if not isinstance(endpoint, str) or len(endpoint) > 1024:
        return jsonify({"message": "Invalid endpoint."}), 400
    try:
        supabase.table('push_subscriptions').delete() \
            .eq('endpoint', endpoint).eq('user_id', g.user['id']).execute()
        return '', 204
    except Exception as e:
        return server_error(e)


@push_bp.route('/test', methods=['POST'])
@require_auth
@limiter.limit("5 per hour")
def test():
    if not push.is_configured():
        return jsonify({"message": "Phone notifications are not set up on this server."}), 503
    sent = push.send_to_user(g.user['id'], {
        "title": "SITTO notifications are on ✓",
        "body": "You'll get booking updates and SeatSure checks on this device.",
        "type": "TEST",
        "url": "/notifications",
        "tag": "TEST",
    }, ttl=300, wait=True)
    if not sent:
        return jsonify({"message": "No device is subscribed yet. Enable notifications first."}), 404
    return jsonify({"success": True, "devices": sent}), 200
