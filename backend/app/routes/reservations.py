import uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, jsonify, request, g
from app.database.connection import supabase
from app.middleware.auth import require_auth

reservations_bp = Blueprint('reservations', __name__, url_prefix='/api/reservations')


def _notify(user_id, notif_type, title, message, reservation_id=None, expires_at=None, action_url=None, seatsure_task_id=None):
    """Fire-and-forget notification helper. Swallows errors to protect the booking transaction.
    Falls back to minimal columns if extended columns are missing from the schema."""
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
    try:
        supabase.table('notifications').insert(payload).execute()
    except Exception as e:
        # Column may not exist yet — fall back to minimal payload
        try:
            minimal = {k: v for k, v in payload.items()
                       if k in ('user_id', 'type', 'title', 'message', 'is_read', 'expires_at')}
            supabase.table('notifications').insert(minimal).execute()
        except Exception as e2:
            print(f"[notify] warning (fallback also failed): {e2}")


def generate_qr_token():
    return f"QR_{uuid.uuid4().hex}"


@reservations_bp.route('', methods=['POST'])
@require_auth
def create_reservation():
    data = request.json or {}
    space_id = data.get('space_id')
    seat_label = data.get('seat_id')  # Frontend sends label as ID
    start = data.get('start')
    end = data.get('end')

    if not all([space_id, seat_label, start, end]):
        return jsonify({"message": "Missing required fields"}), 400

    try:
        # 1. Validate space type
        space_res = supabase.table('spaces').select('type, name').eq('id', space_id).execute()
        if not space_res.data:
            return jsonify({"message": "Space not found"}), 404

        space_type = space_res.data[0].get('type', '')
        valid_types = ['Lab', 'Laboratory', 'Library', 'lab', 'laboratory', 'library', 'LAB', 'LIBRARY']
        if space_type not in valid_types:
            return jsonify({"message": "Booking is only allowed for labs and libraries"}), 403

        space_name = space_res.data[0]['name']

        # 2. Look up seat UUID
        seat_res = supabase.table('seats').select('id').eq('space_id', space_id).eq('label', seat_label).execute()
        if not seat_res.data:
            return jsonify({"message": "Seat not found"}), 404
        db_seat_id = seat_res.data[0]['id']

        # 3. Student limit check
        user_id = g.user['id']
        from app.config import Config
        active_res = (
            supabase.table('reservations')
            .select('id')
            .eq('user_id', user_id)
            .in_('status', ['RESERVED', 'CHECKED_IN'])
            .lt('start_time', end)
            .gt('end_time', start)
            .execute()
        )
        if len(active_res.data) >= Config.MAX_SEATS_PER_STUDENT:
            return jsonify({"message": f"You can select up to {Config.MAX_SEATS_PER_STUDENT} seats per session"}), 400

        # 4. Create reservation
        res_id = f"RES{str(uuid.uuid4().int)[:8]}"
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        deadline = (start_dt + timedelta(minutes=15)).isoformat()

        new_res = {
            "id": res_id,
            "user_id": user_id,
            "space_id": space_id,
            "seat_id": db_seat_id,
            "status": "RESERVED",
            "start_time": start,
            "end_time": end,
            "check_in_deadline": deadline,
            "qr_token": generate_qr_token()
        }

        insert_res = supabase.table('reservations').insert(new_res).execute()
        inserted = insert_res.data[0]

        # 5. F1 — Booking confirmed notification
        start_local = start_dt.astimezone(timezone(timedelta(hours=5, minutes=30)))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
        end_local = end_dt.astimezone(timezone(timedelta(hours=5, minutes=30)))
        date_str = start_local.strftime('%d %b %Y')
        start_str = start_local.strftime('%I:%M %p')
        end_str = end_local.strftime('%I:%M %p')

        _notify(
            user_id=user_id,
            notif_type='BOOKING_CONFIRMED',
            title='Booking Confirmed ✓',
            message=f"Your seat {seat_label} in {space_name} is booked for {date_str}, {start_str}–{end_str}. Reservation ID: {res_id}",
            reservation_id=res_id,
            action_url=f'/reservations/{res_id}'
        )

        return jsonify({
            "id": inserted['id'],
            "spaceId": inserted['space_id'],
            "spaceName": space_name,
            "seatId": seat_label,
            "status": inserted['status'],
            "startTime": inserted['start_time'],
            "endTime": inserted['end_time'],
            "checkInDeadline": inserted['check_in_deadline'],
            "qrToken": inserted['qr_token']
        }), 201

    except Exception as e:
        err = str(e)
        if "overlapping" in err.lower() or "exclude" in err.lower():
            return jsonify({"message": "Seat is no longer available for the selected time."}), 409
        return jsonify({"message": err}), 500


