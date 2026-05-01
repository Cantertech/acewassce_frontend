import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODc3NzMsImV4cCI6MjA5Mjg2Mzc3M30.8RtK5AW_uo4Gzm38jTzjcTq9ZCE1f60zVmvTEzhHmPk"
supabase = create_client(url, key)

res = supabase.table("theory_submissions").select("attempt_id").execute()
attempts = [r['attempt_id'] for r in res.data]
from collections import Counter
counts = Counter(attempts)

print("--- [Theory Submissions Counts per Attempt] ---")
for att, count in counts.items():
    print(f"Attempt: {att} | Count: {count}")

print("\n--- [Checking Current Attempt ID] ---")
target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
if target in counts:
    print(f"MATCH FOUND: {target} has {counts[target]} rows")
else:
    print(f"NO MATCH for {target} in theory_submissions")

# Check if it's in exam_attempts at least
res_att = supabase.table("exam_attempts").select("id").eq("id", target).execute()
if res_att.data:
    print(f"CONFIRMED: {target} EXISTS in exam_attempts")
else:
    print(f"WARNING: {target} DOES NOT EXIST in exam_attempts")
