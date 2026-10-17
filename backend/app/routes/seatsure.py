from flask import Blueprint, request, jsonify, g
from app.database.connection import supabase
from app.security import server_error
from app.middleware.auth import require_auth
from datetime import datetime, timezone

seatsure_bp = Blueprint('seatsure', __name__, url_prefix='/api/seatsure')


def _notify(user_id, notif_type, title, message, reservation_id=None):
    """Insert a notification with fallback for missing columns."""
    payload = {'user_id': user_id, 'type': notif_type, 'title': title, 'message': message, 'is_read': False}
    if reservation_id:
        payload['reservation_id'] = reservation_id
    try:
        supabase.table('notifications').insert(payload).execute()
    except Exception as e:
        try:
            minimal = {k: v for k, v in payload.items()
                       if k in ('user_id', 'type', 'title', 'message', 'is_read')}
            supabase.table('notifications').insert(minimal).execute()
        except Exception as e2:
            print(f"[seatsure/_notify] fallback also failed: {e2}")


@seatsure_bp.route('/<task_id>/respond', methods=['POST'])
@require_auth
def respond_to_seatsure(task_id):
    import uuid
    try:
        uuid.UUID(str(task_id))
    except ValueError:
        return jsonify({"message": "Invalid verification task ID."}), 400

    data = request.get_json(silent=True) or {}
    response = data.get('response')  # 'YES' or 'NO'

    if response not in ['YES', 'NO']:
        return jsonify({"message": "Invalid response. Must be YES or NO."}), 400

    try:
        # Find the task with its occupancy session
        task_res = (
            supabase.table('seatsure_tasks')
            .select('*, occupancy_session:occupancy_sessions(id, reservation_id, status)')
            .eq('id', task_id)
            .execute()
        )
        if not task_res.data:
            return jsonify({"message": "Verification task not found."}), 404

        task = task_res.data[0]

        if task['status'] != 'PENDING':
            return jsonify({"message": f"This verification request has already been {task['status'].lower()}."}), 400

        # Security: verify this user owns the reservation
        res_id = task['occupancy_session']['reservation_id']
        res_data = supabase.table('reservations').select('user_id').eq('id', res_id).execute()
        if not res_data.data or res_data.data[0]['user_id'] != g.user['id']:
            return jsonify({"message": "Access denied"}), 403

        # Check deadline — the server deadline is authoritative
        deadline = datetime.fromisoformat(task['deadline'].replace('Z', '+00:00'))
        if datetime.now(deadline.tzinfo) > deadline:
            return jsonify({"message": "Response time has expired. A staff member will verify your presence."}), 400

        occ_id = task['occupancy_session_id']

        if response == 'YES':
            # F5 — Presence confirmed
            supabase.table('seatsure_tasks').update({'status': 'CONFIRMED'}).eq('id', task_id).execute()
            # Keep occupancy session as OCCUPIED (no change to end time)
            _notify(
                user_id=g.user['id'],
                notif_type='SEATSURE_CONFIRMED',
                title='Presence Confirmed ✓',
                message='Great! Your presence has been confirmed. Enjoy your remaining session.',
                reservation_id=res_id
            )
            return jsonify({"success": True, "message": "Presence confirmed. Enjoy your session!"}), 200

        else:  # NO — student is voluntarily releasing
            supabase.table('seatsure_tasks').update({'status': 'CANCELLED'}).eq('id', task_id).execute()
            supabase.table('occupancy_sessions').update({'status': 'RELEASED'}).eq('id', occ_id).execute()
            supabase.table('reservations').update({'status': 'COMPLETED'}).eq('id', res_id).execute()
            # F7 — Voluntary release
            _notify(
                user_id=g.user['id'],
                notif_type='BOOKING_CANCELLED',
                title='Seat Released',
                message='You have released your seat. The booking has been marked as completed.',
                reservation_id=res_id
            )
            return jsonify({"success": True, "message": "Seat released. Thank you!"}), 200

    except Exception as e:
        return server_error(e)

@seatsure_bp.route('/respond-active', methods=['POST'])
@require_auth
def respond_active():
    data = request.get_json(silent=True) or {}
    response = data.get('response')

    if response not in ['YES', 'NO']:
        return jsonify({"message": "Invalid response. Must be YES or NO."}), 400

    try:
        # Find active checked_in reservations for this user
        res_data = supabase.table('reservations').select('id').eq('user_id', g.user['id']).in_('status', ['CHECKED_IN']).execute()
        if not res_data.data:
            return jsonify({"message": "No active checked-in reservations found."}), 404

        res_ids = [r['id'] for r in res_data.data]

        # Find active occupancy sessions
        occ_data = supabase.table('occupancy_sessions').select('id').in_('reservation_id', res_ids).eq('status', 'OCCUPIED').execute()
        if not occ_data.data:
            return jsonify({"message": "No active occupancy sessions found."}), 404

        occ_ids = [o['id'] for o in occ_data.data]

        # Find pending seatsure tasks for these sessions
        task_data = supabase.table('seatsure_tasks').select('id').in_('occupancy_session_id', occ_ids).eq('status', 'PENDING').execute()
        
        if not task_data.data:
            return jsonify({"message": "No pending verification tasks found."}), 404
            
        if len(task_data.data) > 1:
            return jsonify({"message": "Multiple pending verification tasks found. Unable to resolve automatically."}), 409
            
        # We process the only pending task found for their active sessions
        task_id = task_data.data[0]['id']
        
        # Now just reuse the logic from the other endpoint by calling it directly, 
        # but we have to manipulate the request context if we want to call it directly.
        # Instead, let's just duplicate the core resolution logic for simplicity and reliability.
        
        task_res = (
            supabase.table('seatsure_tasks')
            .select('*, occupancy_session:occupancy_sessions(id, reservation_id, status)')
            .eq('id', task_id)
            .execute()
        )
        task = task_res.data[0]
        
        res_id = task['occupancy_session']['reservation_id']
        occ_id = task['occupancy_session_id']
        
        deadline = datetime.fromisoformat(task['deadline'].replace('Z', '+00:00'))
        if datetime.now(deadline.tzinfo) > deadline:
            return jsonify({"message": "Response time has expired. A staff member will verify your presence."}), 400
            
        if response == 'YES':
            supabase.table('seatsure_tasks').update({'status': 'CONFIRMED'}).eq('id', task_id).execute()
            _notify(
                user_id=g.user['id'],
                notif_type='SEATSURE_CONFIRMED',
                title='Presence Confirmed ✓',
                message='Great! Your presence has been confirmed. Enjoy your remaining session.',
                reservation_id=res_id
            )
            return jsonify({"success": True, "message": "Presence confirmed. Enjoy your session!"}), 200
        else:
            supabase.table('seatsure_tasks').update({'status': 'CANCELLED'}).eq('id', task_id).execute()
            supabase.table('occupancy_sessions').update({'status': 'RELEASED'}).eq('id', occ_id).execute()
            supabase.table('reservations').update({'status': 'COMPLETED'}).eq('id', res_id).execute()
            _notify(
                user_id=g.user['id'],
                notif_type='BOOKING_CANCELLED',
                title='Seat Released',
                message='You have released your seat. The booking has been marked as completed.',
                reservation_id=res_id
            )
            return jsonify({"success": True, "message": "Seat released. Thank you!"}), 200

    except Exception as e:
        return server_error(e)