@reservations_bp.route('/me', methods=['GET'])
@require_auth
def get_my_reservations():
    try:
        res = (
            supabase.table('reservations')
            .select('*, space:spaces(name), seat:seats(label)')
            .eq('user_id', g.user['id'])
            .order('start_time', desc=True)
            .execute()
        )
        output = []
        for r in res.data:
            output.append({
                "id": r['id'],
                "spaceId": r['space_id'],
                "spaceName": r['space']['name'] if r.get('space') else r['space_id'],
                "seatId": r['seat']['label'] if r.get('seat') else None,
                "status": r['status'],
                "startTime": r['start_time'],
                "endTime": r['end_time'],
                "checkInDeadline": r['check_in_deadline'],
                "qrToken": r['qr_token']
            })
        return jsonify(output), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@reservations_bp.route('/<res_id>', methods=['GET'])
@require_auth
def get_reservation(res_id):
    try:
        res = (
            supabase.table('reservations')
            .select('*, space:spaces(name), seat:seats(label)')
            .eq('id', res_id)
            .execute()
        )
        if not res.data:
            return jsonify({"message": "Reservation not found"}), 404

        r = res.data[0]
        if r['user_id'] != g.user['id'] and g.user['role'] != 'admin':
            return jsonify({"message": "Access denied"}), 403

        return jsonify({
            "id": r['id'],
            "spaceId": r['space_id'],
            "spaceName": r['space']['name'] if r.get('space') else r['space_id'],
            "seatId": r['seat']['label'] if r.get('seat') else None,
            "status": r['status'],
            "startTime": r['start_time'],
            "endTime": r['end_time'],
            "checkInDeadline": r['check_in_deadline'],
            "qrToken": r['qr_token']
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500


@reservations_bp.route('/<res_id>/checkin', methods=['POST'])
@require_auth
def check_in(res_id):
    if g.user['role'] != 'admin':
        return jsonify({"message": "Admin access required for check-in"}), 403

    try:
        data = request.json or {}
        qr_token = data.get('qr_token')

        res = supabase.table('reservations').select('*').eq('id', res_id).execute()
        if not res.data:
            return jsonify({"message": "Reservation not found"}), 404
        r = res.data[0]

        if r['status'] != 'RESERVED':
            return jsonify({"message": f"Reservation is already {r['status']}"}), 400

        if qr_token and r['qr_token'] != qr_token:
            return jsonify({"message": "Invalid QR token"}), 400

        deadline = datetime.fromisoformat(r['check_in_deadline'].replace('Z', '+00:00'))
        if datetime.now(deadline.tzinfo) > deadline:
            supabase.table('reservations').update({'status': 'EXPIRED'}).eq('id', res_id).execute()
            return jsonify({"message": "Check-in deadline has expired"}), 400

        # Update reservation and create occupancy session
        supabase.table('reservations').update({'status': 'CHECKED_IN'}).eq('id', res_id).execute()
        supabase.table('occupancy_sessions').insert({
            'reservation_id': res_id,
            'seat_id': r['seat_id'],
            'status': 'OCCUPIED'
        }).execute()

        # Get seat label for notification
        seat_info = supabase.table('seats').select('label').eq('id', r['seat_id']).execute()
        seat_label = seat_info.data[0]['label'] if seat_info.data else 'Unknown'
        space_info = supabase.table('spaces').select('name').eq('id', r['space_id']).execute()
        space_name = space_info.data[0]['name'] if space_info.data else r['space_id']

        now_local = datetime.now(timezone(timedelta(hours=5, minutes=30)))

        # F3 — Successful check-in notification
        _notify(
            user_id=r['user_id'],
            notif_type='CHECKIN_SUCCESS',
            title='Check-in Successful ✓',
            message=f"You have successfully checked in to seat {seat_label} in {space_name} at {now_local.strftime('%I:%M %p')}. SeatSure monitoring is now active.",
            reservation_id=res_id,
            action_url=f'/reservations/{res_id}'
        )

        r['status'] = 'CHECKED_IN'
        return jsonify(r), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@reservations_bp.route('/<res_id>/checkout', methods=['POST'])
@require_auth
def check_out(res_id):
    if g.user['role'] != 'admin':
        return jsonify({"message": "Admin access required for checkout"}), 403

    try:
        res = supabase.table('reservations').select('*').eq('id', res_id).execute()
        if not res.data:
            return jsonify({"message": "Reservation not found"}), 404
        r = res.data[0]

        if r['status'] != 'CHECKED_IN':
            return jsonify({"message": f"Cannot checkout from status: {r['status']}"}), 400

        supabase.table('reservations').update({'status': 'COMPLETED'}).eq('id', res_id).execute()
        supabase.table('occupancy_sessions').update({'status': 'COMPLETED'}).eq('reservation_id', res_id).execute()

        # Cancel any pending SeatSure tasks for this reservation
        occ_res = supabase.table('occupancy_sessions').select('id').eq('reservation_id', res_id).execute()
        if occ_res.data:
            occ_id = occ_res.data[0]['id']
            supabase.table('seatsure_tasks').update({'status': 'CANCELLED'}).eq('occupancy_session_id', occ_id).eq('status', 'PENDING').execute()

        now_local = datetime.now(timezone(timedelta(hours=5, minutes=30)))

        # F8 — Checkout notification
        seat_info = supabase.table('seats').select('label').eq('id', r['seat_id']).execute()
        seat_label = seat_info.data[0]['label'] if seat_info.data else 'Unknown'
        space_info = supabase.table('spaces').select('name').eq('id', r['space_id']).execute()
        space_name = space_info.data[0]['name'] if space_info.data else r['space_id']

        _notify(
            user_id=r['user_id'],
            notif_type='CHECKOUT_SUCCESS',
            title='Checkout Successful',
            message=f"You have checked out from seat {seat_label} in {space_name} at {now_local.strftime('%I:%M %p')}. Booking completed.",
            reservation_id=res_id,
            action_url=f'/reservations/{res_id}'
        )

        r['status'] = 'COMPLETED'
        return jsonify(r), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500


@reservations_bp.route('/<res_id>/cancel', methods=['POST'])
@require_auth
def cancel(res_id):
    try:
        res = supabase.table('reservations').select('*').eq('id', res_id).execute()
        if not res.data:
            return jsonify({"message": "Reservation not found"}), 404
        r = res.data[0]

        if r['user_id'] != g.user['id'] and g.user['role'] != 'admin':
            return jsonify({"message": "Access denied"}), 403

        if r['status'] != 'RESERVED':
            return jsonify({"message": f"Cannot cancel a reservation with status: {r['status']}"}), 400

        supabase.table('reservations').update({'status': 'CANCELLED'}).eq('id', res_id).execute()

        # F7 — Cancellation notification
        seat_info = supabase.table('seats').select('label').eq('id', r['seat_id']).execute()
        seat_label = seat_info.data[0]['label'] if seat_info.data else 'Unknown'
        space_info = supabase.table('spaces').select('name').eq('id', r['space_id']).execute()
        space_name = space_info.data[0]['name'] if space_info.data else r['space_id']

        _notify(
            user_id=r['user_id'],
            notif_type='BOOKING_CANCELLED',
            title='Booking Cancelled',
            message=f"Your booking for seat {seat_label} in {space_name} has been cancelled.",
            reservation_id=res_id
        )

        r['status'] = 'CANCELLED'
        return jsonify(r), 200

    except Exception as e:
        return jsonify({"message": str(e)}), 500
