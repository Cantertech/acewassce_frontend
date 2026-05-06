import os
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path='.env')
url = os.environ.get('SUPABASE_URL')
# Use the anon key, exactly like database.py does!
key = os.environ.get('SUPABASE_KEY')
print(f"URL: {url}")
print(f"Key exists: {key is not None}")

db = create_client(url, key)

print("--- Testing Insert with Anon Key ---")
try:
    attempt_id = "9907bb36-7238-4dc7-b2f8-b1cb6a294de5"
    
    theory_data = {
        "attempt_id": attempt_id,
        "question_number": None,
        "image_url": "https://example.com/test.jpg",
        "is_general": True,
        "feedback": "test_tag"
    }
    res = db.table("theory_submissions").insert(theory_data).execute()
    print("Success! Inserted row with anon key:", res.data)
except Exception as e:
    print("Failed to insert with anon key:", e)
