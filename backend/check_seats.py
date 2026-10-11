import os
import sys

from dotenv import load_dotenv
load_dotenv('a:\\techhorizon frontend\\backend\\.env')

from app.database.connection import supabase

try:
    res = supabase.table('spaces').select('*').execute()
    spaces = res.data
    print(f"Total spaces: {len(spaces)}")
    for s in spaces[:5]:
        print(f"Space: {s['id']} ({s['name']})")
        
    print("\n--- SEATS ---")
    res_seats = supabase.table('seats').select('*').execute()
    seats = res_seats.data
    print(f"Total seats: {len(seats)}")
    
    space_seat_counts = {}
    for seat in seats:
        space_id = seat['space_id']
        space_seat_counts[space_id] = space_seat_counts.get(space_id, 0) + 1
        
    for space_id, count in space_seat_counts.items():
        print(f"Space {space_id} has {count} seats")
        
except Exception as e:
    print(f"ERROR: {e}")
