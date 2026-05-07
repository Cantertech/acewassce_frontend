import os, requests, json
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
exam_id = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

# Query exams table
r_exam = requests.get(f"{url}/exams", headers=h, params={'id': f'eq.{exam_id}'})
print("Exam in DB status:", r_exam.status_code)
if r_exam.status_code == 200:
    print("Exam data:")
    print(json.dumps(r_exam.json(), indent=2))
else:
    print("Exam error:", r_exam.text)
