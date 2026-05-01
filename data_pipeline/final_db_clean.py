import requests
import os
from dotenv import load_dotenv

load_dotenv("../.env") # Load from parent root .env
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

def clean_text(text):
    if not text: return text
    # Fix unclosed blocks and triple dollar hallucination
    # x%$$$ -> x%$ 
    text = text.replace("$$$", "$")
    text = text.replace("$$", "$")
    text = text.replace("$2727", "27, 27")
    text = text.replace("$27, 31", "27, 31")
    return text

# Fetch all theory questions
res = requests.get(f"{url}/rest/v1/questions?is_mcq=eq.false", headers=headers)
questions = res.json()

for q in questions:
    new_text = clean_text(q.get("question_text"))
    if new_text != q.get("question_text"):
        requests.patch(f"{url}/rest/v1/questions?id=eq.{q['id']}", headers=headers, json={"question_text": new_text})
        print(f"Patched Theory Q{q['question_number']}")
