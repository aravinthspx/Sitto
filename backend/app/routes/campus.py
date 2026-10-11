from flask import Blueprint, jsonify, request
from app.database.connection import supabase

campus_bp = Blueprint('campus', __name__, url_prefix='/api')

@campus_bp.route('/buildings', methods=['GET'])
def get_buildings():
    try:
        include_all = request.args.get('include_all')
        
        if include_all == '1':
            res = supabase.table('buildings').select('*').execute()
            buildings = res.data
        else:
            valid_types = ['Lab', 'Laboratory', 'Library', 'lab', 'laboratory', 'library', 'LAB', 'LIBRARY']
            res = supabase.table('buildings').select('*, floors!inner(spaces!inner(type))').in_('floors.spaces.type', valid_types).execute()
            
            # Clean up nested floors before returning
            buildings = res.data
            for b in buildings:
                if 'floors' in b:
                    del b['floors']
                    
        return jsonify(buildings), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@campus_bp.route('/floors', methods=['GET'])
def get_floors():
    building_id = request.args.get('building_id')
    try:
        include_all = request.args.get('include_all')
        
        if include_all == '1':
            query = supabase.table('floors').select('*, buildingId:building_id')
        else:
            # Inner join on spaces to ensure only floors with valid spaces are returned
            valid_types = ['Lab', 'Laboratory', 'Library', 'lab', 'laboratory', 'library', 'LAB', 'LIBRARY']
            query = supabase.table('floors').select('*, buildingId:building_id, spaces!inner(type)').in_('spaces.type', valid_types)
            
        if building_id:
            query = query.eq('building_id', building_id)
            
        res = query.execute()
        
        # Clean up nested spaces before returning
        floors = res.data
        if include_all != '1':
            for f in floors:
                if 'spaces' in f:
                    del f['spaces']
                    
        return jsonify(floors), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@campus_bp.route('/spaces', methods=['GET'])
def get_spaces():
    floor_id = request.args.get('floor_id')
    try:
        query = supabase.table('spaces').select('*, floorId:floor_id, seats(count)')
        
        # For students, only show Labs and Libraries
        valid_types = ['Lab', 'Laboratory', 'Library', 'lab', 'laboratory', 'library', 'LAB', 'LIBRARY']
        query = query.in_('type', valid_types)
        
        if floor_id:
            query = query.eq('floor_id', floor_id)
        res = query.execute()
        
        # Add configured_seats attribute and format properly
        spaces = []
        for s in res.data:
            configured_seats = 0
            if s.get('seats') and len(s['seats']) > 0:
                configured_seats = s['seats'][0]['count']
            s['configured_seats'] = configured_seats
            del s['seats']  # Don't leak the raw count array
            spaces.append(s)
            
        return jsonify(spaces), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@campus_bp.route('/seats', methods=['GET'])
def get_seats():
    space_id = request.args.get('space_id')
    start = request.args.get('start')
    end = request.args.get('end')
    
    if not space_id:
        return jsonify({"message": "space_id required"}), 400
        
    try:
        # Get space details
        space_res = supabase.table('spaces').select('*').eq('id', space_id).execute()
        if not space_res.data:
            return jsonify({"message": "Space not found"}), 404
        space = space_res.data[0]
        
        space_type = space.get('type', '')
        valid_types = ['Lab', 'Laboratory', 'Library', 'lab', 'laboratory', 'library', 'LAB', 'LIBRARY']
        if space_type not in valid_types:
            return jsonify({"message": "Seat view is only allowed for labs and libraries"}), 403
        
        # Get all seats in space
        seats_res = supabase.table('seats').select('*').eq('space_id', space_id).execute()
        seats_list = seats_res.data
        
        # Determine availability for the given time window
        # For each seat, check if there's an overlapping active reservation
        
        occupied_seat_ids = set()
        if start and end:
            # We want reservations where (res.start_time < end) AND (res.end_time > start)
            res_query = supabase.table('reservations')\
                .select('seat_id, status')\
                .eq('space_id', space_id)\
                .in_('status', ['RESERVED', 'CHECKED_IN'])\
                .lt('start_time', end)\
                .gt('end_time', start)\
                .execute()
                
            for r in res_query.data:
                occupied_seat_ids.add(r['seat_id'])
                
        # Format response to match API_CONTRACT.md
        seats_output = []
        for s in seats_list:
            status = "AVAILABLE"
            if s['id'] in occupied_seat_ids:
                status = "RESERVED" # Or check_in, but RESERVED means unavailable
            seats_output.append({
                "id": s['label'], # Frontend expects seat label as ID (e.g. S01)
                "db_id": s['id'], # Keep uuid for booking
                "status": status
            })
            
        return jsonify({
            "spaceId": space['id'],
            "spaceName": space['name'],
            "floor": space['floor_id'],
            "totalSeats": space['capacity'],
            "seats": seats_output
        }), 200
        
    except Exception as e:
        return jsonify({"message": str(e)}), 500
