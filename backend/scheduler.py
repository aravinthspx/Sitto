"""
SeatSure background scheduler — production + demo mode.

Run as a separate process:
    python scheduler.py             # production timing
    SEATSURE_DEMO=1 python scheduler.py  # accelerated demo (30s windows)

Timing:
  Production:
    - Midpoint: halfway between actual check-in and end_time
    - Student window: 180 s
    - Admin window: 300 s

  Demo (SEATSURE_DEMO=1):
    - Midpoint notification: 30 s after check-in
    - Student window: 60 s
    - Admin window: 60 s
"""

import os
import sys
import time
import schedule
from datetime import datetime, timedelta, timezone

# --------------------------------------------------------------------------- #
#  Bootstrap: load .env so the scheduler works when run directly              #
# --------------------------------------------------------------------------- #
_here = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_here, '.env')
if os.path.exists(_env_path):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=_env_path)

sys.path.insert(0, _here)
from app.database.connection import supabase

# --------------------------------------------------------------------------- #
#  Timing config                                                               #
# --------------------------------------------------------------------------- #
DEMO_MODE = os.environ.get('SEATSURE_DEMO', '').lower() in ('1', 'true', 'yes')

if DEMO_MODE:
    STUDENT_WINDOW_SECS = 60      # Student has 60 s to respond
    ADMIN_WINDOW_SECS   = 60      # Admin has 60 s after escalation
    DEMO_DELAY_SECS     = 30      # Trigger midpoint 30 s after check-in
    print("[scheduler] ⚡ DEMO MODE active — 30s trigger / 60s windows")
else:
    STUDENT_WINDOW_SECS = 180     # 3 minutes
    ADMIN_WINDOW_SECS   = 300     # 5 minutes
    DEMO_DELAY_SECS     = None    # Real midpoint calculation
    print("[scheduler] 🟢 PRODUCTION MODE — real midpoint timing")

IST = timezone(timedelta(hours=5, minutes=30))


# --------------------------------------------------------------------------- #
#  Notification helper                                                         #
# --------------------------------------------------------------------------- #
def _notify(user_id, notif_type, title, message,
            reservation_id=None, expires_at=None,
            action_url=None, seatsure_task_id=None):
    """Insert a notification row. Swallows errors to protect the sweep."""
    try:
        payload = {
            'user_id':  user_id,
            'type':     notif_type,
            'title':    title,
            'message':  message,
            'is_read':  False,
        }
        # Only include optional fields the DB schema actually has
        if expires_at:
            payload['expires_at'] = expires_at
        # Try extended fields — if column missing, fall back silently
        _safe_set(payload, 'reservation_id', reservation_id)
        _safe_set(payload, 'action_url',     action_url)
        _safe_set(payload, 'seatsure_task_id', seatsure_task_id)
        supabase.table('notifications').insert(payload).execute()
    except Exception as e:
        # Remove unsupported columns and retry with minimal payload
        try:
            minimal = {k: v for k, v in payload.items()
                       if k in ('user_id', 'type', 'title', 'message', 'is_read', 'expires_at')}
            supabase.table('notifications').insert(minimal).execute()
        except Exception as e2:
            print(f"[scheduler/_notify] fallback also failed: {e2}")


def _safe_set(d, key, value):
    if value is not None:
        d[key] = value


# --------------------------------------------------------------------------- #
#  Admin lookup                                                                #
# --------------------------------------------------------------------------- #
def _get_admin_user_id():
    """Return the first admin user_id, or None."""
    try:
        res = supabase.table('profiles').select('id').eq('role', 'admin').limit(1).execute()
        if res.data:
            return res.data[0]['id']
    except Exception as e:
        print(f"[scheduler] Could not look up admin: {e}")
    return None


