import os
from supabase import create_client

url = "https://ytvtbogfuccvfqknqeou.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
supabase = create_client(url, key)

target = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866"
print(f"--- [STORAGE CHECK] Checking for folder: {target} ---")
try:
    res = supabase.storage.from_("wassce_workings").list(target)
    if res:
        print(f"FOUND {len(res)} items in storage for this attempt!")
        for item in res:
            print(f" - {item['name']}")
    else:
        print("NO ITEMS found in storage for this attempt.")
except Exception as e:
    print(f"Storage Error: {e}")
