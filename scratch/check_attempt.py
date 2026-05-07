import os, requests, json
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
attempt_id = '659d65d2-df99-4dc2-96ac-1b0fe0dc12b2'

# Query exam_attempts
r_attempt = requests.get(f"{url}/exam_attempts", headers=h, params={'id': f'eq.{attempt_id}'})
print("Attempt in DB status:", r_attempt.status_code)
if r_attempt.status_code == 200:
    print("Attempt data:")
    print(json.dumps(r_attempt.json(), indent=2))
else:
    print("Attempt error:", r_attempt.text)

# Query theory_submissions
r_subs = requests.get(f"{url}/theory_submissions", headers=h, params={'attempt_id': f'eq.{attempt_id}'})
print("Submissions in DB status:", r_subs.status_code)
if r_subs.status_code == 200:
    print("Submissions data:")
    print(json.dumps(r_subs.json(), indent=2))
else:
    print("Submissions error:", r_subs.text)