# --------------------------------------------------------------------------- #
#  Main sweep                                                                  #
# --------------------------------------------------------------------------- #
def sweep_deadlines():
    try:
        now_dt  = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()

        # ── 1. Expire missed check-ins ────────────────────────────────────── #
        missed = (
            supabase.table('reservations')
            .select('id, user_id, space_id')
            .eq('status', 'RESERVED')
            .lt('check_in_deadline', now_iso)
            .execute()
        )
        for r in missed.data:
            supabase.table('reservations').update({'status': 'EXPIRED'}).eq('id', r['id']).execute()
            space_name = _lookup_space_name(r['space_id'])
            _notify(
                user_id=r['user_id'],
                notif_type='RESERVATION_EXPIRED',
                title='Reservation Expired',
                message=(
                    f"Your reservation in {space_name} expired because you did not "
                    f"check in within the 15-minute window."
                ),
                reservation_id=r['id'],
            )
            print(f"[scheduler] Expired reservation {r['id']}")

        # ── 2. Midpoint check — create SeatSure task if due ───────────────── #
        occupied = (
            supabase.table('occupancy_sessions')
            .select('id, reservation_id, checked_in_at, reservation:reservations(end_time, user_id, status)')
            .eq('status', 'OCCUPIED')
            .execute()
        )
        for occ in occupied.data:
            try:
                # Skip if parent reservation already ended
                res_status = occ.get('reservation', {}).get('status', '')
                if res_status not in ('CHECKED_IN', 'RESERVED'):
                    continue

                end_raw      = occ['reservation']['end_time']
                checkin_raw  = occ['checked_in_at']
                end_dt       = _parse_dt(end_raw)
                checked_in   = _parse_dt(checkin_raw)

                # Past end time — skip (booking over)
                if now_dt >= end_dt:
                    continue

                # Calculate trigger point
                if DEMO_MODE:
                    trigger = checked_in + timedelta(seconds=DEMO_DELAY_SECS)
                else:
                    trigger = checked_in + (end_dt - checked_in) / 2

                if now_dt < trigger:
                    continue  # Not yet time

                # Idempotency: only create one task per occupancy session
                existing = (
                    supabase.table('seatsure_tasks')
                    .select('id')
                    .eq('occupancy_session_id', occ['id'])
                    .execute()
                )
                if existing.data:
                    continue  # Already created

                # Create student verification task
                deadline     = (now_dt + timedelta(seconds=STUDENT_WINDOW_SECS)).isoformat()
                task_payload = {
                    'occupancy_session_id': occ['id'],
                    'status':   'PENDING',
                    'deadline': deadline,
                }
                task_res = supabase.table('seatsure_tasks').insert(task_payload).execute()
                task_id  = task_res.data[0]['id'] if task_res.data else None

                user_id  = occ['reservation']['user_id']
                res_id   = occ['reservation_id']
                space_name = _lookup_space_name_from_reservation(res_id)
                seat_label = _lookup_seat_label_from_session(occ['id'])

                window_label = '1 minute' if DEMO_MODE else '3 minutes'
                _notify(
                    user_id=user_id,
                    notif_type='SEATSURE_CHECK',
                    title='SeatSure — Confirm Your Presence 🔔',
                    message=(
                        f"Are you still occupying seat {seat_label} in {space_name}? "
                        f"Confirm within {window_label} to keep your seat."
                    ),
                    reservation_id=res_id,
                    expires_at=deadline,
                    seatsure_task_id=task_id,
                    action_url='/notifications',
                )
                mode_tag = '⚡DEMO' if DEMO_MODE else 'PROD'
                print(f"[scheduler/{mode_tag}] Midpoint task created for occ {occ['id'][:8]}, deadline {deadline}")

            except Exception as e:
                print(f"[scheduler/midpoint] {occ.get('id','?')}: {e}")

        # ── 3. Student deadline expired → escalate to admin ──────────────── #
        expired_student = (
            supabase.table('seatsure_tasks')
            .select('id, occupancy_session_id, occupancy_session:occupancy_sessions(reservation_id, status)')
            .eq('status', 'PENDING')
            .lt('deadline', now_iso)
            .execute()
        )
        for t in expired_student.data:
            # Mark expired
            supabase.table('seatsure_tasks').update({'status': 'EXPIRED'}).eq('id', t['id']).execute()

            occ_id     = t['occupancy_session_id']
            occ_status = (t.get('occupancy_session') or {}).get('status', 'OCCUPIED')

            if occ_status != 'OCCUPIED':
                continue  # Already resolved

            # Transition to UNVERIFIED
            supabase.table('occupancy_sessions').update({'status': 'UNVERIFIED'}).eq('id', occ_id).execute()

            # Admin task
            admin_deadline = (now_dt + timedelta(seconds=ADMIN_WINDOW_SECS)).isoformat()
            # Idempotency: don't duplicate admin tasks
            existing_admin = (
                supabase.table('admin_verification_tasks')
                .select('id')
                .eq('occupancy_session_id', occ_id)
                .eq('status', 'PENDING')
                .execute()
            )
            if not existing_admin.data:
                supabase.table('admin_verification_tasks').insert({
                    'occupancy_session_id': occ_id,
                    'status':   'PENDING',
                    'deadline': admin_deadline,
                }).execute()

            res_id   = (t.get('occupancy_session') or {}).get('reservation_id')
            user_id  = None
            if res_id:
                res_data = supabase.table('reservations').select('user_id').eq('id', res_id).execute()
                if res_data.data:
                    user_id = res_data.data[0]['user_id']

            # Notify student of escalation
            if user_id:
                _notify(
                    user_id=user_id,
                    notif_type='SEATSURE_ESCALATED',
                    title='Presence Verification Pending',
                    message=(
                        'You did not confirm your presence in time. '
                        'A staff member will verify your occupancy shortly.'
                    ),
                    reservation_id=res_id,
                )

            # Notify admin
            admin_id = _get_admin_user_id()
            if admin_id:
                space_name = _lookup_space_name_from_reservation(res_id) if res_id else 'Unknown'
                seat_label = _lookup_seat_label_from_session(occ_id)
                window_label = '1 minute' if DEMO_MODE else '5 minutes'
                _notify(
                    user_id=admin_id,
                    notif_type='ADMIN_VERIFICATION_NEEDED',
                    title='SeatSure — Occupancy Verification Required 🚨',
                    message=(
                        f"Student did not confirm occupancy for seat {seat_label} in {space_name}. "
                        f"Please verify. Reservation: {res_id}. "
                        f"You have {window_label} to respond."
                    ),
                    reservation_id=res_id,
                    expires_at=admin_deadline,
                    action_url='/admin/check-in',
                )
            print(f"[scheduler] Escalated task {t['id'][:8]} to admin, deadline {admin_deadline}")

        # ── 4. Admin deadline expired → release seat ──────────────────────── #
        expired_admin = (
            supabase.table('admin_verification_tasks')
            .select('id, occupancy_session_id, occupancy_session:occupancy_sessions(reservation_id)')
            .eq('status', 'PENDING')
            .lt('deadline', now_iso)
            .execute()
        )
        for a in expired_admin.data:
            supabase.table('admin_verification_tasks').update({'status': 'EXPIRED'}).eq('id', a['id']).execute()

            occ_id = a['occupancy_session_id']
            res_id = (a.get('occupancy_session') or {}).get('reservation_id')

            supabase.table('occupancy_sessions').update({'status': 'RELEASED'}).eq('id', occ_id).execute()
            if res_id:
                supabase.table('reservations').update({'status': 'COMPLETED'}).eq('id', res_id).execute()
                res_data = supabase.table('reservations').select('user_id').eq('id', res_id).execute()
                if res_data.data:
                    _notify(
                        user_id=res_data.data[0]['user_id'],
                        notif_type='RESERVATION_RELEASED',
                        title='Seat Released',
                        message=(
                            'Your seat was released because your presence could not be '
                            'verified by staff in time.'
                        ),
                        reservation_id=res_id,
                    )
            print(f"[scheduler] Admin deadline expired for task {a['id'][:8]} — seat released")

    except Exception as e:
        import traceback
        print(f"[scheduler/sweep] Error: {e}")
        traceback.print_exc()


