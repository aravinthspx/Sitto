import requests
import sys, os

try:
    r = requests.get('http://localhost:5000/health', timeout=5)
    print(f'Health: {r.status_code} {r.json()}')
except Exception as e:
    print(f'Health request failed: {e}')

try:
    r2 = requests.get('http://localhost:5000/api/notifications', timeout=5)
    print(f'Notifications (no auth): {r2.status_code}')
except Exception as e:
    print(f'Notifications request failed: {e}')

sys.path.insert(0, 'a:/techhorizon frontend/backend')
os.chdir('a:/techhorizon frontend/backend')
from dotenv import load_dotenv
load_dotenv('.env')
from app.database.connection import supabase

try:
    res = supabase.table('notifications').insert({
        'user_id': '00000000-0000-0000-0000-000000000000',
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
except Exception as e:
    print(f'Test insert failed: {e}')
