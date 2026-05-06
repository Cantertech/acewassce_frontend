import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
db = create_client(url, key)

print("--- Inspecting Storage Buckets ---")
try:
    buckets = db.storage.list_buckets()
    print("Buckets found:")
    for b in buckets:
        print(f" - {b.name} (Public: {b.public})")
except Exception as e:
    print("Error listing buckets:", e)
