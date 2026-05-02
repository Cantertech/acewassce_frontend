"""
reextract_schemes.py
--------------------
Re-runs AI extraction on all raw CORE 2 scheme images with an improved prompt
that captures every sub-question and all steps, then patches the DB directly.

Run from the data_pipeline folder:
    python reextract_schemes.py
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

db = create_client(SUPABASE_URL, SUPABASE_KEY)
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load question map from DB
q_res = db.table("questions").select("id, question_number").eq("exam_id", EXAM_ID).eq("is_mcq", False).execute()
q_map = {str(q["question_number"]): q["id"] for q in q_res.data}
print("Questions:", sorted(q_map.keys()))


def extract_parent(qid):
    m = re.match(r"^(\d+)", str(qid).strip())
    return m.group(1) if m else None


async def extract_scheme_from_image(image_path):
    """Call GPT-4o (not mini) with a detailed prompt to extract the full marking scheme."""
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
        "  - List EVERY marking step with: the logic/description, the expected equation or value, the mark type (M1, A1, B1, B2 etc), and marks awarded\n"
        "  - Include penalties (e.g. 'ee' half mark deductions)\n"
        "  - Record total_marks for each sub-question separately\n\n"
        "CRITICAL RULES:\n"
        "  - Do NOT skip any sub-questions. Each (a), (b), (c), (i), (ii) must be its own entry.\n"
        "  - Use LaTeX in 'expected_equation' fields with $ delimiters.\n"
        "  - IMPORTANT: In JSON strings, write LaTeX backslashes as double backslash (\\\\frac, \\\\sqrt etc).\n"
        "  - If text is unclear, write [unreadable] rather than guessing.\n"
        "  - penalties must be a list of objects: [{\"type\": \"ee\", \"description\": \"...\", \"deduction\": 1}]\n\n"
        "OUTPUT FORMAT (JSON only, no markdown fences):\n"
        "{\n"
        "  \"schemes\": [\n"
        "    {\n"
        "      \"question_id\": \"6(a)\",\n"
        "      \"total_marks\": 4,\n"
        "      \"penalties\": [],\n"
        "      \"steps\": [\n"
        "        {\"step_order\": 1, \"expected_logic\": \"...\", \"expected_equation\": \"$...$\", \"mark_type\": \"M1\", \"marks_awarded\": 1}\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}}
                ]
            }
        ],
        max_tokens=4000
    )
    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    # Sanitize lone backslashes that break JSON parsing (LaTeX in strings)
    import re as _re
    raw = _re.sub(r'(?<!\\)\\(?!["\\nrtbfu/])', r'\\\\', raw)
    return json.loads(raw)


def schemes_to_text(schemes_for_question):
    """Build a human-readable marking scheme text from a list of scheme objects."""
    lines = []
    for s in schemes_for_question:
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
            # penalties may be a dict or a plain string
            if isinstance(p, dict):
                lines.append("  [PENALTY] " + p.get("type", "") + ": -" + str(p.get("deduction", "")))
            else:
                lines.append("  [PENALTY] " + str(p))
        lines.append("")
    return "\n".join(lines)


async def main():
    raw_files = sorted(glob.glob(os.path.join(RAW_DIR, "*CORE 2*.jpg")))
    print("Found raw images:", len(raw_files))

    # Accumulate all schemes grouped by parent question number
    grouped = {}

    for fpath in raw_files:
        fname = os.path.basename(fpath)
        print("\nProcessing:", fname)
        try:
            data = await extract_scheme_from_image(fpath)
            schemes = data.get("schemes", [])
            print("  Extracted", len(schemes), "scheme entries")
            for s in schemes:
                pn = extract_parent(s.get("question_id", ""))
                if pn and pn.isdigit():
                    if pn not in grouped:
                        grouped[pn] = []
                    grouped[pn].append(s)
        except Exception as e:
            print("  ERROR:", e)

    print("\nGrouped questions:", sorted(grouped.keys()))

    # Patch DB
    updated = 0
    for qn, schemes in sorted(grouped.items(), key=lambda x: int(x[0])):
        qid = q_map.get(qn)
        if not qid:
            print("SKIP Q" + qn + ": not in DB")
            continue
        schemes_sorted = sorted(schemes, key=lambda s: str(s.get("question_id", "")))
        combined = schemes_to_text(schemes_sorted)
        total = sum(s.get("total_marks", 0) for s in schemes_sorted)
        print("OK Q" + qn + ": " + str(len(schemes_sorted)) + " sub-parts, " + str(total) + " total marks -> saving to DB")

        # Also save to a local JSON for reference
        out_path = os.path.join(os.path.dirname(__file__), "processed", "schemes", "repaired_Q" + qn + ".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"question_number": qn, "schemes": schemes_sorted, "combined_text": combined}, f, indent=2)

        db.table("questions").update({"marking_scheme": combined}).eq("id", qid).execute()
        updated += 1

    print("\nDone! Updated", updated, "questions.")

asyncio.run(main())
