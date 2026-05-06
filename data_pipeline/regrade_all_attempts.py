import os, requests, json, re
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url_questions = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
url_attempts = os.environ.get('SUPABASE_URL') + '/rest/v1/exam_attempts'
url_responses = os.environ.get('SUPABASE_URL') + '/rest/v1/exam_responses'

h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

# Fetch all questions for the 2025 exam to map options and marking schemes
r_q = requests.get(url_questions, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'is_mcq': 'eq.true',
    'select': 'id,question_number,marking_scheme,options'
})

if r_q.status_code != 200:
    print("Failed to fetch questions:", r_q.text)
    exit()

questions_map = {q["id"]: q for q in r_q.json()}
print(f"Loaded {len(questions_map)} questions for 2025 exam.")

# Fetch all attempts for 2025 exam
r_att = requests.get(url_attempts, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'select': 'id,mcq_score,theory_score,status,student_id,start_time'
})

if r_att.status_code != 200:
    print("Failed to fetch attempts:", r_att.text)
    exit()

attempts = r_att.json()
print(f"Loaded {len(attempts)} attempts to analyze.")

def clean(text):
    return re.sub(r'[\$\s,\\]', '', str(text)).lower()

for att in attempts:
    attempt_id = att['id']
    old_score = att.get('mcq_score')
    status = att.get('status')
    
    # Fetch responses for this attempt
    r_resp = requests.get(url_responses, headers=h, params={
        'attempt_id': f'eq.{attempt_id}',
        'select': 'id,question_id,selected_option'
    })
    
    if r_resp.status_code != 200 or not r_resp.json():
        print(f"Attempt {attempt_id}: No responses found. Skipping.")
        continue
        
    responses = r_resp.json()
    score = 0
    wrong_numbers = []
    
    for resp in responses:
        q_id = resp["question_id"]
        student_choice = resp["selected_option"]
        q_data = questions_map.get(q_id, {})
        if not q_data:
            continue
            
        marking = q_data.get("marking_scheme") or ""
        q_num = q_data.get("question_number", "Unknown")
        options = q_data.get("options") or []
        
        is_correct = False
        correct_opt_letter = ""
        trimmed_marking = marking.strip().upper()
        
        if trimmed_marking in ["A", "B", "C", "D"]:
            correct_opt_letter = trimmed_marking
        else:
            match_co = re.search(r'(?i)Correct\s+Option:\s*([A-D])', marking)
            if match_co:
                correct_opt_letter = match_co.group(1).upper()
            else:
                match_eq = re.search(r"Equation:\s*([A-D])\s*=", marking)
                if match_eq:
                    correct_opt_letter = match_eq.group(1).upper()
                else:
                    match_first = re.search(r'(?i)\b([A-D])\b', marking[:20])
                    if match_first:
                        correct_opt_letter = match_first.group(1).upper()
                        
        correct_text = ""
        if correct_opt_letter:
            correct_text = next((opt["text"] for opt in options if opt["id"] == correct_opt_letter), "")
            
        if correct_text:
            if clean(student_choice) == clean(correct_text):
                is_correct = True
        if not is_correct and correct_opt_letter:
            if clean(student_choice) == clean(correct_opt_letter):
                is_correct = True
        if not is_correct and clean(marking) and clean(student_choice) == clean(marking):
            is_correct = True
            
        if is_correct:
            score += 1
        else:
            wrong_numbers.append(str(q_num))
            
    print(f"Attempt {attempt_id}: Old Score={old_score}, Recalculated Score={score}/{len(questions_map)}")
    
    # Calculate new total score if graded
    update_data = {
        "mcq_score": score,
        "total_mcq": len(questions_map),
        "wrong_mcq_numbers": wrong_numbers
    }
    
    if status == 'graded':
        theory_raw = att.get("theory_score") or 0
        raw_grand_total = score + theory_raw
        total_possible = 150
        final_percentage = round((raw_grand_total / total_possible) * 100) if total_possible > 0 else 0
        update_data["total_score"] = final_percentage
        print(f" -> Attempt was Graded: New Grand Total Score Percentage = {final_percentage}%")
        
    # Patch database
    r_patch = requests.patch(f"{url_attempts}?id=eq.{attempt_id}", headers=h, json=update_data)
    if r_patch.status_code == 204:
        print(f" -> [SUCCESS] Updated attempt {attempt_id} successfully.")
    else:
        print(f" -> [ERROR] Failed to update attempt {attempt_id}: {r_patch.text}")
