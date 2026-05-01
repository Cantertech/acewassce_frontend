import os
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
    "Prefer": "return=minimal"
}

def upload_mcq_keys():
    file_path = "sample_mcq_keys_output.json"
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return
        
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    solutions = data.get('solutions', [])
    
    # We fetch ALL questions to find the ones for Core 1 by extracting the final digits of question_identifier
    q_url = f"{SUPABASE_URL}/rest/v1/questions"
    # We need to filter for CORE 1 (MCQ). They have is_mcq = true
    res = requests.get(q_url, headers=headers, params={"select": "id,question_identifier", "is_mcq": "eq.true"})
    
    q_map = {}
    for item in res.json():
        ident = item.get('question_identifier', '')
        # Extract the trailing numbers (e.g., '2025_MATH_33' -> 33)
        match = re.search(r"(\d+)$", ident)
        if match:
            num = int(match.group(1))
            q_map[num] = item['id']
    
    s_url = f"{SUPABASE_URL}/rest/v1/grading_schemes"
    
    success_count = 0
    for sol in solutions:
        q_num = int(sol['question_number'])
        correct_option = sol['correct_option']
        
        actual_q_id = q_map.get(q_num)
        
        if actual_q_id:
            payload = {
                "question_id": actual_q_id,
                "correct_option": correct_option,
                "total_marks": 1, 
            }
            requests.post(s_url, headers=headers, json=payload)
            success_count += 1
            print(f"Uploaded Key for Q{q_num}: {correct_option}")
        else:
            print(f"Warning: Question sequence Q{q_num} not found in DB! (No MCQ question with this number was extracted)")

    print(f"\n✅ Uploaded {success_count} MCQ Answers successfully to grading_schemes!")

if __name__ == "__main__":
    upload_mcq_keys()