# --------------------------------------------------------------------------- #
#  Helpers                                                                     #
# --------------------------------------------------------------------------- #
def _parse_dt(value):
    if not value:
        raise ValueError("Empty timestamp")
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def _lookup_space_name(space_id):
    try:
        r = supabase.table('spaces').select('name').eq('id', space_id).execute()
        if r.data:
            return r.data[0]['name']
    except Exception:
        pass
    return space_id


def _lookup_space_name_from_reservation(res_id):
    try:
        r = supabase.table('reservations').select('space_id').eq('id', res_id).execute()
        if r.data:
            return _lookup_space_name(r.data[0]['space_id'])
    except Exception:
        pass
    return 'Unknown'


def _lookup_seat_label_from_session(occ_id):
    try:
        r = supabase.table('occupancy_sessions').select('seat_id').eq('id', occ_id).execute()
        if r.data:
            seat_res = supabase.table('seats').select('label').eq('id', r.data[0]['seat_id']).execute()
            if seat_res.data:
                return seat_res.data[0]['label']
    except Exception:
        pass
    return 'Unknown'


# --------------------------------------------------------------------------- #
#  Entry point                                                                 #
# --------------------------------------------------------------------------- #
def start_scheduler():
    mode = 'DEMO ⚡' if DEMO_MODE else 'PRODUCTION 🟢'
    print(f"[scheduler] Starting SeatSure worker — Mode: {mode}")
    print(f"[scheduler] Student window: {STUDENT_WINDOW_SECS}s | Admin window: {ADMIN_WINDOW_SECS}s")
    schedule.every(10).seconds.do(sweep_deadlines)
    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == '__main__':
    start_scheduler()
