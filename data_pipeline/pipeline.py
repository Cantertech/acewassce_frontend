import os
import glob
import re
import json
import asyncio
import requests
from pathlib import Path
from dotenv import load_dotenv

# Import functions from existing pipeline scripts
import fitz  # PyMuPDF
from extract import process_question_image, process_scheme_image, process_mcq_solutions

# --- CONFIG ---
load_dotenv(dotenv_path=".env")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

BASE_DIR = Path(__file__).parent
MAIN_PDFS_DIR = BASE_DIR / "main_pdfs"
IMAGES_DIR = BASE_DIR / "temp_images"
PROCESSED_Q_DIR = BASE_DIR / "processed" / "questions"
PROCESSED_S_DIR = BASE_DIR / "processed" / "schemes"

def ensure_dirs():
    for d in [MAIN_PDFS_DIR, IMAGES_DIR, PROCESSED_Q_DIR, PROCESSED_S_DIR]:
        d.mkdir(parents=True, exist_ok=True)

# --- 1. PDF TO IMAGES ---
def convert_pdf_to_images(pdf_path: Path, output_folder: Path):
    print(f"📄 Converting PDF: {pdf_path.name}")
    doc = fitz.open(pdf_path)
    base_name = pdf_path.stem
    
    generated_images = []
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        output_file = output_folder / f"{base_name}_page_{page_num+1}.jpg"
        pix.save(str(output_file))
        generated_images.append(output_file)
        print(f"  -> Exported: {output_file.name}")
    
    doc.close()
    return generated_images

# --- 2. EXTRACTION RUNNER ---
async def extract_data(image_paths, is_solution: bool, is_mcq: bool):
    print(f"🧠 Extracting Data with AI (is_solution={is_solution}, is_mcq={is_mcq})...")
    for img_path in image_paths:
        filename = img_path.name
        
        # Determine output path first
        output_dir = PROCESSED_S_DIR if is_solution else PROCESSED_Q_DIR
        out_file = output_dir / f"{img_path.stem}.json"
        
        # SKIP if it already exists!
        if out_file.exists():
            print(f"  ⏩ Skipping {filename} (JSON already exists)")
            continue

        print(f"  -> Processing: {filename}")
        
        # Decide process type
        if is_solution:
            if is_mcq:
                # It's an MCQ Solution key
                result = await process_mcq_solutions(str(img_path), filename)
            else:
                # It's a Theory Marking Scheme
                result = await process_scheme_image(str(img_path), filename)
            
            output_dir = PROCESSED_S_DIR
        else:
            # It's a Question Paper
            result = await process_question_image(str(img_path), filename, model="gpt-4o-mini")
            output_dir = PROCESSED_Q_DIR
            
        if result:
            out_file = output_dir / f"{img_path.stem}.json"
            with open(out_file, "w", encoding="utf-8") as f:
                f.write(result.model_dump_json(indent=2))
            print(f"  ✅ Saved JSON: {out_file.name}")

# --- 3. DATABASE UPLOADER ---
def get_or_create_exam(title: str, subject: str, year: int):
    url = f"{SUPABASE_URL}/rest/v1/exams"
    params = {"title": f"eq.{title}", "select": "id"}
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
    if data:
        return data[0]['id']
    else:
        # Default WASSCE Durations: 1.5h for MCQ (5400s), 2.5h for Theory (9000s)
        payload = {
            "title": title,
            "subject": subject,
            "year": year,
            "mcq_duration": 5400,
            "theory_duration": 9000,
            "duration_minutes": 240 # Total 4 hours
        }
        res = requests.post(url, headers=HEADERS, json=payload)
        return res.json()[0]['id']

def upload_questions(exam_id: str, json_files: list):
    url = f"{SUPABASE_URL}/rest/v1/questions"
    for file in json_files:
        print(f"  -> Uploading Questions from {file.name}")
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for q in data.get('questions', []):
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
            # Simplistic upsert or ignore duplicate logic could be added here
            res = requests.post(url, headers=HEADERS, json=payload)
            if res.status_code not in [200, 201]:
                print(f"     ❌ Failed: {res.text}")

def format_scheme_text(s):
    qid = s.get("question_id", "?")
    total = s.get("total_marks", "?")
    lines = [f"--- SUB-PART {qid} (Marks: {total}) ---"]
    for step in s.get("steps", []):
        lines.append(f"- Step {step.get('step_order', '')}: {step.get('expected_logic', '')} | Eq: {step.get('expected_equation', '')} | Mark: {step.get('mark_type', '')}({step.get('marks_awarded', '')})")
    for p in s.get("penalties", []):
        lines.append(f"  [PENALTY] {p.get('type', '')}: -{p.get('deduction', '')}")
    return "\n".join(lines)

