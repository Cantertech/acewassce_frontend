import os, requests, json, re
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

# Fetch all 50 MCQs for 2025
r = requests.get(url, headers=h, params={
    'exam_id': f'eq.{exam_2025}', 
    'is_mcq': 'eq.true', 
    'select': 'id,question_number,marking_scheme'
})

if r.status_code != 200:
    print("Failed to fetch questions:", r.text)
    exit()

questions = r.json()
# Sort by question_number
questions.sort(key=lambda x: x['question_number'])

print("--- Current Database Answer Keys ---")
for q in questions:
    q_num = q['question_number']
    marking = q.get('marking_scheme', '') or ''
    
    # Try to extract Correct Option (e.g., "Correct Option: B")
    opt_match = re.search(r'Correct Option:\s*([A-D])', marking, re.IGNORECASE)
    opt = opt_match.group(1).upper() if opt_match else 'UNKNOWN'
    
    print(f"Q{q_num}: {opt}")
