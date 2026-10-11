import os, sys, uuid
sys.path.insert(0, 'a:/techhorizon frontend/backend')
os.chdir('a:/techhorizon frontend/backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app.database.connection import supabase

try:
    user_res = supabase.table('profiles').select('id').limit(1).execute()
    user_id = user_res.data[0]['id']
    
    task_res = supabase.table('seatsure_tasks').select('id').limit(1).execute()
    task_id = task_res.data[0]['id']
    
    # Try inserting with seatsure_task_id
    payload = {
        'user_id': user_id,
        'type': 'SEATSURE_CHECK',
        'title': 'Test with Task ID',
        'message': 'Test',
        'seatsure_task_id': task_id,
        'is_read': False
    }
    
    res = supabase.table('notifications').insert(payload).execute()
    if res.data:
        notif = res.data[0]
        print(f"Inserted Notification ID: {notif['id']}")
        print(f"seatsure_task_id saved as: {notif.get('seatsure_task_id')}")
        
        # Clean up
        supabase.table('notifications').delete().eq('id', notif['id']).execute()
    else:
        print("Failed to insert")
        
except Exception as e:
    print(f"Error checking notifications: {e}")
