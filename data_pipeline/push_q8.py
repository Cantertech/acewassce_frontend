import requests
import os
from dotenv import load_dotenv

# Load credentials
load_dotenv(dotenv_path=".env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Values for Question 8
target_exam_id = "fd9c561c-f0f1-411d-aee7-75f2656f4904"
payload = {
    "exam_id": target_exam_id,
    "question_identifier": "2025_mathematics_8",
    "topic": "Core Mathematics",
    "question_number": "8",
    "question_text": "The first 4 terms of an Arithmetic Progression (A.P) are 8, x, y and 17. Find the value of $(x + y)$.",
    "has_diagram": False,
    "is_mcq": True,
    "options": [
        {"id": "A", "text": "$20$"},
        {"id": "B", "text": "$25$"},
        {"id": "C", "text": "$40$"},
        {"id": "D", "text": "$31$"}
    ]
}

def push():
    print(f"Connecting to {url}...")
    res = requests.post(f"{url}/rest/v1/questions", headers=headers, json=payload)
    if res.status_code in [200, 201]:
        print("✅ Successfully pushed MCQ Question 8 to Database!")
    else:
        print(f"❌ Failed to push. Status: {res.status_code}")
        print(res.text)

if __name__ == "__main__":
    push()
