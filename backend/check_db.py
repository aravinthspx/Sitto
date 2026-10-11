import os
import sys

# Load env manually
from dotenv import load_dotenv
load_dotenv('a:\\techhorizon frontend\\backend\\.env')

from app.database.connection import supabase

try:
    res = supabase.table('profiles').select('count', count='exact').execute()
    print("TABLES EXIST")
except Exception as e:
    print(f"ERROR: {e}")
