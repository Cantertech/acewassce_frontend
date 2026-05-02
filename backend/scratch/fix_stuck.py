from supabase import create_client
import os
import asyncio
from dotenv import load_dotenv

load_dotenv()
sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

async def fix_stuck_attempts():
    res = sb.table('exam_attempts').select('id, status, mcq_completed_at, theory_completed_at, mcq_score, theory_score').neq('status', 'graded').execute()
    for r in res.data:
        if r.get('mcq_completed_at') and r.get('theory_completed_at'):
            print(f"Fixing attempt {r['id']}...")
            raw_grand_total = r.get('mcq_score', 0) + r.get('theory_score', 0)
            total_possible = 150
            final_percentage = round((raw_grand_total / total_possible) * 100) if total_possible > 0 else 0
            
            sb.table("exam_attempts").update({
                "status": "graded",
                "total_score": final_percentage
            }).eq("id", r['id']).execute()
            print(f"Fixed {r['id']}. Score: {final_percentage}%")

asyncio.run(fix_stuck_attempts())
