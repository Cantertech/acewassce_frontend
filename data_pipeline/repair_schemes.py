import os, json, glob, re
from supabase import create_client

SUPABASE_URL = "https://ytvtbogfuccvfqknqeou.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
EXAM_ID = "fd9c561c-f0f1-411d-aee7-75f2656f4904"
SCHEMES_DIR = os.path.join(os.path.dirname(__file__), "processed", "schemes")

db = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load questions from DB
q_res = db.table("questions").select("id, question_number").eq("exam_id", EXAM_ID).eq("is_mcq", False).execute()
q_map = {str(q["question_number"]): q["id"] for q in q_res.data}
print("Questions in DB:", sorted(q_map.keys()))


def extract_parent(qid):
    m = re.match(r"^(\d+)", str(qid).strip())
    return m.group(1) if m else None


def scheme_to_text(s):
    qid = s.get("question_id", "?")
    total = s.get("total_marks", "?")
    lines = ["--- SUB-PART " + str(qid) + " (Marks: " + str(total) + ") ---"]
    for step in s.get("steps", []):
        order = step.get("step_order", "")
        logic = step.get("expected_logic", "")
        eq = step.get("expected_equation", "")
        mtype = step.get("mark_type", "")
        mval = step.get("marks_awarded", "")
        lines.append("- Step " + str(order) + ": " + logic + " | Eq: " + eq + " | Mark: " + str(mtype) + "(" + str(mval) + ")")
    for p in s.get("penalties", []):
        lines.append("  [PENALTY] " + p.get("type", "") + ": -" + str(p.get("deduction", "")))
    return "\n".join(lines)


# Group schemes by parent question number
grouped = {}
scheme_files = sorted(glob.glob(os.path.join(SCHEMES_DIR, "*CORE 2*.json")))
print("Found scheme files:", len(scheme_files))

for fpath in scheme_files:
    with open(fpath, "r", encoding="utf-8", errors="replace") as f:
        data = json.load(f)
    for s in data.get("schemes", []):
        pn = extract_parent(s.get("question_id", ""))
        if pn:
            if pn not in grouped:
                grouped[pn] = []
            grouped[pn].append(s)

print("Grouped question numbers:", sorted(grouped.keys()))

# Patch DB
updated = 0
for qn, schemes in sorted(grouped.items(), key=lambda x: int(x[0]) if x[0].isdigit() else 999):
    if not qn.isdigit():
        print("  SKIP non-numeric: " + qn)
        continue
    qid = q_map.get(qn)
    if not qid:
        print("  SKIP Q" + qn + ": not in DB")
        continue
    schemes_sorted = sorted(schemes, key=lambda s: str(s.get("question_id", "")))
    combined = "\n\n".join(scheme_to_text(s) for s in schemes_sorted)
    total = sum(s.get("total_marks", 0) for s in schemes_sorted)
    print("  OK Q" + qn + ": " + str(len(schemes_sorted)) + " sub-part(s), " + str(total) + " marks -> updating DB...")
    db.table("questions").update({"marking_scheme": combined}).eq("id", qid).execute()
    updated += 1

print("\nDone! Updated " + str(updated) + " questions.")
