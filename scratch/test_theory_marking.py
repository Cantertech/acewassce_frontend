import os, sys, asyncio
sys.path.append(os.path.abspath('backend'))

from database import get_db
from routes.exams import process_full_attempt_grading

async def main():
    attempt_id = '659d65d2-df99-4dc2-96ac-1b0fe0dc12b2'
    db = get_db()
    
    print("--- FETCHING SUBMISSIONS ---")
    res = db.table("theory_submissions").select("*").eq("attempt_id", attempt_id).execute()
    submissions = res.data
    print(f"Found {len(submissions)} submissions")
    
    print("\n--- RUNNING THEORY GRADING PIPELINE ---")
    try:
        await process_full_attempt_grading(attempt_id, submissions, db)
        print("Done running process_full_attempt_grading.")
    except Exception as e:
        print("MAIN EXCEPTION CAUGHT:", e)

if __name__ == "__main__":
    asyncio.run(main())
