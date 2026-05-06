import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

print("--- Inspecting theory_submissions ---")
try:
    res = supabase.table("theory_submissions").select("*").limit(1).execute()
    if res.data:
        print("Columns in 'theory_submissions':", res.data[0].keys())
    else:
        print("No records found in theory_submissions.")
except Exception as e:
    print("Error querying theory_submissions:", e)
