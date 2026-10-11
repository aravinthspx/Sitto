from datetime import datetime, timezone

def get_room_details(supabase, space_id):
    # Fetch space info
    res_space = supabase.table('spaces').select('id, name, type, floors(name, buildings(name))').eq('id', space_id).execute()
    if not res_space.data: return None
    space = res_space.data[0]
    
    # Fetch seats
    res_seats = supabase.table('seats').select('id, label').eq('space_id', space_id).execute()
    seats = res_seats.data
    seat_ids = [s['id'] for s in seats]
    
    # Fetch active reservations for these seats
    res_reservations = supabase.table('reservations').select('id, seat_id, status, user_id, start_time, end_time, check_in_deadline').in_('status', ['RESERVED', 'CHECKED_IN']).in_('seat_id', seat_ids).execute()
    active_reservations = res_reservations.data
    
    # Fetch pending seatsure tasks
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
    
if __name__ == '__main__':
    import os, sys
    sys.path.insert(0, 'a:/techhorizon frontend/backend')
    os.chdir('a:/techhorizon frontend/backend')
    from dotenv import load_dotenv
    load_dotenv('.env')
    from app.database.connection import supabase
    print(get_room_details(supabase, 'LAB001'))
