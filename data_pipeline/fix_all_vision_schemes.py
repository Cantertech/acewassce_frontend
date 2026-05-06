import os, requests, json, base64, asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel
from typing import List
import fitz

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
    mark_type: str  
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

pdf_paths = {
    '2021': 'data_pipeline/main_pdfs/questions/Core_mathematics/2021/theory/2021 WASSCE CORE MATHEMATICS 2.pdf',
    '2022': 'data_pipeline/main_pdfs/questions/Core_mathematics/2022/theory/2022 WASSCE MATHEMATICS 2.pdf',
    '2023': 'data_pipeline/main_pdfs/questions/Core_mathematics/2023/theory/2023 WASSCE CORE MATHS 2.pdf',
    '2024': 'data_pipeline/main_pdfs/questions/Core_mathematics/2024/theory/2024 WASSCE Mathematics Core 2.pdf'
}

# Targeted questions that might have diagrams based on text search
targets = {
    '2021': ['4', '6', '7', '10', '11', '12'],
    '2022': ['6', '9', '11'],
    '2023': ['8', '9', '10', '11', '12', '13'],
    '2024': ['2', '3', '4', '9', '10', '11']
}

def get_pdf_images(year):
    path = pdf_paths.get(year)
    if not path or not os.path.exists(path):
        return []
    doc = fitz.open(path)
    base64_images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)) # Reduced resolution to save cost
        img_data = pix.tobytes("png")
        base64_images.append(base64.b64encode(img_data).decode('utf-8'))
    return base64_images

async def fix_question_with_vision(year, q_num, base64_images, exam_id):
    r = requests.get(url, headers=h, params={'exam_id': f'eq.{exam_id}', 'is_mcq': 'eq.false', 'question_number': f'eq.{q_num}', 'select': 'id,question_text,sub_questions'})
    if r.status_code != 200 or not r.json():
        return
    q = r.json()[0]
    q_id = q['id']
    full_text = f"Question {q_num}:\n{q.get('question_text', '')}\n"
    for sq in q.get('sub_questions', []):
        full_text += f"{sq.get('question_number', '')}) {sq.get('question_text', '')}\n"
        
    expected_marks = 8 if int(q_num) <= 5 else 12

    messages = [
        {"role": "system", "content": "You are a Chief WAEC Examiner for Core Mathematics."},
        {
            "role": "user",
            "content": [
                {
                    "type": "text", 
                    "text": f"Solve this WAEC theory problem and output the strict marking scheme.\n\n{full_text}\n\n"
                            "RULES:\n"
                            "1. Break the solution into logical steps.\n"
                            f"2. Total marks MUST exactly equal {expected_marks}. Distribute marks across sub-questions.\n"
                            "3. Assign Mark Types: 'M' for Method, 'A' for Accuracy, 'B' for independent correct statements.\n"
                            "4. CRITICAL: Use the attached images of the exam paper to view the diagrams/graphs/tables needed to solve this. IF NO DIAGRAM IS NEEDED, JUST IGNORE THE IMAGES."
                }
            ]
        }
    ]
    
    for b64 in base64_images:
        messages[1]["content"].append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "low"} # low detail to save cost
        })
        
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=messages,
            response_format=SchemeSchema,
        )
        
        result = response.choices[0].message.parsed
        text = f"Total Marks: {result.total_marks}\nPenalties: {len(result.penalties)}\n"
        for step in result.steps:
            text += f"- Step {step.step_order}: {step.expected_logic} | Eq: {step.expected_equation} | Mark: {step.mark_type}({step.marks_awarded})\n"
            
        patch_res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": text})
        if patch_res.status_code == 204:
            print(f"✅ Regenerated Scheme for {year} Q{q_num} with Vision!")
        else:
            print(f"❌ Failed to update DB for {year} Q{q_num}")
            
    except Exception as e:
        print(f"Error on {year} Q{q_num}: {e}")

async def main():
    for year, q_nums in targets.items():
        print(f"--- Loading PDF for {year} ---")
        images = get_pdf_images(year)
        if not images:
            print(f"No PDF found for {year}")
            continue
        
        exam_id = exams[year]
        tasks = [fix_question_with_vision(year, q_num, images, exam_id) for q_num in q_nums]
        await asyncio.gather(*tasks)

if __name__ == "__main__":
    asyncio.run(main())
