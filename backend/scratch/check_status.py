from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

res = sb.table('exam_attempts').select('id, status, mcq_completed_at, theory_completed_at, mcq_score, theory_score').order('start_time', desc=True).limit(5).execute()

for r in res.data:
    aid = r['id'][:12]
    status = r['status']
    mcq = bool(r.get('mcq_completed_at'))
    theory = bool(r.get('theory_completed_at'))
    mcq_s = r.get('mcq_score', '-')
    theory_s = r.get('theory_score', '-')
    print(f"{aid}... status={status:15s} mcq_done={mcq} theory_done={theory} mcq_score={mcq_s} theory_score={theory_s}")
