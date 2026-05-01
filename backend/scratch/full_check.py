import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
print(f"--- [FULL DEEP CHECK] Attempt: {target} ---")
res = supabase.table("theory_submissions").select("*").eq("attempt_id", target).execute()
print(f"Total Rows: {len(res.data)}")
for row in res.data:
    print(f"ID: {row['id']} | Q: {row['question_number']} | Mark: {row['marks_attained']} | Feedback Length: {len(row.get('feedback') or '')}")

res_att = supabase.table("exam_attempts").select("theory_score, total_score").eq("id", target).single().execute()
print(f"Exam Attempt Score: {res_att.data.get('theory_score')} | Total: {res_att.data.get('total_score')}")
