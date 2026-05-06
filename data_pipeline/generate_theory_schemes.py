import os, requests, json, asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import List, Optional

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}

client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

class Penalty(BaseModel):
    type: str
    description: str
    deduction: int

class MarkingStep(BaseModel):
    step_order: int
    expected_logic: str
    expected_equation: str
    mark_type: str  # e.g. M1, A1, B1
    marks_awarded: int

class SchemeSchema(BaseModel):
    total_marks: int
    penalties: List[Penalty]
    steps: List[MarkingStep]

exams = {
    '2021': 'd0d86bcf-e694-481f-ab13-38d61df1fcb3',
    '2022': '3b7abe1d-3bf5-4f83-8c02-01aecbc5bee7',
    '2023': 'daf303bf-32a0-4e8e-9289-de770c51aa2e',
    '2024': 'd4385b88-1bf9-4260-85de-df99ef8f0c1f'
}

def get_existing_scheme(year, q_num):
    # Very rough search in existing schemes for 2021 and 2022
    import glob
    files = glob.glob(f'data_pipeline/processed/schemes/{year}*SOLUTION*.json')
    for f in files:
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
            for scheme in data.get('schemes', []):
                qid = scheme.get('question_id', '')
                if str(qid) == str(q_num) or str(qid).startswith(f"{q_num}(") or str(qid).startswith(f"{q_num}a") or str(qid).startswith(f"{q_num}b"):
                    return json.dumps(scheme)
    return None

async def process_question(year, q):
    q_id = q['id']
    q_num = q['question_number']
    q_text = q['question_text']
    sub_questions = q.get('sub_questions', [])
    
    full_text = f"Question {q_num}:\n{q_text}\n"
    if sub_questions:
        for sq in sub_questions:
            full_text += f"{sq.get('question_number', '')}) {sq.get('question_text', '')}\n"

    existing = get_existing_scheme(year, q_num)
    
    prompt = f"Solve this high school WAEC Core Mathematics theory problem and output the strict marking scheme.\n\n"
    prompt += f"{full_text}\n\n"
    
    if existing:
        prompt += f"Here is a draft/rough solution for reference. Use it as a guide, but ensure the final structure conforms to the standard 12-mark WAEC structure:\n{existing}\n\n"
    
    prompt += "RULES:\n"
    prompt += "1. Break the solution into logical steps.\n"
    prompt += "2. Total marks MUST exactly equal 12. If there are sub-questions (like (a) and (b)), distribute the 12 marks across them proportionally based on complexity (e.g., 7 marks for (a), 5 for (b)).\n"
    prompt += "3. Assign Mark Types: 'M' for Method, 'A' for Accuracy, 'B' for independent correct statements. e.g., 'M1' (1 mark).\n"
    prompt += "4. Format all math equations in LaTeX using $...$.\n"
    
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o", # Using 4o for theory marking scheme to ensure high quality
            messages=[
                {"role": "system", "content": "You are a Chief WAEC Examiner for Core Mathematics."},
                {"role": "user", "content": prompt}
            ],
            response_format=SchemeSchema,
        )
        
        result = response.choices[0].message.parsed
        
        # Format as text
        text = f"Total Marks: {result.total_marks}\nPenalties: {len(result.penalties)}\n"
        for step in result.steps:
            text += f"- Step {step.step_order}: {step.expected_logic} | Eq: {step.expected_equation} | Mark: {step.mark_type}({step.marks_awarded})\n"
            
        patch_res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": text})
        if patch_res.status_code == 204:
            print(f"✅ Generated and updated Scheme for {year} Q{q_num}")
        else:
            print(f"❌ Failed to update DB for {year} Q{q_num}")
            
    except Exception as e:
        print(f"Error on {year} Q{q_num}: {e}")

async def main():
    for year, exam_id in exams.items():
        print(f"--- Processing Theory Q1-5 for {year} ---")
        r = requests.get(url, headers=h, params={'exam_id': f'eq.{exam_id}', 'is_mcq': 'eq.false', 'select': 'id,question_number,question_text,sub_questions'})
        if r.status_code != 200:
            print(f"Failed to fetch {year}")
            continue
            
        questions = r.json()
        target_qs = [q for q in questions if str(q['question_number']) in ['6', '7', '8', '9', '10', '11', '12', '13']]
        
        tasks = [process_question(year, q) for q in target_qs]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
