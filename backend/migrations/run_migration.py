"""
Run the SeatSure database migration via Supabase Management API.
Usage: python run_migration.py
"""
import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

SUPABASE_URL = 'https://goooqndzkuwcaxkmysbm.supabase.co'
SERVICE_KEY = os.environ.get('SUPABASE_KEY', '')

# DDL statements to execute
MIGRATIONS = [
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reservation_id TEXT",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS seatsure_task_id UUID",
    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT",
    "ALTER TABLE seatsure_tasks ADD COLUMN IF NOT EXISTS response TEXT",
    "ALTER TABLE seatsure_tasks ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ",
    "ALTER TABLE admin_verification_tasks ADD COLUMN IF NOT EXISTS resolution TEXT",
    "ALTER TABLE admin_verification_tasks ADD COLUMN IF NOT EXISTS resolved_by UUID",
    "ALTER TABLE admin_verification_tasks ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ",
]

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
}


def run():
    """Try Supabase Management API /pg/query endpoint (available on paid plans).
    Falls back to printing instructions if the endpoint is unavailable."""
    endpoint = f"{SUPABASE_URL}/pg/query"
    ok = True
    for stmt in MIGRATIONS:
        resp = requests.post(endpoint, headers=headers, json={'query': stmt})
        if resp.status_code in (200, 201, 204):
            print(f"OK  : {stmt[:70]}")
        elif resp.status_code == 404:
            print("Management API /pg/query not available on this plan.")
            print("Please run the following SQL manually in Supabase SQL Editor:")
            print()
            for s in MIGRATIONS:
                print(s + ";")
            return False
        else:
            print(f"FAIL: {stmt[:70]}")
            print(f"      {resp.status_code} {resp.text[:200]}")
            ok = False
    return ok


if __name__ == "__main__":
    print("Running SeatSure migration 001...")
    success = run()
    if success:
        print("\nMigration complete.")
    else:
        print("\nMigration requires manual action — see above.")
    sys.exit(0 if success else 1)
