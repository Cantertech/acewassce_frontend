import os, requests, json, re
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

# 1. Load env variables
load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'), timeout=120.0)
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

# Official 2025 printed answer keys from the image
OFFICIAL_KEYS = {
    "1": "C", "2": "D", "3": "D", "4": "B", "5": "C", "6": "C", "7": "D", "8": "B", "9": "A", "10": "A",
    "11": "A", "12": "B", "13": "B", "14": "C", "15": "B", "16": "A", "17": "C", "18": "B", "19": "C", "20": "A",
    "21": "B", "22": "A", "23": "D", "24": "D", "25": "B", "26": "B", "27": "B", "28": "A", "29": "A", "30": "B",
    "31": "C", "32": "D", "33": "D", "34": "B", "35": "B", "36": "D", "37": "B", "38": "B", "39": "D", "40": "A",
    "41": "B", "42": "C", "43": "A", "44": "C", "45": "A", "46": "B", "47": "A", "48": "C", "49": "B", "50": "A"
}

# 2. Fetch all current database questions for the 2025 exam
r = requests.get(url, headers=h, params={
    'exam_id': f'eq.{exam_2025}', 
    'is_mcq': 'eq.true', 
    'select': 'id,question_number,question_text,options,marking_scheme'
})

if r.status_code != 200:
    print("Failed to fetch questions from database:", r.text)
    exit()

questions = r.json()
questions.sort(key=lambda x: x['question_number'])

# 3. Load local solution JSON file
local_sol_path = 'data_pipeline/processed/schemes_final/2025_WASSCE_CORE_MATHS_1_SOLUTIONS_LIVE.json'
local_solutions = []
if os.path.exists(local_sol_path):
    with open(local_sol_path, 'r', encoding='utf-8') as f:
        local_solutions = json.load(f)

class SolutionBreakdown(BaseModel):
    explanation: str

print("--- Starting Sync and Verification of 2025 WASSCE MCQ Answers ---")
updated_count = 0

for q in questions:
    q_id = q['id']
    q_num = str(q['question_number'])
    q_text = q['question_text']
    options = q.get('options', [])
    marking = q.get('marking_scheme', '') or ''
    
    if q_num not in OFFICIAL_KEYS:
        continue
        
    correct_opt = OFFICIAL_KEYS[q_num]
    
    # Check if current DB answer matches the official answer key
    opt_match = re.search(r'Correct Option:\s*([A-D])', marking, re.IGNORECASE)
    db_opt = opt_match.group(1).upper() if opt_match else 'UNKNOWN'
    
    if db_opt == correct_opt:
        print(f"Q{q_num}: Already aligned with Official Option {correct_opt}. Skipping regeneration.")
        continue
        
    print(f"[MISMATCH] Q{q_num}: Database: {db_opt} vs Official Key: {correct_opt}. Regenerating step-by-step solution...")
    
    # Prompt the AI to solve the question forcing the official correct option
    prompt = (
        f"You are a master mathematics teacher. Solve this high school math multiple choice question.\n"
        f"The official WAEC correct option is guaranteed to be option '{correct_opt}'.\n\n"
        f"Question {q_num}:\n{q_text}\n\n"
        f"Options:\n"
    )
    for opt in options:
        prompt += f"{opt['id']}. {opt['text']}\n"
        
    prompt += f"\nWrite a clear, step-by-step mathematical explanation using standard LaTeX notation showing how to arrive at the correct option {correct_opt}."
    
    try:
        sol_response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are an expert mathematics tutor. Write a clear, concise step-by-step explanation showing why option {correct_opt} is the correct answer. Format your mathematical equations beautifully in LaTeX (using single dollar sign $ for inline and double dollar sign $$ for block equations)."},
                {"role": "user", "content": prompt}
            ],
            response_format=SolutionBreakdown
        )
        
        explanation = sol_response.choices[0].message.parsed.explanation
        new_marking_scheme = f"Correct Option: {correct_opt}\nExplanation: {explanation}"
        
        # Patch the Supabase Database
        patch_res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": new_marking_scheme})
        if patch_res.status_code == 204:
            print(f"[SUCCESS] Updated Database Q{q_num} with official option {correct_opt}")
            updated_count += 1
        else:
            print(f"[ERROR] Failed to update Database Q{q_num}: {patch_res.text}")
            
        # Update local JSON solutions file if it exists
        found_local = False
        for l_sol in local_solutions:
            if str(l_sol.get('question_number')) == q_num:
                l_sol['solution'] = new_marking_scheme
                found_local = True
                break
        if not found_local:
            # Create a new element
            local_solutions.append({
                "question_number": q_num,
                "question_text": q_text,
                "options": options,
                "solution": new_marking_scheme
            })
            
    except Exception as e:
        print(f"Error processing Q{q_num}: {e}")

# 5. Save updated local solutions JSON
if local_solutions:
    # Sort local solutions by question number numerically
    local_solutions.sort(key=lambda x: int(x.get('question_number', 0)))
    with open(local_sol_path, 'w', encoding='utf-8') as f:
        json.dump(local_solutions, f, indent=2, ensure_ascii=False)
    print("Successfully synchronized local solutions JSON file!")

print(f"\nCompleted! Synchronized {updated_count} questions with the official printed key sheet.")
