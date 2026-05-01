from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query, Form
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid
import io
import re
from PIL import Image
from database import get_db
from ai_engine.agent import run_grader

router = APIRouter(prefix="/api/v1/attempts", tags=["Exam Attempts"])

class AttemptStartRequest(BaseModel):
    student_id: str
    exam_id: str

class AttemptResponse(BaseModel):
    id: str
    student_id: str
    exam_id: str
    start_time: datetime
    status: str

@router.post("/start", response_model=AttemptResponse)
async def start_attempt(request: AttemptStartRequest, db=Depends(get_db)):
    try:
        data = {
            "student_id": request.student_id,
            "exam_id": request.exam_id,
            "status": "in_progress",
            "start_time": datetime.utcnow().isoformat()
        }
        response = db.table("exam_attempts").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create attempt")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{attempt_id}/upload-working")
async def upload_working(
    attempt_id: str, 
    question_number: Optional[int] = Query(None), 
    is_general: str = Query("false"), 
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...), 
    db=Depends(get_db)
):
    try:
        file_extension = file.filename.split(".")[-1]
        is_gen_bool = is_general.lower() == "true"
        folder = "general" if is_gen_bool else str(question_number)
        file_name = f"{attempt_id}/{folder}/{uuid.uuid4()}.{file_extension}"
        
        raw_content = await file.read()
        try:
            img = Image.open(io.BytesIO(raw_content))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            max_size = 1200
            if img.width > max_size:
                ratio = max_size / float(img.width)
                new_height = int(float(img.height) * float(ratio))
                img = img.resize((max_size, new_height), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=70, optimize=True)
            optimized_content = buffer.getvalue()
        except Exception:
            optimized_content = raw_content

        db.storage.from_("wassce_workings").upload(
            path=file_name,
            file=optimized_content,
            file_options={"content-type": "image/jpeg"}
        )
        image_url = db.storage.from_("wassce_workings").get_public_url(file_name)
        
        theory_data = {
            "attempt_id": attempt_id,
            "question_number": question_number,
            "image_url": image_url,
            "is_general": is_gen_bool,
            "feedback": tags # Store manual tags here
        }
        db.table("theory_submissions").insert(theory_data).execute()
        return {"status": "success", "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{attempt_id}/grade")
async def grade_full_exam(attempt_id: str, db=Depends(get_db)):
    """
    Triggers the full AI forensic grading workflow (Synchronous to avoid cancellation).
    """
    try:
        # 1. Fetch theory submissions
        res = db.table("theory_submissions").select("*").eq("attempt_id", attempt_id).execute()
        submissions = res.data
        
        # 2. Run process synchronously
        await process_full_attempt_grading(attempt_id, submissions or [], db)
        
        return {"status": "success", "message": "Grading complete"}
    except Exception as e:
        print(f"Error in grade_full_exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{attempt_id}/theory-submissions")
async def get_theory_submissions(attempt_id: str, db=Depends(get_db)):
    """
    Proxy endpoint to fetch theory submissions bypassing RLS.
    """
    try:
        res = db.table("theory_submissions").select("*").eq("attempt_id", attempt_id).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def aggregate_and_finalize_scores(attempt_id: str, db):
    try:
        attempt_res = db.table("exam_attempts").select("mcq_score, theory_score, exam_id").eq("id", attempt_id).single().execute()
        mcq_raw = attempt_res.data.get("mcq_score") or 0
        theory_raw = attempt_res.data.get("theory_score") or 0
        raw_grand_total = mcq_raw + theory_raw
        
        total_possible = 150
        final_percentage = round((raw_grand_total / total_possible) * 100) if total_possible > 0 else 0
        
        db.table("exam_attempts").update({
            "status": "graded",
            "total_score": final_percentage,
            "end_time": datetime.utcnow().isoformat()
        }).eq("id", attempt_id).execute()
        return final_percentage
    except Exception as e:
        print(f"Aggregation Error: {e}")
        return 0

