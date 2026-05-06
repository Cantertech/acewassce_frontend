import os, requests, json
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

class MCQSolution(BaseModel):
    correct_option: str
    explanation: str

exams = {
    '2022': '3b7abe1d-3bf5-4f83-8c02-01aecbc5bee7',
    '2023': 'daf303bf-32a0-4e8e-9289-de770c51aa2e',
    '2025': 'fd9c561c-f0f1-411d-aee7-75f2656f4904'
}

def solve_questions(year):
    print(f"--- Solving MCQs for {year} ---")
    exam_id = exams[year]
    r = requests.get(url, headers=h, params={'exam_id': f'eq.{exam_id}', 'is_mcq': 'eq.true', 'select': 'id,question_number,question_text,options'})
    if r.status_code != 200:
        print("Failed to fetch questions:", r.text)
        return
        
    questions = r.json()
    print(f"Found {len(questions)} MCQs for {year}.")
    
    count = 0
    for q in questions:
        q_id = q['id']
        q_num = q['question_number']
        q_text = q['question_text']
        options = q.get('options', [])
        
        # Build prompt
        prompt = f"Solve this high school math multiple choice question.\n\nQuestion {q_num}:\n{q_text}\n\nOptions:\n"
        for opt in options:
            prompt += f"{opt['id']}. {opt['text']}\n"
            
        try:
            response = client.beta.chat.completions.parse(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert mathematics teacher. Solve the problem step-by-step and identify the correct option (A, B, C, or D). Provide a short, direct explanation."},
                    {"role": "user", "content": prompt}
                ],
                response_format=MCQSolution,
            )
            
            result = response.choices[0].message.parsed
            opt = result.correct_option
            ans = result.explanation
            
            mark_text = f"Correct Option: {opt}\nExplanation: {ans}"
            patch_res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": mark_text})
            if patch_res.status_code == 204:
                print(f"Solved Q{q_num}: Option {opt}")
                count += 1
            else:
                print(f"Failed to update DB for Q{q_num}")
                
        except Exception as e:
            print(f"Error solving Q{q_num}: {e}")
            
    print(f"Successfully solved and updated {count} questions for {year}.")

if __name__ == "__main__":
    solve_questions('2025')
