from database import get_db

db = get_db()
res = db.table("theory_submissions").select("*").limit(10).execute()
print(f"Total Rows in theory_submissions: {len(res.data)}")
for row in res.data:
    print(f"ID: {row['id']} | Attempt: {row['attempt_id']} | Question: {row['question_number']} | URL: {row['image_url'][:50]}...")
