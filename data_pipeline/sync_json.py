import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def upload_questions(exam_id, json_file):
    print(f"Uploading: {json_file.name}")
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    url = f"{SUPABASE_URL}/rest/v1/questions"
    for q in data.get('questions', []):
        payload = {
            "exam_id": exam_id,
            "question_number": str(q.get('question_number')),
            "question_text": q.get('question_text'),
            "topic": q.get('topic'),
            "is_mcq": q.get('is_mcq', False),
            "options": q.get('options'),
            "has_diagram": q.get('has_diagram', False),
            "sub_questions": q.get('sub_questions'),
            "question_identifier": q.get('question_id'),
        }
        res = requests.post(url, headers=HEADERS, json=payload)
        if res.status_code not in [200, 201]:
            print(f"  [ERROR] Uploading Q{q.get('question_number')}: {res.text}")
        else:
            print(f"  [SUCCESS] Uploaded Q{q.get('question_number')}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python sync_json.py <EXAM_ID> <JSON_FILE_PATH>")
        sys.exit(1)
    
    exam_id = sys.argv[1]
    file_path = Path(sys.argv[2])
    
    if file_path.exists():
        upload_questions(exam_id, file_path)
    else:
        print(f"File not found: {file_path}")
