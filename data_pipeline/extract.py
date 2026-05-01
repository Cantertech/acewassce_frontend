from __future__ import annotations
import os
import json
# ... (rest of imports)
import base64
import asyncio
import aiofiles
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 1. PYDANTIC MODELS ---

class Option(BaseModel):
    id: str  # A, B, C, or D
    text: str

class QuestionSchema(BaseModel):
    question_id: str  # year_subject_qNumber
    topic: str
    question_number: int
    question_text: str
    has_diagram: bool
    is_mcq: bool
    options: Optional[List[Option]] = None  # For MCQs: [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}]
    sub_questions: Optional[List['QuestionSchema']] = None # For theory: a), b), i), ii)

class Penalty(BaseModel):
    type: str
    description: str
    deduction: int

class MarkingStep(BaseModel):
    step_order: int
    expected_logic: str
    expected_equation: str
    mark_type: str  # M1, A1, B1
    marks_awarded: int

class SchemeSchema(BaseModel):
    question_id: str
    total_marks: int
    penalties: List[Penalty]
    steps: List[MarkingStep]

class PageQuestionsSchema(BaseModel):
    questions: List[QuestionSchema]

class PageSchemesSchema(BaseModel):
    schemes: List[SchemeSchema]

class MCQSolution(BaseModel):
    question_number: int
    correct_option: str  # A, B, C, or D
    explanation: Optional[str] = None

class MCQSchemeSchema(BaseModel):
    year: str
    subject: str
    solutions: List[MCQSolution]

# --- 2. UTILS ---

def encode_image(image_path: str):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

# --- 3. EXTRACTION FUNCTIONS ---

async def process_question_image(image_path: str, filename_context: str, model="gpt-4o-mini"):
    """
    Extracts structured question data from an image.
    """
    print(f"Processing Question: {image_path} with {model}")
    base64_image = encode_image(image_path)
    
    try:
        response = await client.beta.chat.completions.parse(
            model=model,
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are an expert WAEC data extractor. Read this math question image. "
                        "IMPORTANT: Extract EVERY SINGLE question found on this page into the 'questions' list. "
                        "NESTING RULE: If a question has sub-parts (like (a), (b), (i), (ii)), keep the main preamble as the parent 'question_text' "
                        "and NEST those sub-parts exactly as they appear into the 'sub_questions' list of that parent. "
                        "LATEX STRICT RULE 1: Use LaTeX for ALL mathematical expressions, equations, numbers, percentages, currency, and symbols. "
                        "LATEX STRICT RULE 2: EVERY SINGLE NUMBER or expression MUST be wrapped in '$' (e.g., '$16,800.00$', '$85\%$', '$125^{\circ}$', '$x = 5$'). Never leave math outside of '$'. "
                        "LATEX STRICT RULE 3: NEVER use '\(' or '\)' or '\[' or '\]' for math. Only use '$' and '$$'. "
                        "LATEX STRICT RULE 4: NEVER use the '\\text{}' command. Ever. DO NOT output '\\textdegree', use '^{\circ}' instead. "
                        "ANTI-HALLUCINATION RULE: If an image is blurry or unclear, type '[unreadable]' instead of looping text tokens. "
                        "1. Identify if each specific question is an MCQ or a Theory question. "
                        "2. If MCQ, extract all options into the 'options' list as objects with 'id' (e.g., 'A') and 'text'. "
                        "3. Extract the 'question_text' exactly, keeping formatting intact. "
                        "4. If a diagram exists for a question, describe it strictly under a [DIAGRAM] tag. "
                        "5. Use filename context for the 'question_id' (year_subject_qNumber)."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Filename Context: {filename_context}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            response_format=PageQuestionsSchema,
        )
        return response.choices[0].message.parsed
    except Exception as e:
        print(f"Error processing question {image_path}: {e}")
        return None

async def process_scheme_image(image_path: str, filename_context: str):
    """
    Extracts structured marking scheme data from an image.
    """
    print(f"Processing Scheme: {image_path}")
    base64_image = encode_image(image_path)
    
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": (
                    "You are an expert WAEC data extractor. Read this WAEC marking scheme image. "
                    "Extract EVERY SINGLE marking scheme entry for every question on this page into the 'schemes' list. "
                    "Map every step, equation, and mark (M1, A1, B1). "
                    "LATEX RULE: Use LaTeX for ALL mathematical expressions, equations, numbers, and symbols. Wrap them in '$' (e.g., '$\\frac{1}{2}$', '$GH₵ 22,580.60$', '$10\%$'). "
                    "ANTI-HALLUCINATION RULE: DO NOT generate nested '\\text{}' or '\\text{etc.}' loops. If text is unclear, write '[unreadable]' instead."
                )},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Filename Context: {filename_context}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            response_format=PageSchemesSchema,
        )
        return response.choices[0].message.parsed
    except Exception as e:
        print(f"Error processing scheme {image_path}: {e}")
        return None

async def process_mcq_solutions(image_path: str, filename_context: str):
    """
    Extracts a large list of MCQ answers from a table image.
    """
    print(f"Processing MCQ Solutions: {image_path}")
    base64_image = encode_image(image_path)
    
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a specialized OCR system for WAEC answer keys. "
                        "Read this MCQ solution table (usually contains answers 1-50). "
                        "Extract every question number and its corresponding correct option (A, B, C, or D). "
                        "If there is a brief explanation provided in the image, extract it too. "
                        "LATEX RULE: Use LaTeX for ALL mathematical expressions (e.g., '$x = 5$'). "
                        "CRITICAL: Use ONLY '$' and '$$' for math. DO NOT use '\(' or '\)'. DO NOT use '\\text{}'. DO NOT use '\\textdegree' (use '^{\circ}'). "
                        "ANTI-HALLUCINATION: NEVER endlessly repeat '\\text{}' or other tokens. If unclear, output [unreadable]. "
                        "Return a list of 'schemes'."
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Filename Context: {filename_context}. Extract all 50 answers if present."},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            response_format=MCQSchemeSchema,
        )
        return response.choices[0].message.parsed
    except Exception as e:
        print(f"Error processing MCQ solutions {image_path}: {e}")
        return None

# --- 4. BATCH RUNNER ---

async def run_batch_processing(folder_path, output_path, processor_func):
    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} does not exist.")
        return

    if not os.path.exists(output_path):
        os.makedirs(output_path)

    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    
    for filename in files:
        full_path = os.path.join(folder_path, filename)
        result = await processor_func(full_path, filename)
        
        if result:
            output_filename = os.path.splitext(filename)[0] + ".json"
            async with aiofiles.open(os.path.join(output_path, output_filename), mode='w', encoding='utf-8') as f:
                await f.write(result.model_dump_json(indent=2))
            print(f"Saved: {output_filename}")

async def main():
    script_dir = Path(__file__).parent
    
    # Process Questions
    await run_batch_processing(
        script_dir / "raw_questions", 
        script_dir / "processed" / "questions", 
        process_question_image
    )
    
    # Process Schemes
    await run_batch_processing(
        script_dir / "raw_schemes", 
        script_dir / "processed" / "schemes", 
        process_scheme_image
    )

if __name__ == "__main__":
    from pathlib import Path
    asyncio.run(main())
