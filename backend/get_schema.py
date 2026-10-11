import os, sys
sys.path.insert(0, 'a:/techhorizon frontend/backend')
os.chdir('a:/techhorizon frontend/backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app.database.connection import supabase

try:
    print("Reservations active:")
    res = supabase.table('reservations').select('*').in_('status', ['RESERVED', 'CHECKED_IN']).execute()
    print("Count:", len(res.data))
    
    print("Occupancy active:")
    res = supabase.table('occupancy_sessions').select('*').eq('status', 'OCCUPIED').execute()
    print("Count:", len(res.data))
    
    print("Tasks pending:")
    res = supabase.table('seatsure_tasks').select('*').eq('status', 'PENDING').execute()
    print("Count:", len(res.data))
except Exception as e:
    print(e)
