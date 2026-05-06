import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path='.env')
url = os.environ.get('SUPABASE_URL')
anon_key = os.environ.get('SUPABASE_KEY')
service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

# 1. Test Anon Key Storage Upload
print("--- Testing Anon Key Storage Upload ---")
try:
    db_anon = create_client(url, anon_key)
    file_name = f"test_anon_{uuid.uuid4()}.jpg"
    test_content = b"test content"
    
    res = db_anon.storage.from_("wassce_workings").upload(
        path=file_name,
        file=test_content,
        file_options={"content-type": "image/jpeg"}
    )
    print("Success! Uploaded with Anon key:", res)
    # Cleanup
    db_anon.storage.from_("wassce_workings").remove([file_name])
except Exception as e:
    print("Failed to upload with Anon key:", e)

# 2. Test Service Role Key Storage Upload
print("\n--- Testing Service Role Key Storage Upload ---")
try:
    db_service = create_client(url, service_key)
    file_name = f"test_service_{uuid.uuid4()}.jpg"
    test_content = b"test content"
    
    res = db_service.storage.from_("wassce_workings").upload(
        path=file_name,
        file=test_content,
        file_options={"content-type": "image/jpeg"}
    )
    print("Success! Uploaded with Service key:", res)
    # Cleanup
    db_service.storage.from_("wassce_workings").remove([file_name])
except Exception as e:
    print("Failed to upload with Service key:", e)
