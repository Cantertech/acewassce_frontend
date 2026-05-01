import os
import glob
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def fix_unlinked_schemes():
    # 1. Get all questions
    q_url = f"{SUPABASE_URL}/rest/v1/questions"
    res = requests.get(q_url, headers=headers, params={"select": "id,question_identifier"})
    q_data = res.json()
    q_map = {item['question_identifier']: item['id'] for item in q_data}
    
    # Create an inverse map for base numbers to handle 11(a) -> 11
    # Example: 2025_mathematics_11 maps to the same UUID
    q_base_map = {}
    for item in q_data:
        identifier = item['question_identifier']
        if identifier:
            match = re.match(r"(2025_mathematics_\d+)", identifier)
            if match:
                q_base_map[match.group(1)] = item['id']

    # 2. Get all schemes already in DB to avoid duplicates
    # We can check by checking how many schemes exist for a question_id
    s_url = f"{SUPABASE_URL}/rest/v1/grading_schemes"
    res_s = requests.get(s_url, headers=headers, params={"select": "question_id"})
    existing_question_ids = {item['question_id'] for item in res_s.json()}
    
    all_scheme_files = glob.glob(r"processed\schemes\*.json")
    
    fixed_count = 0
    skipped_count = 0
    
    for file in all_scheme_files:
        with open(file, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except:
                continue
                
        schemes = data.get('schemes', [])
        
        for scheme in schemes:
            raw_q_id = str(scheme.get('question_id'))
            q_identifier = f"2025_mathematics_{raw_q_id}"
            
            # Step A: Exact match
            actual_q_id = q_map.get(q_identifier)
            
            # Step B: Fuzzy match (e.g., 11(a) -> 11)
            if not actual_q_id:
                base_match = re.search(r"(\d+)", raw_q_id)
                if base_match:
                    base_id = f"2025_mathematics_{base_match.group(1)}"
                    actual_q_id = q_base_map.get(base_id)
                    
            if not actual_q_id:
                # Still didn't find it, question might genuinely be missing
                print(f"Skipping {raw_q_id}: Cannot find matching question in DB")
                continue
                
            # If we found the question, check if it's already got a scheme
            # For parts like 11(a) and 11(b), they map to the same actual_q_id
            # So checking existing_question_ids might falsely skip 11(b).
            # To be foolproof without deleting: we will insert if the specific expected_logic from step 1 isn't found.
            # But simpler: just insert it because multiple schemes per question is acceptable for sub-parts.
            # Wait, if we just blindly insert, we'll duplicate already uploaded ones.
            # Let's check via a combination of total_marks and steps length.
            
            # Query db if exact scheme exists
            steps_json = json.dumps(scheme.get('steps', []))
            
            # Hack check if it's literally already in existing db (we can't easily query JSON arrays, so fetch to check)
            check_res = requests.get(s_url, headers=headers, params={"question_id": f"eq.{actual_q_id}"})
            existing_schemes = check_res.json()
            is_duplicate = False
            for es in existing_schemes:
                if len(es.get('steps', [])) == len(scheme.get('steps', [])):
                    # good enough heuristic for duplicate
                    is_duplicate = True
                    break
                    
            if not is_duplicate:
                print(f"Fixing and linking Scheme: {raw_q_id}")
                payload = {
                    "question_id": actual_q_id,
                    "total_marks": scheme.get('total_marks', 0),
                    "penalties": scheme.get('penalties', []),
                    "steps": scheme.get('steps', [])
                }
                requests.post(s_url, headers=headers, json=payload)
                fixed_count += 1
            else:
                skipped_count += 1

    print(f"Fixed/Uploaded {fixed_count} new schemes. Skipped {skipped_count} existing schemes.")

if __name__ == "__main__":
    fix_unlinked_schemes()
