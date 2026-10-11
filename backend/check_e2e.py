import os
import time
import requests
from dotenv import load_dotenv
load_dotenv('a:\\techhorizon frontend\\backend\\.env')
from app.database.connection import supabase

API_URL = "http://127.0.0.1:5000/api"

def create_test_user():
    email = "test@student.com"
    password = "password123"
    try:
        # Try login first
        res = supabase.auth.sign_in_with_password({"email": email, "password": password})
        return res.session.access_token
    except Exception:
        # Create user
        try:
            res = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            time.sleep(1)
            # Insert profile
            supabase.table('profiles').insert({"id": res.user.id, "name": "Test Student", "role": "student"}).execute()
            
            # Login
            login_res = supabase.auth.sign_in_with_password({"email": email, "password": password})
            return login_res.session.access_token
        except Exception as e:
            print("Failed to create user:", e)
            return None

def run_e2e():
    print("1. Creating/Logging in Test User...")
    token = create_test_user()
    if not token:
        print("FAIL: Could not authenticate")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    
    print("2. GET /auth/me")
    r = requests.get(f"{API_URL}/auth/me", headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print("3. GET /buildings")
    r = requests.get(f"{API_URL}/buildings", headers=headers)
    print("  ", r.status_code, r.text[:100])
    buildings = r.json()
    bld_id = buildings[0]['id'] if buildings else None
    
    print("4. GET /floors")
    r = requests.get(f"{API_URL}/floors?building_id={bld_id}", headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print("5. GET /spaces")
    r = requests.get(f"{API_URL}/spaces?floor_id=FLO2", headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print("6. GET /seats (LAB001)")
    r = requests.get(f"{API_URL}/seats?space_id=LAB001&start=2024-01-01T10:00:00Z&end=2024-01-01T11:00:00Z", headers=headers)
    print("  ", r.status_code, r.text[:100])
    seats_data = r.json()
    
    if r.status_code != 200 or not seats_data.get('seats'):
        print("FAIL: No seats found")
        return
        
    print("7. POST /reservations")
    res_payload = {
        "space_id": "LAB001",
        "seat_id": "S01",
        "start": "2026-10-10T10:00:00Z",
        "end": "2026-10-10T11:00:00Z"
    }
    r = requests.post(f"{API_URL}/reservations", json=res_payload, headers=headers)
    print("  ", r.status_code, r.text[:100])
    if r.status_code != 201:
        # Might be already booked, try S02
        res_payload['seat_id'] = 'S02'
        r = requests.post(f"{API_URL}/reservations", json=res_payload, headers=headers)
        print("  Retry S02:", r.status_code, r.text[:100])
        if r.status_code != 201:
            print("FAIL: Could not create reservation")
            return
            
    res_id = r.json()['id']
    qr_token = r.json()['qrToken']
    
    print("8. GET /reservations/me")
    r = requests.get(f"{API_URL}/reservations/me", headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print(f"9. POST /reservations/{res_id}/checkin")
    r = requests.post(f"{API_URL}/reservations/{res_id}/checkin", json={"qr_token": qr_token}, headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print(f"10. POST /reservations/{res_id}/checkout")
    r = requests.post(f"{API_URL}/reservations/{res_id}/checkout", headers=headers)
    print("  ", r.status_code, r.text[:100])
    
    print("E2E INTEGRATION SUCCESSFUL!")

if __name__ == "__main__":
    run_e2e()