async def process_full_attempt_grading(attempt_id: str, submissions: List[dict], db):
    try:
        attempt_res = db.table("exam_attempts").select("exam_id, status").eq("id", attempt_id).single().execute()
        exam_id = attempt_res.data.get("exam_id")
        current_status = attempt_res.data.get("status")
        
        exam_res = db.table("exams").select("compulsory_questions").eq("id", exam_id).single().execute()
        compulsory_count = exam_res.data.get('compulsory_questions', 5)
        
        result = await run_grader(attempt_id=attempt_id, submissions=submissions)
        grading_results = result.get("grading_results", [])
        
        part_a_score = 0
        part_b_scores = []
        for res in grading_results:
            try:
                q_num_str = str(res.get("question_number", ""))
                q_num = int(q_num_str) if q_num_str.isdigit() else 0
                score = res.get("score", 0)
                reasoning = res.get("summative_reasoning", "")
                
                # IMPROVED UPDATE LOGIC:
                saved = False
                
                # 1. Try to update a row that explicitly has this question_number
                update_res = db.table("theory_submissions").update({
                    "marks_attained": score,
                    "feedback": reasoning
                }).eq("attempt_id", attempt_id).eq("question_number", q_num_str).execute()
                
                if update_res.data:
                    saved = True

                # 2. If no rows updated, try to find a NULL row to "adopt" this question
                if not saved:
                    null_row = db.table("theory_submissions").select("id").eq("attempt_id", attempt_id).is_("question_number", "null").limit(1).execute()
                    if null_row.data:
                        target_id = null_row.data[0]["id"]
                        db.table("theory_submissions").update({
                            "marks_attained": score,
                            "feedback": reasoning,
                            "question_number": q_num_str
                        }).eq("id", target_id).execute()
                        saved = True
                
                # 3. If STILL no rows (all filled or none exist), INSERT a new row
                if not saved:
                    # Find an image URL from existing submissions to link to
                    image_url = submissions[0].get("image_url") if submissions else None
                    db.table("theory_submissions").insert({
                        "attempt_id": attempt_id,
                        "question_number": q_num_str,
                        "marks_attained": score,
                        "feedback": reasoning,
                        "image_url": image_url
                    }).execute()

                if 1 <= q_num <= compulsory_count:
                    part_a_score += score
                else:
                    part_b_scores.append(score)
                    
            except Exception as e:
                print(f"Error saving question {res.get('question_number')}: {e}")
                continue
        
        part_b_scores.sort(reverse=True)
        part_b_score = sum(part_b_scores[:5])
        ai_theory_score = part_a_score + part_b_score
        
        print(f"Final Aggregated Score: {ai_theory_score}")
        
        db.table("exam_attempts").update({
            "theory_score": ai_theory_score,
            "total_theory": 100,
            "theory_completed_at": datetime.utcnow().isoformat(),
            "status": "theory_marked" if current_status != "mcq_marked" else "graded"
        }).eq("id", attempt_id).execute()
        
        resp_res = db.table("exam_responses").select("id", count="exact").eq("attempt_id", attempt_id).execute()
        if (resp_res.count or 0) > 0 or current_status == "mcq_marked":
            await aggregate_and_finalize_scores(attempt_id, db)
    except Exception as e:
        print(f"Theory Grading Error: {e}")

@router.post("/{attempt_id}/grade-mcq")
async def grade_mcq(attempt_id: str, db=Depends(get_db)):
    try:
        res = db.table("exam_responses").select("*").eq("attempt_id", attempt_id).execute()
        responses = res.data
        if not responses:
            return {"status": "success", "mcq_score": 0, "total_mcq": 0}

        attempt_res = db.table("exam_attempts").select("exam_id, status").eq("id", attempt_id).single().execute()
        exam_id = attempt_res.data["exam_id"]
        current_status = attempt_res.data["status"]
        
        q_res = db.table("questions").select("id, marking_scheme, question_number, options").eq("exam_id", exam_id).eq("is_mcq", True).execute()
        questions_map = {q["id"]: q for q in q_res.data}

        score = 0
        wrong_numbers = []

        def clean(text): return re.sub(r'[\$\s,\\]', '', str(text)).lower()

        for resp in responses:
            q_id = resp["question_id"]
            student_choice = resp["selected_option"]
            q_data = questions_map.get(q_id, {})
            marking = q_data.get("marking_scheme") or ""
            q_num = q_data.get("question_number", "Unknown")
            options = q_data.get("options") or []

            is_correct = False
            c_marking = clean(marking)
            correct_text = ""
            trimmed_marking = marking.strip().upper()
            if trimmed_marking in ["A", "B", "C", "D"]:
                correct_text = next((opt["text"] for opt in options if opt["id"] == trimmed_marking), "")
            else:
                match = re.search(r"Equation:\s*([A-D])\s*=", marking)
                if match:
                    correct_text = next((opt["text"] for opt in options if opt["id"] == match.group(1)), "")
            
            if correct_text:
                if clean(student_choice) == clean(correct_text):
                    is_correct = True
            if not is_correct and len(student_choice) == 1 and student_choice in "ABCD":
                if student_choice == trimmed_marking:
                    is_correct = True
            if not is_correct and c_marking and clean(student_choice) == c_marking:
                is_correct = True

            if is_correct:
                score += 1
            else:
                wrong_numbers.append(str(q_num))
        
        db.table("exam_attempts").update({
            "mcq_score": score,
            "total_mcq": len(q_res.data),
            "mcq_completed_at": datetime.utcnow().isoformat(),
            "wrong_mcq_numbers": wrong_numbers,
            "status": "mcq_marked" if current_status != "theory_marked" else "graded"
        }).eq("id", attempt_id).execute()

        theory_res = db.table("theory_submissions").select("id", count="exact").eq("attempt_id", attempt_id).execute()
        if (theory_res.count or 0) > 0 or current_status == "theory_marked":
            final_percent = await aggregate_and_finalize_scores(attempt_id, db)
            return {"status": "success", "mcq_score": score, "total_mcq": len(q_res.data), "final_percent": final_percent}
        return {"status": "success", "mcq_score": score, "total_mcq": len(q_res.data)}
    except Exception as e:
        print(f"ERROR grading MCQs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
