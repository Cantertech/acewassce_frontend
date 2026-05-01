import requests
import os
from dotenv import load_dotenv

load_dotenv(".env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

def clean_text(text):
    if not text: return text
    # Fix the triple dollar signs and unclosed starting dollars
    # x%$$$ -> x%$ 
    text = text.replace("$$$", "$")
    # Fix double dollars that should be single
    text = text.replace("$$", "$")
    # Fix the Q12 numbers missing closure
    text = text.replace("$2727", "27, 27")
    text = text.replace("$27, 31", "27, 31")
    return text

# Get Q6 and Q12 theory
res = requests.get(f'{url}/rest/v1/questions?question_number=in.("6","12")&is_mcq=eq.false', headers=headers)
questions = res.json()

for q in questions:
    new_text = clean_text(q.get("question_text"))
    if new_text != q.get("question_text"):
        patch_res = requests.patch(
            f"{url}/rest/v1/questions?id=eq.{q['id']}", 
            headers=headers, 
            json={"question_text": new_text}
        )
        print(f"Patched Q{q['question_number']}: {patch_res.status_code}")
