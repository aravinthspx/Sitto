from datetime import datetime, timezone

def _get_dashboard_data(supabase):
    now_iso = datetime.now(timezone.utc).isoformat()
    res_spaces = supabase.table('spaces').select('id, name, type, floor_id, floors(name, building_id, buildings(name))').execute()
    res_seats = supabase.table('seats').select('id, space_id, label').execute()
    
    seats_data = res_seats.data
    spaces_data = res_spaces.data
    
    seats_by_space = {}
    seat_map = {}
    for s in seats_data:
        seats_by_space.setdefault(s['space_id'], []).append(s)
        seat_map[s['id']] = s
        
    valid_spaces = [sp for sp in spaces_data if sp['id'] in seats_by_space]
    
    res_reservations = supabase.table('reservations').select('*').in_('status', ['RESERVED', 'CHECKED_IN']).execute()
    active_reservations = res_reservations.data
    
    res_tasks = supabase.table('seatsure_tasks').select('*').eq('status', 'PENDING').execute()
    pending_tasks = res_tasks.data
    pending_occ_ids = {t['occupancy_session_id'] for t in pending_tasks}
    
    res_occ = supabase.table('occupancy_sessions').select('*').eq('status', 'OCCUPIED').execute()
    active_occ = res_occ.data
    
    occ_by_res = {o['reservation_id']: o for o in active_occ}
    
    total_bookable = len(seats_data)
    total_occupied = 0
    total_reserved = 0
    total_unverified = 0
    
    rooms_output = []
    
    for sp in valid_spaces:
        room_seats = seats_by_space[sp['id']]
        room_total = len(room_seats)
        room_occ = 0
        room_res = 0
        room_unv = 0
        
        for seat in room_seats:
            seat_res = [r for r in active_reservations if r['seat_id'] == seat['id']]
            if seat_res:
                r = seat_res[0]
                if r['status'] == 'RESERVED':
                    room_res += 1
                elif r['status'] == 'CHECKED_IN':
                    occ = occ_by_res.get(r['id'])
                    if occ:
                        if occ['id'] in pending_occ_ids:
                            room_unv += 1
                        else:
                            room_occ += 1
                    else:
                        room_res += 1
            
        room_avail = room_total - (room_occ + room_res + room_unv)
        total_occupied += room_occ
        total_reserved += room_res
        total_unverified += room_unv
        
        rooms_output.append({
            "id": sp['id'],
            "name": sp['name'],
            "building": sp['floors']['buildings']['name'] if sp.get('floors') and sp['floors'].get('buildings') else 'Unknown',
            "floor": sp['floors']['name'] if sp.get('floors') else 'Unknown',
            "total_seats": room_total,
            "occupied": room_occ,
            "reserved": room_res,
            "unverified": room_unv,
            "available": room_avail,
            "occupancy_percent": round((room_occ / room_total) * 100) if room_total > 0 else 0
        })
    
    total_available = total_bookable - (total_occupied + total_reserved + total_unverified)
    
    return {
        "summary": {
            "total": total_bookable,
            "occupied": total_occupied,
            "reserved": total_reserved,
            "unverified": total_unverified,
            "available": total_available
        },
        "rooms": rooms_output
    }

@admin_bp.route('/dashboard', methods=['GET'])
def admin_dashboard():
    try:
        data = _get_dashboard_data(supabase)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

def _get_room_details(supabase, space_id):
    res_space = supabase.table('spaces').select('id, name, type, floors(name, buildings(name))').eq('id', space_id).execute()
    if not res_space.data: return None
    space = res_space.data[0]
    
    res_seats = supabase.table('seats').select('id, label').eq('space_id', space_id).execute()
    seats = res_seats.data
    seat_ids = [s['id'] for s in seats]
    
    res_reservations = supabase.table('reservations').select('id, seat_id, status, user_id, start_time, end_time, check_in_deadline').in_('status', ['RESERVED', 'CHECKED_IN']).in_('seat_id', seat_ids).execute()
    active_reservations = res_reservations.data
    
    res_tasks = supabase.table('seatsure_tasks').select('*').eq('status', 'PENDING').execute()
    pending_tasks = res_tasks.data
    pending_task_by_occ = {t['occupancy_session_id']: t for t in pending_tasks}
    
    res_occ = supabase.table('occupancy_sessions').select('*').eq('status', 'OCCUPIED').execute()
    occ_by_res = {o['reservation_id']: o for o in res_occ.data}
    
    room_occ = 0
    room_res = 0
    room_unv = 0
    
    seats_output = []
    
    for seat in seats:
        status = 'AVAILABLE'
        res_info = None
        occ_info = None
        task_info = None
        
        seat_res = [r for r in active_reservations if r['seat_id'] == seat['id']]
        if seat_res:
            r = seat_res[0]
            res_info = r
            if r['status'] == 'RESERVED':
                status = 'RESERVED'
                room_res += 1
            elif r['status'] == 'CHECKED_IN':
                occ = occ_by_res.get(r['id'])
                if occ:
                    occ_info = occ
                    task = pending_task_by_occ.get(occ['id'])
                    if task:
                        status = 'UNVERIFIED'
                        task_info = task
                        room_unv += 1
                    else:
                        status = 'OCCUPIED'
                        room_occ += 1
                else:
                    status = 'RESERVED'
                    room_res += 1
                    
        seats_output.append({
            "id": seat['id'],
            "label": seat['label'],
            "status": status,
            "reservation": res_info,
            "occupancy": occ_info,
            "task": task_info
        })
        
    room_total = len(seats)
    room_avail = room_total - (room_occ + room_res + room_unv)
    
    return {
        "id": space['id'],
        "name": space['name'],
        "building": space['floors']['buildings']['name'] if space.get('floors') and space['floors'].get('buildings') else 'Unknown',
        "floor": space['floors']['name'] if space.get('floors') else 'Unknown',
        "total_seats": room_total,
        "occupied": room_occ,
        "reserved": room_res,
        "unverified": room_unv,
        "available": room_avail,
        "occupancy_percent": round((room_occ / room_total) * 100) if room_total > 0 else 0,
        "seats": seats_output
    }

@admin_bp.route('/rooms/<space_id>', methods=['GET'])
def admin_room_details(space_id):
    try:
        data = _get_room_details(supabase, space_id)
        if not data:
            return jsonify({"message": "Room not found"}), 404
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
