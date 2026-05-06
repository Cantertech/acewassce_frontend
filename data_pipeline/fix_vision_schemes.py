import os, requests, json, base64
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel
from typing import List
import fitz

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}

client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

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

def fix_question_with_vision(year, q_num, pdf_path, exam_id):
    print(f"--- Fixing {year} Question {q_num} with Vision ---")
    
    # 1. Fetch Question Text
    r = requests.get(url, headers=h, params={'exam_id': f'eq.{exam_id}', 'is_mcq': 'eq.false', 'question_number': f'eq.{q_num}', 'select': 'id,question_text,sub_questions'})
    if r.status_code != 200 or not r.json():
        print("Question not found in DB.")
        return
    q = r.json()[0]
    q_id = q['id']
    full_text = f"Question {q_num}:\n{q.get('question_text', '')}\n"
    for sq in q.get('sub_questions', []):
        full_text += f"{sq.get('question_number', '')}) {sq.get('question_text', '')}\n"
        
    # 2. Convert PDF to Base64 Images
    doc = fitz.open(pdf_path)
    base64_images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        img_data = pix.tobytes("png")
        base64_images.append(base64.b64encode(img_data).decode('utf-8'))
        
    # 3. Build Prompt
    messages = [
        {"role": "system", "content": "You are a Chief WAEC Examiner for Core Mathematics."},
        {
            "role": "user",
            "content": [
                {
                    "type": "text", 
                    "text": f"Solve this high school WAEC Core Mathematics theory problem and output the strict marking scheme.\n\n{full_text}\n\n"
                            "RULES:\n"
                            "1. Break the solution into logical steps.\n"
                            "2. Total marks MUST exactly equal 12. Distribute the 12 marks across sub-questions based on complexity.\n"
                            "3. Assign Mark Types: 'M' for Method, 'A' for Accuracy, 'B' for independent correct statements. e.g., 'M1' (1 mark).\n"
                            "4. Format all math equations in LaTeX using $...$.\n"
                            "5. CRITICAL: Use the attached images of the exam paper to view the geometry diagrams, graphs, or visual data required to solve this question."
                }
            ]
        }
    ]
    
    for b64 in base64_images:
        messages[1]["content"].append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64}"}
        })
        
    try:
        response = client.beta.chat.completions.parse(
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
            print(f"✅ Successfully regenerated Scheme for {year} Q{q_num} with Vision!")
        else:
            print(f"❌ Failed to update DB")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_question_with_vision(
        year='2024',
        q_num='12',
        pdf_path='data_pipeline/main_pdfs/questions/Core_mathematics/2024/theory/2024 WASSCE Mathematics Core 2.pdf',
        exam_id='d4385b88-1bf9-4260-85de-df99ef8f0c1f'
    )
