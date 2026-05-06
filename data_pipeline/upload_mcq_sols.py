import os, fitz, re, requests
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}

exams = {
    '2021': 'd0d86bcf-e694-481f-ab13-38d61df1fcb3',
    '2024': 'd4385b88-1bf9-4260-85de-df99ef8f0c1f'
}

pdf_files = {
    '2021': 'data_pipeline/main_pdfs/solutions/Core_mathematics/2021/mcqs/2021 WASSCE MATHEMATICS PAPER 1 OBJECTIVE SOLUTION.pdf',
}

for year, path in pdf_files.items():
    if year not in exams:
        print(f"Skipping {year} because exam ID is not in mapping.")
        continue
        
    exam_id = exams[year]
    try:
        doc = fitz.open(path)
        
        # Get mapping of question_number -> id
        r = requests.get(url, headers=h, params={'exam_id': f'eq.{exam_id}', 'is_mcq': 'eq.true', 'select': 'id,question_number'})
        if r.status_code != 200:
            print(f"Failed to fetch questions for {year}")
            continue
            
        q_map = {str(q['question_number']): q['id'] for q in r.json()}
        count = 0
        
        for i in range(len(doc)):
            text = doc[i].get_text()
            for line in text.split('\n'):
                line = line.strip()
                if not line: continue
                # Handle cases like "21 D. ..." or "45A. ..." or "20 . C"
                match = re.match(r'^(\d+)\s*\.?\s*([A-D])\.?\s*(.*)', line)
                if match:
                    q_num, opt, ans = match.groups()
                    if q_num in q_map:
                        q_id = q_map[q_num]
                        mark_text = f"Correct Option: {opt}\nExplanation: {ans}" if ans.strip() else f"Correct Option: {opt}"
                        res = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={"marking_scheme": mark_text})
                        if res.status_code == 204:
                            count += 1
                        
        print(f"Updated {count} MCQ solutions for {year}")
    except Exception as e:
        print(f"Error on {year}: {e}")
