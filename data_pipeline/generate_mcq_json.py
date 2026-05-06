import os, fitz, re, json
from dotenv import load_dotenv

pdf_files = {
    '2021': {
        'path': 'data_pipeline/main_pdfs/solutions/Core_mathematics/2021/mcqs/2021 WASSCE MATHEMATICS PAPER 1 OBJECTIVE SOLUTION.pdf',
        'out': 'data_pipeline/processed/schemes/2021 WASSCE MATHEMATICS PAPER 1 OBJECTIVE SOLUTION.json',
        'subject': 'WASSCE Core Maths'
    },
    '2024': {
        'path': 'data_pipeline/main_pdfs/solutions/Core_mathematics/2024/mcqs/2024 WASSCE CORE MATHS 1 SOLUTION.pdf',
        'out': 'data_pipeline/processed/schemes/2024 WASSCE CORE MATHS 1 SOLUTION.json',
        'subject': 'WASSCE Core Maths'
    }
}

for year, data in pdf_files.items():
    try:
        doc = fitz.open(data['path'])
        solutions = []
        for i in range(len(doc)):
            text = doc[i].get_text()
            for line in text.split('\n'):
                line = line.strip()
                if not line: continue
                match = re.match(r'^(\d+)\s*\.?\s*([A-D])\.?\s*(.*)', line)
                if match:
                    q_num, opt, ans = match.groups()
                    solutions.append({
                        "question_number": int(q_num),
                        "correct_option": opt,
                        "explanation": ans.strip() if ans.strip() else None
                    })
        
        output_data = {
            "year": year,
            "subject": data['subject'],
            "solutions": solutions
        }
        
        with open(data['out'], 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)
            
        print(f"Generated JSON for {year} with {len(solutions)} solutions.")
    except Exception as e:
        print(f"Error on {year}: {e}")