def upload_schemes(exam_id: str, json_files: list):
    # Map questions in DB
    q_url = f"{SUPABASE_URL}/rest/v1/questions"
    res = requests.get(q_url, headers=HEADERS, params={"exam_id": f"eq.{exam_id}"})
    q_map = {str(q['question_number']): q['id'] for q in res.json()}
    
    for file in json_files:
        print(f"  -> Uploading Schemes from {file.name}")
        with open(file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Check if it's MCQ keys (has 'solutions') or Theory (has 'schemes')
        if 'solutions' in data:
            # It's an MCQ Key!
            for sol in data['solutions']:
                q_num = str(sol['question_number'])
                actual_q_id = q_map.get(q_num)
                if actual_q_id:
                    # Save as marking_scheme text
                    text = f"Correct Option: {sol['correct_option']}"
                    requests.patch(f"{q_url}?id=eq.{actual_q_id}", headers=HEADERS, json={"marking_scheme": text})
        elif 'schemes' in data:
            # It's Theory Schemes
            grouped = {}
            for s in data['schemes']:
                # Extract parent question number (e.g., '12a' -> '12')
                m = re.match(r"^(\d+)", str(s.get("question_id", "")).strip())
                if m:
                    pn = m.group(1)
                    grouped.setdefault(pn, []).append(s)
            
            for qn, schemes in grouped.items():
                actual_q_id = q_map.get(qn)
                if actual_q_id:
                    schemes_sorted = sorted(schemes, key=lambda x: str(x.get("question_id", "")))
                    combined = "\n\n".join(format_scheme_text(s) for s in schemes_sorted)
                    requests.patch(f"{q_url}?id=eq.{actual_q_id}", headers=HEADERS, json={"marking_scheme": combined})

# --- PIPELINE ORCHESTRATOR ---
async def run_pipeline():
    ensure_dirs()
    # Use rglob to search through all subdirectories
    # Processing 2021 using cost-efficient gpt-4o-mini
    pdfs = [p for p in MAIN_PDFS_DIR.rglob("*.pdf") if "2021" in str(p)]
    
    if not pdfs:
        print(f"No PDFs found in {MAIN_PDFS_DIR}. Please add some and run again.")
        return
        
    print(f"🚀 Starting Unified Pipeline. Found {len(pdfs)} PDFs in directory structure.")
    
    for pdf in pdfs:
        print(f"\n{'='*50}\nProcessing: {pdf.name}\n{'='*50}")
        
        # 1. Detect Metadata from Directory Structure
        # Expected structure: main_pdfs / [Questions|solutions] / [Subject] / [Year] / [mcqs|theory] / filename.pdf
        try:
            # Find the index of 'main_pdfs' to safely get relative parts
            parts = pdf.parts
            main_idx = parts.index("main_pdfs")
            
            type_folder = parts[main_idx + 1] # e.g. 'Questions' or 'solutions'
            subject_folder = parts[main_idx + 2] # e.g. 'Core_mathematics'
            year_folder = parts[main_idx + 3] # e.g. '2020'
            paper_type_folder = parts[main_idx + 4] # e.g. 'theory' or 'mcqs'
            
            is_solution = type_folder.lower() == "solutions"
            year = int(year_folder)
            subject = subject_folder.replace("_", " ").title()
            
            # Figure out if it's Paper 1 or Paper 2 based on the folder (or fallback to filename)
            paper_num = ""
            if "mcq" in paper_type_folder.lower():
                paper_num = " 1"
            elif "theory" in paper_type_folder.lower():
                paper_num = " 2"
            elif "1" in pdf.name or "OBJ" in pdf.name.upper() or "MCQ" in pdf.name.upper():
                paper_num = " 1"
            elif "2" in pdf.name or "THEORY" in pdf.name.upper():
                paper_num = " 2"
                
            title = f"{year} WASSCE {subject.upper()}"
            
        except (ValueError, IndexError) as e:
            print(f"⚠️ Warning: {pdf} does not match expected folder structure. Attempting fallback filename parsing...")
            name_upper = pdf.name.upper()
            is_solution = "SOLUTION" in name_upper or "MARKING" in name_upper
            year_match = re.search(r"(\d{4})", name_upper)
            year = int(year_match.group(1)) if year_match else 2025
            title = name_upper.replace("SOLUTION", "").replace("MARKING", "").replace("SCHEME", "").replace(".PDF", "").strip()
            subject = "Unknown"
            if "MATH" in title: subject = "Mathematics"
            elif "SCI" in title: subject = "Science"
            elif "ENG" in title: subject = "English"

        exam_id = get_or_create_exam(title, subject, year)
        print(f"📌 Exam Context: {title} (Subject: {subject}, Year: {year}) -> ID: {exam_id}")
        
        # 2. Convert to Images
        images = convert_pdf_to_images(pdf, IMAGES_DIR)
        
        # 3. Extract JSON via AI
        is_mcq_paper = (paper_num == " 1")
        await extract_data(images, is_solution, is_mcq_paper)
        
        # 4. Upload to DB
        if is_solution:
            json_files = list(PROCESSED_S_DIR.glob(f"{pdf.stem}*.json"))
            upload_schemes(exam_id, json_files)
        else:
            json_files = list(PROCESSED_Q_DIR.glob(f"{pdf.stem}*.json"))
            upload_questions(exam_id, json_files)
            
    print("\n🎉 All Processing Complete!")

if __name__ == "__main__":
    asyncio.run(run_pipeline())
