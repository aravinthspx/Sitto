from datetime import datetime, timezone

def get_dashboard_data(supabase):
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Fetch all spaces that have seats
    res_spaces = supabase.table('spaces').select('id, name, type, floor_id, floors(name, building_id, buildings(name))').execute()
    res_seats = supabase.table('seats').select('id, space_id, label').execute()
    
    seats_data = res_seats.data
    spaces_data = res_spaces.data
    
    # Group seats by space_id
    seats_by_space = {}
    seat_map = {}
    for s in seats_data:
        seats_by_space.setdefault(s['space_id'], []).append(s)
        seat_map[s['id']] = s
        
    valid_spaces = [sp for sp in spaces_data if sp['id'] in seats_by_space]
    
    # 2. Fetch active reservations (to calculate Reserved, Occupied, Unverified)
    # A reservation is active if status in (RESERVED, CHECKED_IN)
    res_reservations = supabase.table('reservations').select('*').in_('status', ['RESERVED', 'CHECKED_IN']).execute()
    active_reservations = res_reservations.data
    
    # Filter reservations where start_time <= now <= end_time
    # Actually, a reserved seat blocks the seat entirely. Let's just use all active reservations
    
    # 3. Fetch active SeatSure tasks
    res_tasks = supabase.table('seatsure_tasks').select('*').eq('status', 'PENDING').execute()
    pending_tasks = res_tasks.data
    pending_occ_ids = {t['occupancy_session_id'] for t in pending_tasks}
    
    # 4. Fetch active Occupancy Sessions for these reservations
    # Actually we can just query occupancy_sessions with status=OCCUPIED
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
            # Find if this seat has an active reservation
            seat_res = [r for r in active_reservations if r['seat_id'] == seat['id']]
            
            # Usually one active reservation per seat
            if seat_res:
                r = seat_res[0]
                if r['status'] == 'RESERVED':
                    room_res += 1
                elif r['status'] == 'CHECKED_IN':
                    # Check if there is an active occupancy session
                    occ = occ_by_res.get(r['id'])
                    if occ:
                        if occ['id'] in pending_occ_ids:
                            room_unv += 1
                        else:
                            room_occ += 1
                    else:
                        room_res += 1 # Or some fallback
            
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
    
if __name__ == '__main__':
    import os, sys
    sys.path.insert(0, 'a:/techhorizon frontend/backend')
    os.chdir('a:/techhorizon frontend/backend')
    from dotenv import load_dotenv
    load_dotenv('.env')
    from app.database.connection import supabase
    print(get_dashboard_data(supabase))
