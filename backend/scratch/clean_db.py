import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
print(f"--- [CLEANING DATABASE] Attempt: {target} ---")

# 1. Delete existing theory submissions to clear the "None" deadlock
res = supabase.table("theory_submissions").delete().eq("attempt_id", target).execute()
print(f"Deleted {len(res.data) if res.data else 0} stale submissions.")

# 2. Reset attempt status so UI shows the scan button clearly
supabase.table("exam_attempts").update({"status": "submitted", "theory_score": 0}).eq("id", target).execute()
print("Attempt reset to 'submitted'.")
print("Done. Now click 'Trigger Forensic AI Scan' in the dashboard.")
