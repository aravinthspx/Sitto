import requests
import sys, os

sys.path.insert(0, 'a:/techhorizon frontend/backend')
os.chdir('a:/techhorizon frontend/backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app.database.connection import supabase

try:
    user_res = supabase.table('profiles').select('id').limit(1).execute()
    if user_res.data:
        real_user_id = user_res.data[0]['id']
        print(f"Using real user ID: {real_user_id}")
        
        res = supabase.table('notifications').insert({
            'user_id': real_user_id,
            'type': 'TEST',
            'title': 'Test Notification',
            'message': 'This is a test notification from the migration verification.',
            'is_read': False
        }).execute()
        
        if res.data:
            print(f"Test notification created: {res.data[0]['id']}")
            supabase.table('notifications').delete().eq('id', res.data[0]['id']).execute()
            print('Test notification cleaned up')
        else:
            print('Insert returned no data')
    else:
        print('No users found in database')
except Exception as e:
    print(f'Test insert failed: {e}')
