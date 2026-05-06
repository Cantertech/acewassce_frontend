import base64, json, os, requests
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'), timeout=120.0)
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

image_path = 'data_pipeline/raw_schemes/2025 WASSCE MATHEMATICS CORE 1 SOLUTION_page_1.jpg'

# 1. Base64 Encode the official key image
with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

print("--- Step 1: Extracting official answers from printed sheet image ---")

from typing import List

class AnswerItem(BaseModel):
    question_number: int
    correct_option: str

# Define schema for response
class AnswerKey(BaseModel):
    answers: List[AnswerItem]

official_keys = None
for attempt in range(3):
    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert OCR and data extractor. Extract the official MCQ answers for questions 1 to 50 from the printed sheet. Provide the mapping of question numbers to their correct options (A, B, C, or D)."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all 50 MCQ answers from this sheet."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_string}"}}
                    ]
                }
            ],
            response_format=AnswerKey
        )
        official_keys = response.choices[0].message.parsed.answers
        break
    except Exception as e:
        print(f"Attempt {attempt+1} failed: {e}")
        if attempt == 2:
            raise e

if not official_keys:
    print("Failed to extract official keys after 3 attempts.")
    exit()

# Convert list of AnswerItem to a dict
keys_dict = {str(item.question_number): item.correct_option for item in official_keys}

print("Extracted Official Keys:")
print(json.dumps(keys_dict, indent=2))

print("\n--- Step 2: Fetching current database questions and updating ---")

# Fetch all 50 MCQs for 2025
r = requests.get(url, headers=h, params={
    'exam_id': f'eq.{exam_2025}', 
    'is_mcq': 'eq.true', 
    'select': 'id,question_number,question_text,options'
})

if r.status_code != 200:
    print("Failed to fetch questions:", r.text)
    exit()

questions = r.json()
count = 0

class SolutionBreakdown(BaseModel):
    explanation: str

for q in questions:
    q_id = q['id']
    q_num = str(q['question_number'])
    
    if q_num not in keys_dict:
        print(f"Skipping Q{q_num}: Not found in official answer key.")
        continue
        
    correct_opt = keys_dict[q_num].upper().strip()
    q_text = q['question_text']
    options = q.get('options', [])
    
    # Prompt the AI to solve the question forcing the official correct option
    prompt = (
        f"You are a master mathematics teacher. Solve this high school math multiple choice question.\n"
        f"The official WAEC correct option is guaranteed to be option '{correct_opt}'.\n\n"
        f"Question {q_num}:\n{q_text}\n\n"
        f"Options:\n"
    )
    for opt in options:
        prompt += f"{opt['id']}. {opt['text']}\n"
        
    prompt += f"\nWrite a clear, step-by-step mathematical explanation showing how to arrive at the correct option {correct_opt}."
    
    try:
        sol_response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are a mathematics tutor. Write a clear, concise step-by-step explanation showing why option {correct_opt} is the correct answer."},
                {"role": "user", "content": prompt}
            ],
            response_format=SolutionBreakdown
        )
        
        explanation = sol_response.choices[0].message.parsed.explanation
        mark_text = f"Correct Option: {correct_opt}\nExplanation: {explanation}"
        
        # Patch the database
        patch_res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": mark_text})
        if patch_res.status_code == 204:
            print(f"✅ Updated Q{q_num} with official option {correct_opt}")
            count += 1
        else:
            print(f"❌ Failed to update database for Q{q_num}")
    except Exception as e:
        print(f"Error updating Q{q_num}: {e}")

print(f"\nSuccessfully verified and updated {count} questions with official 2025 answer keys!")
