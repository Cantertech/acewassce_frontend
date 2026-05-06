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

# Fetch questions
r_q = requests.get(url_questions, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'is_mcq': 'eq.true',
    'select': 'id,question_number,marking_scheme,options'
})
questions_map = {q["id"]: q for q in r_q.json()}

# Fetch attempts
r_att = requests.get(url_attempts, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'select': 'id,mcq_score,theory_score,status'
})
attempts = r_att.json()

def clean(text):
    return re.sub(r'[\$\s,\\]', '', str(text)).lower()

for att in attempts:
    attempt_id = att['id']
    status = att.get('status')
    
    # Fetch responses for this attempt
    r_resp = requests.get(url_responses, headers=h, params={
        'attempt_id': f'eq.{attempt_id}',
        'select': 'id,question_id,selected_option'
    })
    
    if r_resp.status_code != 200 or not r_resp.json():
        continue
        
    all_responses = r_resp.json()
    
    # Deduplicate: Keep only the first response per question_id
    seen_questions = {}
    duplicates_to_delete = []
    unique_responses = []
    
    for resp in all_responses:
        q_id = resp['question_id']
        if q_id in seen_questions:
            duplicates_to_delete.append(resp['id'])
        else:
            seen_questions[q_id] = resp
            unique_responses.append(resp)
            
    if duplicates_to_delete:
        print(f"Attempt {attempt_id}: Found {len(duplicates_to_delete)} duplicate responses. Deleting in bulk...")
        # PostgREST bulk delete with IN filter: id=in.(id1,id2)
        # To handle very large lists, we can split them into chunks of 100
        chunk_size = 100
        for i in range(0, len(duplicates_to_delete), chunk_size):
            chunk = duplicates_to_delete[i:i + chunk_size]
            id_list_str = ",".join(chunk)
            bulk_url = f"{url_responses}?id=in.({id_list_str})"
            del_res = requests.delete(bulk_url, headers=h)
            if del_res.status_code not in [200, 204]:
                print(f" -> Failed bulk delete chunk: {del_res.text}")
            
    # Calculate score using unique responses
    score = 0
    wrong_numbers = []
    
    for resp in unique_responses:
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
            
    print(f"Attempt {attempt_id}: Deduplicated Score={score}/{len(questions_map)}")
    
    # Update attempt
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
        
    requests.patch(f"{url_attempts}?id=eq.{attempt_id}", headers=h, json=update_data)
