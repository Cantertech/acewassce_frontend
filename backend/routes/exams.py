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
async def grade_full_exam(attempt_id: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    """
    Triggers the full AI forensic grading workflow asynchronously using FastAPI BackgroundTasks.
    This guarantees execution is immune to Render 30s timeouts or client disconnect cancellation.
    """
    try:
        print(f"\n[HTTP POST] Triggering background AI grading task for attempt {attempt_id}...")
        # 1. Fetch theory submissions
        res = db.table("theory_submissions").select("*").eq("attempt_id", attempt_id).execute()
        submissions = res.data or []
        
        # 2. Add grading process to BackgroundTasks
        background_tasks.add_task(process_full_attempt_grading, attempt_id, submissions, db)
        print(f"[HTTP POST] AI grading successfully scheduled as BackgroundTask. Returning 202 instantly.")
        
        return {"status": "success", "message": "Grading started in background"}
    except Exception as e:
        print(f"Error in scheduling grade_full_exam: {str(e)}")
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
        attempt_res = db.table("exam_attempts").select("mcq_score, theory_score, exam_id").eq("id", attempt_id).execute()
        if not attempt_res.data:
            print(f"Aggregation Error: Attempt {attempt_id} not found in database.")
            return 0
        attempt_data = attempt_res.data[0]
        mcq_raw = attempt_data.get("mcq_score") or 0
        theory_raw = attempt_data.get("theory_score") or 0
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
    import traceback
    print("\n" + "="*80)
    print(f"[AI GRADER INFO] Starting forensic theory grading process for attempt_id: {attempt_id}")
    print(f"[AI GRADER INFO] Number of submissions loaded: {len(submissions)}")
    print("="*80)
    
    try:
        # 1. Fetch Attempt Metadata
        print(f"[AI GRADER DATABASE] Fetching metadata for attempt {attempt_id} from 'exam_attempts'...")
        attempt_res = db.table("exam_attempts").select("exam_id, status, mcq_completed_at").eq("id", attempt_id).execute()
        if not attempt_res.data:
            print(f"[AI GRADER ERROR] Attempt {attempt_id} was NOT found in 'exam_attempts' table!")
            raise ValueError(f"Attempt {attempt_id} not found in database.")
            
        attempt_data = attempt_res.data[0]
        exam_id = attempt_data.get("exam_id")
        current_status = attempt_data.get("status")
        mcq_completed_at = attempt_data.get("mcq_completed_at")
        print(f"[AI GRADER INFO] Current attempt status: '{current_status}'")
        print(f"[AI GRADER INFO] MCQ completed at: {mcq_completed_at}")
        
        # 2. Fetch Compulsory Count
        compulsory_count = 5
        if exam_id:
            print(f"[AI GRADER DATABASE] Fetching exam settings for exam_id: {exam_id}...")
            exam_res = db.table("exams").select("compulsory_questions").eq("id", exam_id).execute()
            if exam_res.data:
                compulsory_count = exam_res.data[0].get('compulsory_questions', 5)
        print(f"[AI GRADER INFO] Compulsory questions count: {compulsory_count}")
        
        # 3. Call AI Grader LangGraph Graph
        print(f"[AI GRADER AGENT] Invoking LangGraph AI Grader model workflow...")
        try:
            result = await run_grader(attempt_id=attempt_id, submissions=submissions)
            grading_results = result.get("grading_results", [])
            print(f"[AI GRADER AGENT] LangGraph execution returned {len(grading_results)} grading results.")
        except Exception as graph_err:
            print(f"[AI GRADER ERROR] Graph execution failed critically!")
            traceback.print_exc()
            raise graph_err
            
        # 4. Save and Update Results per Question
        part_a_score = 0
        part_b_scores = []
        
        for idx, res in enumerate(grading_results):
            try:
                q_num_str = str(res.get("question_number", ""))
                q_num = int(q_num_str) if q_num_str.isdigit() else 0
                raw_score = res.get("score", 0)
                score = int(round(float(raw_score))) if raw_score is not None else 0
                reasoning = res.get("summative_reasoning", "")
                
                print(f"[AI GRADER SAVE] Processing result {idx + 1}: Question {q_num_str} -> Score: {score}")
                
                saved = False
                
                # Step 1: Update existing row with matching question_number
                update_res = db.table("theory_submissions").update({
                    "marks_attained": score,
                    "feedback": reasoning
                }).eq("attempt_id", attempt_id).eq("question_number", q_num_str).execute()
                
                if update_res.data:
                    print(f"[AI GRADER DATABASE] Successfully updated existing theory_submission row for Q{q_num_str}")
                    saved = True
                
                # Step 2: Try NULL row adoption if not saved
                if not saved:
                    print(f"[AI GRADER DATABASE] No matching Q{q_num_str} row found. Checking for NULL/Unknown placeholder row...")
                    null_row = db.table("theory_submissions").select("id").eq("attempt_id", attempt_id).is_("question_number", "null").limit(1).execute()
                    if null_row.data:
                        target_id = null_row.data[0]["id"]
                        db.table("theory_submissions").update({
                            "marks_attained": score,
                            "feedback": reasoning,
                            "question_number": q_num_str
                        }).eq("id", target_id).execute()
                        print(f"[AI GRADER DATABASE] Successfully adopted NULL row {target_id} for Q{q_num_str}")
                        saved = True
                
                # Step 3: Insert new row if still not saved
                if not saved:
                    print(f"[AI GRADER DATABASE] No placeholder row found. Inserting a new theory_submission row for Q{q_num_str}...")
                    image_url = submissions[0].get("image_url") if submissions else None
                    db.table("theory_submissions").insert({
                        "attempt_id": attempt_id,
                        "question_number": q_num_str,
                        "marks_attained": score,
                        "feedback": reasoning,
                        "image_url": image_url
                    }).execute()
                    print(f"[AI GRADER DATABASE] Successfully inserted new row for Q{q_num_str}")

                if 1 <= q_num <= compulsory_count:
                    part_a_score += score
                    print(f"[AI GRADER SAVE] Question {q_num} is COMPULSORY (Part A). Cumulative Part A: {part_a_score}")
                else:
                    part_b_scores.append(score)
                    print(f"[AI GRADER SAVE] Question {q_num} is OPTIONAL (Part B). Optional scores so far: {part_b_scores}")
                    
            except Exception as item_err:
                print(f"[AI GRADER ERROR] Error saving question {res.get('question_number')}: {item_err}")
                traceback.print_exc()
                continue
        
        # 5. Calculate Final Scores
        print(f"[AI GRADER SCORE] Part A total score: {part_a_score}")
        part_b_scores.sort(reverse=True)
        # Select top 5 optional answers
        top_part_b = part_b_scores[:5]
        part_b_score = sum(top_part_b)
        print(f"[AI GRADER SCORE] Part B optional answers sorted: {part_b_scores}. Top 5 chosen: {top_part_b}. Part B Total: {part_b_score}")
        
        ai_theory_score = part_a_score + part_b_score
        print(f"[AI GRADER SCORE] Calculated overall AI Theory Score: {ai_theory_score} / 100")
        
        # 6. Determine status transition
        final_status = "theory_marked"
        if current_status == "mcq_marked" or mcq_completed_at:
            final_status = "graded"
        print(f"[AI GRADER STATUS] Attempt status transitioning from '{current_status}' -> '{final_status}'")
        
        # 7. Write to exam_attempts table
        print(f"[AI GRADER DATABASE] Writing final scores and status to 'exam_attempts'...")
        db.table("exam_attempts").update({
            "theory_score": ai_theory_score,
            "total_theory": 100,
            "theory_completed_at": datetime.utcnow().isoformat(),
            "status": final_status
        }).eq("id", attempt_id).execute()
        print(f"[AI GRADER DATABASE] Successfully updated 'exam_attempts' record.")
        
        # 8. Check for Grand Total Aggregation
        print(f"[AI GRADER DATABASE] Checking for companion MCQ responses to calculate grand total...")
        resp_res = db.table("exam_responses").select("id", count="exact").eq("attempt_id", attempt_id).execute()
        has_responses = (resp_res.count or 0) > 0
        print(f"[AI GRADER DATABASE] Companion exam_responses count: {resp_res.count}. Status: '{current_status}'")
        
        if has_responses or current_status == "mcq_marked" or mcq_completed_at:
            print(f"[AI GRADER SCORE] MCQ responses/completion detected. Running grand total score aggregation...")
            await aggregate_and_finalize_scores(attempt_id, db)
            print(f"[AI GRADER SCORE] Grand total aggregation completed.")
        else:
            print(f"[AI GRADER SCORE] MCQ not completed yet. Skipping grand total aggregation.")
            
        print("\n" + "="*80)
        print(f"[AI GRADER INFO] Forensics Theory Grading completed SUCCESSFULY for {attempt_id}!")
        print("="*80 + "\n")
        
    except Exception as e:
        print("\n" + "!"*80)
        print(f"[AI GRADER CRITICAL ERROR] Failed during process_full_attempt_grading for {attempt_id}!")
        print(f"Error Message: {e}")
        print("!"*80)
        traceback.print_exc()
        print("!"*80 + "\n")
        
        # Make sure the status is reverted to a clean error state rather than getting stuck
        try:
            print(f"[AI GRADER DATABASE] Reverting attempt {attempt_id} status to 'theory_failed' for client visibility...")
            db.table("exam_attempts").update({
                "status": "theory_failed"
            }).eq("id", attempt_id).execute()
        except Exception as db_err:
            print(f"[AI GRADER DATABASE] Revert status update failed: {db_err}")
            
        raise e

@router.post("/{attempt_id}/grade-mcq")
async def grade_mcq(attempt_id: str, db=Depends(get_db)):
    try:
        res = db.table("exam_responses").select("*").eq("attempt_id", attempt_id).execute()
        responses = res.data
        if not responses:
            return {"status": "success", "mcq_score": 0, "total_mcq": 0}

        attempt_res = db.table("exam_attempts").select("exam_id, status").eq("id", attempt_id).execute()
        if not attempt_res.data:
            raise HTTPException(status_code=404, detail=f"Attempt {attempt_id} not found")
        attempt_data = attempt_res.data[0]
        exam_id = attempt_data["exam_id"]
        current_status = attempt_data["status"]
        
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
            correct_opt_letter = ""
            trimmed_marking = marking.strip().upper()
            
            if trimmed_marking in ["A", "B", "C", "D"]:
                correct_opt_letter = trimmed_marking
            else:
                # 1. Try "Correct Option: X"
                match_co = re.search(r'(?i)Correct\s+Option:\s*([A-D])', marking)
                if match_co:
                    correct_opt_letter = match_co.group(1).upper()
                else:
                    # 2. Try "Equation: X ="
                    match_eq = re.search(r"Equation:\s*([A-D])\s*=", marking)
                    if match_eq:
                        correct_opt_letter = match_eq.group(1).upper()
                    else:
                        # 3. Try to find any letter A, B, C, D in the first 20 characters of marking
                        match_first = re.search(r'(?i)\b([A-D])\b', marking[:20])
                        if match_first:
                            correct_opt_letter = match_first.group(1).upper()

            correct_text = ""
            if correct_opt_letter:
                correct_text = next((opt["text"] for opt in options if opt["id"] == correct_opt_letter), "")

            if correct_text:
                if clean(student_choice) == clean(correct_text):
                    is_correct = True
            if not is_correct and correct_opt_letter:
                if clean(student_choice) == clean(correct_opt_letter):
                    is_correct = True
            if not is_correct and clean(marking) and clean(student_choice) == clean(marking):
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
