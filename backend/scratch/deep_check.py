import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
print(f"--- [DEEP CHECK] Attempt: {target} ---")
res = supabase.table("theory_submissions").select("*").eq("attempt_id", target).execute()
print(f"Rows in theory_submissions: {len(res.data)}")
for row in res.data:
    print(f" - Row ID: {row['id']} | Q: {row['question_number']} | URL: {row['image_url']}")

res_att = supabase.table("exam_attempts").select("*").eq("id", target).execute()
if res_att.data:
    print(f"SUCCESS: Attempt FOUND in exam_attempts: {res_att.data[0]['id']}")
else:
    print("FAILURE: Attempt NOT FOUND in exam_attempts.")
