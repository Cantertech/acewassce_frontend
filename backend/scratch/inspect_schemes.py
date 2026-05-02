from supabase import create_client
import os

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

exam_id = "fd9c561c-f0f1-411d-aee7-75f2656f4904"
res = supabase.table("questions").select("question_number, marking_scheme").eq("exam_id", exam_id).eq("is_mcq", False).execute()

for d in res.data:
    print(f"--- [Q{d['question_number']}] ---")
    print(d['marking_scheme'][:2000])
    print("-" * 50)
