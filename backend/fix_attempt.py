import asyncio
from database import get_db
from routes.exams import aggregate_and_finalize_scores, process_full_attempt_grading, grade_mcq

async def fix_attempt(attempt_id):
    db = get_db()
    print(f"Fixing attempt: {attempt_id}")
    
    # 1. Regrade MCQs (Smarter Logic)
    print("Regrading MCQs...")
    await grade_mcq(attempt_id, db)
    
    # 2. Fetch submissions for Theory
    res = db.table("theory_submissions").select("*").eq("attempt_id", attempt_id).execute()
    submissions = res.data
    
    if submissions:
        print("Re-launching Theory grading pipeline...")
        await process_full_attempt_grading(attempt_id, submissions, db)
    else:
        print("No theory submissions found. Finalizing with MCQs only.")
        await aggregate_and_finalize_scores(attempt_id, db)
        
    print("\n--- FIX COMPLETE! ---")
    print("Please refresh your results page now.")

if __name__ == "__main__":
    import sys
    target_id = "5db91d24-6bdc-49f6-8b4c-ce21fb4e1866" # User's current attempt
    asyncio.run(fix_attempt(target_id))
