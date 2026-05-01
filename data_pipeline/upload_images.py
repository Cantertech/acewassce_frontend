import requests
import os
import glob
import re
from dotenv import load_dotenv

# Load credentials
load_dotenv(dotenv_path=".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

# The canonical ID for the 2025 Core Mathematics exam
CANONICAL_EXAM_ID = "fd9c561c-f0f1-411d-aee7-75f2656f4904"
IMAGE_DIR = r"data_pipeline\images"
BUCKET = "question-images"

def upload_and_link():
    images = glob.glob(os.path.join(IMAGE_DIR, "*.png"))
    print(f"Found {len(images)} images to process.")

    for img_path in images:
        filename = os.path.basename(img_path)
        print(f"\nProcessing {filename}...")

        # Parse filename: 2025_cm_mcqs_18.png or 2025_cm_theory_q13.png
        is_mcq = "mcqs" in filename
        num_match = re.search(r"(\d+)", filename.replace("2025", "")) # Skip the year
        if not num_match:
            print(f"Could not find question number in {filename}")
            continue
        
        q_num = num_match.group(1)
        
        # 1. Upload to Storage
        # endpoint: /storage/v1/object/question-images/filename
        upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{filename}"
        with open(img_path, 'rb') as f:
            res = requests.post(upload_url, headers=headers, data=f)
        
        if res.status_code in [200, 201]:
            print(f"✅ Uploaded to Storage")
        elif res.status_code == 400 and "Duplicate" in res.text:
             print(f"ℹ️ Already exists in Storage")
        else:
            print(f"❌ Upload failed: {res.status_code}")
            print(res.text)
            continue

        # 2. Get Public URL
        # URL format: {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"

        # 3. Update Database Question
        db_url = f"{SUPABASE_URL}/rest/v1/questions"
        params = {
            "exam_id": f"eq.{CANONICAL_EXAM_ID}",
            "question_number": f"eq.{q_num}",
            "is_mcq": f"eq.{'true' if is_mcq else 'false'}"
        }
        
        # We need to find the specific question ID first to show update counts
        get_res = requests.get(db_url, headers=headers, params=params)
        found_qs = get_res.json()
        
        if not found_qs:
            print(f"⚠️ Question {q_num} ({'MCQ' if is_mcq else 'Theory'}) not found in Database!")
            continue
        
        q_id = found_qs[0]['id']
        patch_res = requests.patch(f"{db_url}?id=eq.{q_id}", headers=headers, json={
            "image_url": public_url,
            "has_diagram": True
        })
        
        if patch_res.status_code in [200, 204]:
            print(f"✅ Linked to Question {q_num} in DB")
        else:
            print(f"❌ DB link failed: {patch_res.status_code}")
            print(f"Response: {patch_res.text}")

if __name__ == "__main__":
    upload_and_link()
