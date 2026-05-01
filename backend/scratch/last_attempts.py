import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

res = supabase.table("exam_attempts").select("id, status, start_time, total_score").order("start_time", desc=True).limit(10).execute()
print("--- [Last 10 Exam Attempts] ---")
for att in res.data:
    print(f"ID: {att['id']} | Status: {att['status']} | Start: {att['start_time']} | Score: {att['total_score']}")
