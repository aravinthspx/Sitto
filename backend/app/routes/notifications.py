from flask import Blueprint, jsonify, request, g
from app.database.connection import supabase
from app.security import server_error
from app.middleware.auth import require_auth
from app.push import push_for_notification

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """Return all notifications for the authenticated user, newest first."""
    try:
        # Try full select including extended columns
        try:
            res = (
                supabase.table('notifications')
                .select('id, user_id, type, title, message, is_read, created_at, expires_at, reservation_id, seatsure_task_id, action_url')
                .eq('user_id', g.user['id'])
                .order('created_at', desc=True)
                .execute()
            )
        except Exception:
            # Fall back to core columns if extended ones don't exist
            res = (
                supabase.table('notifications')
                .select('id, user_id, type, title, message, is_read, created_at, expires_at')
                .eq('user_id', g.user['id'])
                .order('created_at', desc=True)
                .execute()
            )
        return jsonify(res.data), 200
    except Exception as e:
        return server_error(e)


@notifications_bp.route('/unread-count', methods=['GET'])
@require_auth
def unread_count():
    """Return the count of unread notifications for badge display."""
    try:
        res = (
            supabase.table('notifications')
            .select('id', count='exact')
            .eq('user_id', g.user['id'])
            .eq('is_read', False)
            .execute()
        )
        return jsonify({'count': res.count or 0}), 200
    except Exception as e:
        return server_error(e)


@notifications_bp.route('/<notif_id>/read', methods=['POST'])
@require_auth
def mark_read(notif_id):
    """Mark a single notification as read. Only the owner may do this."""
    try:
        # Verify ownership
        notif = supabase.table('notifications').select('user_id').eq('id', notif_id).execute()
        if not notif.data:
            return jsonify({'message': 'Notification not found'}), 404
        if notif.data[0]['user_id'] != g.user['id']:
            return jsonify({'message': 'Access denied'}), 403

        supabase.table('notifications').update({'is_read': True}).eq('id', notif_id).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return server_error(e)


@notifications_bp.route('/read-all', methods=['POST'])
@require_auth
def mark_all_read():
    """Mark all of the authenticated user's notifications as read."""
    try:
        supabase.table('notifications').update({'is_read': True}).eq('user_id', g.user['id']).execute()
        return jsonify({'success': True}), 200
    except Exception as e:
        return server_error(e)


# ─── Internal helper (used by other routes) ─────────────────────────────────

def create_notification(user_id: str, notif_type: str, title: str, message: str,
                         reservation_id: str = None, expires_at: str = None,
                         action_url: str = None, seatsure_task_id: str = None):
    """
    Create a notification in the database.
    Called server-side only — never from the client.
    Falls back to minimal columns if extended ones are missing.
    Returns the created notification dict, or None on failure.
    """
    payload = {
        'user_id': user_id,
        'type': notif_type,
        'title': title,
        'message': message,
        'is_read': False,
    }
    if reservation_id:
        payload['reservation_id'] = reservation_id
    if expires_at:
        payload['expires_at'] = expires_at
    if action_url:
        payload['action_url'] = action_url
    if seatsure_task_id:
        payload['seatsure_task_id'] = seatsure_task_id

    push_for_notification(user_id, notif_type, title, message, reservation_id=reservation_id,
                          seatsure_task_id=seatsure_task_id, action_url=action_url)
    try:
        res = supabase.table('notifications').insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        # Fall back to minimal columns
        try:
            minimal = {k: v for k, v in payload.items()
                       if k in ('user_id', 'type', 'title', 'message', 'is_read', 'expires_at')}
            res = supabase.table('notifications').insert(minimal).execute()
            return res.data[0] if res.data else None
        except Exception as e2:
            print(f"[notifications] create_notification fallback error: {e2}")
            return None
