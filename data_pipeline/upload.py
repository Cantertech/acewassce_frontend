import os
import glob
import json
import requests
from dotenv import load_dotenv

# Provide path to root .env
load_dotenv(dotenv_path="../.env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Use service role to bypass RLS

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing SUPABASE Credentials in ../.env")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def get_or_create_exam(title, subject, year):
    # Check if exists
    url = f"{SUPABASE_URL}/rest/v1/exams"
    params = {"title": f"eq.{title}", "select": "id"}
    res = requests.get(url, headers=headers, params=params)
    data = res.json()
    if data:
        return data[0]['id']
    else:
        # Create
        payload = {
            "title": title,
            "subject": subject,
            "year": year,
            "duration_minutes": 150 if "CORE 2" in title else 90
        }
        res = requests.post(url, headers=headers, json=payload)
        return res.json()[0]['id']

def process_questions(exam_id, files_list):
    url = f"{SUPABASE_URL}/rest/v1/questions"
    
    for file in files_list:
        print(f"Uploading Questions from {os.path.basename(file)}...")
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        questions = data.get('questions', [])
        for q in questions:
            payload = {
                "exam_id": exam_id,
                "question_identifier": q.get('question_id'),
                "topic": q.get('topic'),
                "question_number": str(q.get('question_number')),
                "question_text": q.get('question_text'),
                "has_diagram": q.get('has_diagram', False),
                "is_mcq": q.get('is_mcq', False),
                "options": q.get('options'),
                "sub_questions": q.get('sub_questions')
            }
            # Upsert using question_identifier? No unique constraint added, so ignore duplicates or simply insert
            requests.post(url, headers=headers, json=payload)

def process_schemes(files_list):
    # First map all questions by identifier
    q_url = f"{SUPABASE_URL}/rest/v1/questions"
    res = requests.get(q_url, headers=headers, params={"select": "id,question_identifier"})
    q_map = {item['question_identifier']: item['id'] for item in res.json()}
    
    s_url = f"{SUPABASE_URL}/rest/v1/grading_schemes"
    
    for file in files_list:
        print(f"Uploading Schemes from {os.path.basename(file)}...")
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        schemes = data.get('schemes', [])
        
        # Determine prefix based on filename (e.g. "2025_mathematics_")
        is_core_1 = "CORE 1" in file
        
        for scheme in schemes:
            raw_q_id = str(scheme.get('question_id'))
            
            # The question identifier in the questions json looks like '2025_mathematics_1'
            q_identifier = f"2025_mathematics_{raw_q_id}"
            actual_q_id = q_map.get(q_identifier)
            
            if not actual_q_id:
                # If wait, try just raw
                actual_q_id = q_map.get(raw_q_id)
                
            if actual_q_id:
                payload = {
                    "question_id": actual_q_id,
                    "total_marks": scheme.get('total_marks', 0),
                    "penalties": scheme.get('penalties', []),
                    "steps": scheme.get('steps', [])
                }
                requests.post(s_url, headers=headers, json=payload)
            else:
                print(f"Warning: Could not link scheme for Question {q_identifier} (not found in questions table)")

if __name__ == "__main__":
    print("Starting Upload Process...")
    
    # 1. Ensure Exams exist
    core1_exam_id = get_or_create_exam("2025 WASSCE MATHEMATICS CORE 1", "Mathematics", 2025)
    core2_exam_id = get_or_create_exam("2025 WASSCE MATHEMATICS CORE 2", "Mathematics", 2025)
    
    # 2. Upload Questions
    print("--- Uploading CORE 1 (MCQ) Questions ---")
    core1_q_files = glob.glob(r"processed\questions\*CORE 1*.json")
    process_questions(core1_exam_id, core1_q_files)
    
    print("--- Uploading CORE 2 (Theory) Questions ---")
    core2_q_files = glob.glob(r"processed\questions\*CORE 2*.json")
    process_questions(core2_exam_id, core2_q_files)
    
    # 3. Upload Schemes
    print("--- Uploading Schemes ---")
    all_scheme_files = glob.glob(r"processed\schemes\*.json")
    process_schemes(all_scheme_files)
    
    print("Upload Complete!")
