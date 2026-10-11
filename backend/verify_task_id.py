import os, sys
sys.path.insert(0, 'a:/techhorizon frontend/backend')
os.chdir('a:/techhorizon frontend/backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app.database.connection import supabase

try:
    res = supabase.table('notifications').select('*').eq('type', 'SEATSURE_CHECK').order('created_at', desc=True).limit(1).execute()
    if res.data:
        notif = res.data[0]
        task_id = notif.get('seatsure_task_id')
        print(f"Latest SeatSure Notification ID: {notif['id']}")
        print(f"seatsure_task_id: {task_id}")
        if task_id:
            print("SUCCESS: seatsure_task_id is populated and valid!")
        else:
            print("WARNING: seatsure_task_id is null/None.")
    else:
        print("No SeatSure notifications found yet.")
except Exception as e:
    print(f"Error checking notifications: {e}")
