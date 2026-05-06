import os, requests, json
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

r = requests.get(url, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'is_mcq': 'eq.true',
    'question_number': 'eq.3',
    'select': 'id,question_number,question_text,options,marking_scheme'
})

if r.status_code == 200:
    print(json.dumps(r.json(), indent=2))
else:
    print("Error:", r.text)
