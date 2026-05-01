import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
print(f"--- [REPAIRING ATTEMPT] Attempt: {target} ---")

# 1. List images in storage bucket for this attempt
bucket = "wassce_workings"
prefix = f"{target}/general/"
res = supabase.storage.from_(bucket).list(prefix)

if not res:
    print("No images found in bucket. Did you upload them?")
else:
    print(f"Found {len(res)} images in bucket.")
    for file in res:
        name = file['name']
        if name == '.emptyFolderPlaceholder': continue
        
        image_url = f"{url}/storage/v1/object/public/{bucket}/{prefix}{name}"
        
        # Insert back as a general submission
        supabase.table("theory_submissions").insert({
            "attempt_id": target,
            "image_url": image_url,
            "question_number": None, # AI will fill this
            "marks_attained": None,
            "feedback": None
        }).execute()
        print(f"Re-seeded image: {name}")

print("Repair complete. Now click 'Trigger Forensic AI Scan' again.")
