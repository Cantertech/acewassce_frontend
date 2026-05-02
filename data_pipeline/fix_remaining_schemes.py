"""
fix_remaining_schemes.py
------------------------
Only re-extracts schemes for pages that had issues (pages 5-12 covering Q6-Q13).
Q1-Q5 were already updated successfully.
"""
import os, json, re, glob, base64, asyncio
from supabase import create_client
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = "https://ytvtbogfuccvfqknqeou.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dnRib2dmdWNjdmZxa25xZW91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzI4Nzc3MywiZXhwIjoyMDkyODYzNzczfQ.0hLVgzE9ptelRATKbyL8cw_7eEjZYQXn42XB5U507s0"
EXAM_ID = "fd9c561c-f0f1-411d-aee7-75f2656f4904"
RAW_DIR = os.path.join(os.path.dirname(__file__), "raw_schemes")

# Only process pages that cover Q6-Q13 (pages 5-12)
TARGET_PAGES = [
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_5.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_6.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_7.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_8.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_9.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_10.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_11.jpg",
    "2025 WASSCE MATHEMATICS CORE 2 SOLUTION_page_12.jpg",
]

db = create_client(SUPABASE_URL, SUPABASE_KEY)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

q_res = db.table("questions").select("id, question_number").eq("exam_id", EXAM_ID).eq("is_mcq", False).execute()
q_map = {str(q["question_number"]): q["id"] for q in q_res.data}
print("Questions in DB:", sorted(q_map.keys()))


def extract_parent(qid):
    m = re.match(r"^(\d+)", str(qid).strip())
    return m.group(1) if m else None


def sanitize_json(raw):
    """Fix lone backslashes that break JSON parsing from LaTeX content."""
    return re.sub(r'(?<!\\)\\(?!["\\nrtbfu/])', r'\\\\', raw)


async def extract_scheme_from_image(image_path):
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    ext = image_path.lower().split(".")[-1]
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else "image/png"

    prompt = (
        "You are a Senior WAEC Marking Scheme Data Extractor.\n"
        "Read this official WAEC marking scheme image carefully.\n\n"
        "TASK: Extract EVERY question and sub-question found on this page.\n"
        "For each question or sub-question:\n"
        "  - Use its label as 'question_id' (e.g. '6', '6(a)', '6(b)(i)', '7', '8(a)')\n"
        "  - List EVERY marking step with: logic/description, expected equation/value, mark type (M1/A1/B1), marks awarded\n"
        "  - penalties must be a JSON array of objects: [{\"type\": \"ee\", \"description\": \"...\", \"deduction\": 1}]\n"
        "  - Record total_marks for each sub-question separately\n\n"
        "CRITICAL RULES:\n"
        "  - Do NOT skip sub-questions. Each (a), (b), (c), (i), (ii) must be its own entry.\n"
        "  - Use LaTeX in 'expected_equation' with $ delimiters.\n"
        "  - Write LaTeX backslashes as double: \\\\frac, \\\\sqrt, \\\\frac{1}{2} etc.\n"
        "  - If text is unclear write [unreadable].\n\n"
        "OUTPUT: Valid JSON only, no markdown fences:\n"
        "{\"schemes\": [{\"question_id\": \"6(a)\", \"total_marks\": 4, \"penalties\": [], "
        "\"steps\": [{\"step_order\": 1, \"expected_logic\": \"...\", \"expected_equation\": \"$...$\", "
        "\"mark_type\": \"M1\", \"marks_awarded\": 1}]}]}"
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
            ]
        }],
        max_tokens=4000
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    raw = sanitize_json(raw)
    return json.loads(raw)


def schemes_to_text(schemes_list):
    lines = []
    for s in schemes_list:
        qid = s.get("question_id", "?")
        total = s.get("total_marks", "?")
        lines.append("--- SUB-PART " + str(qid) + " (Marks: " + str(total) + ") ---")
        for step in s.get("steps", []):
            order = step.get("step_order", "")
            logic = step.get("expected_logic", "")
            eq = step.get("expected_equation", "")
            mtype = step.get("mark_type", "")
            mval = step.get("marks_awarded", "")
            lines.append("- Step " + str(order) + ": " + str(logic) + " | Eq: " + str(eq) + " | Mark: " + str(mtype) + "(" + str(mval) + ")")
        for p in s.get("penalties", []):
            if isinstance(p, dict):
                lines.append("  [PENALTY] " + str(p.get("type", "")) + ": -" + str(p.get("deduction", "")))
            else:
                lines.append("  [PENALTY] " + str(p))
        lines.append("")
    return "\n".join(lines)


async def main():
    grouped = {}

    for fname in TARGET_PAGES:
        fpath = os.path.join(RAW_DIR, fname)
        if not os.path.exists(fpath):
            print("NOT FOUND:", fname)
            continue
        print("Processing:", fname)
        try:
            data = await extract_scheme_from_image(fpath)
            schemes = data.get("schemes", [])
            print("  Extracted", len(schemes), "entries")
            for s in schemes:
                pn = extract_parent(s.get("question_id", ""))
                if pn and pn.isdigit():
                    grouped.setdefault(pn, []).append(s)
        except Exception as e:
            print("  ERROR on", fname + ":", e)

    print("\nGrouped questions:", sorted(grouped.keys()))

    updated = 0
    for qn, schemes in sorted(grouped.items(), key=lambda x: int(x[0])):
        qid = q_map.get(qn)
        if not qid:
            print("SKIP Q" + qn + ": not in DB")
            continue
        schemes_sorted = sorted(schemes, key=lambda s: str(s.get("question_id", "")))
        combined = schemes_to_text(schemes_sorted)
        total = sum(s.get("total_marks", 0) for s in schemes_sorted)
        print("OK Q" + qn + ": " + str(len(schemes_sorted)) + " sub-parts, " + str(total) + " marks -> saving...")

        out_path = os.path.join(os.path.dirname(__file__), "processed", "schemes", "repaired_Q" + qn + ".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"question_number": qn, "schemes": schemes_sorted, "combined_text": combined}, f, indent=2)

        db.table("questions").update({"marking_scheme": combined}).eq("id", qid).execute()
        updated += 1

    print("\nDone! Updated " + str(updated) + " questions (Q6-Q13).")


asyncio.run(main())
