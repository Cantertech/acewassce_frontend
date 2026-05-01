import os
import asyncio
import json
from pathlib import Path
from extract import process_question_image

async def test_single_extraction():
    script_dir = Path(__file__).parent
    raw_dir = script_dir / "raw_schemes"
    
    # Target the specific MCQ solution file requested
    target_image = "2025 WASSCE MATHEMATICS CORE 1 SOLUTION_page_1.jpg"
    image_path = raw_dir / target_image
    
    if not image_path.exists():
        print(f"File not found: {image_path}")
        return
    
    print(f"🚀 Extracting MCQ Answer Key from: {target_image}")
    
    from extract import process_mcq_solutions
    result = await process_mcq_solutions(str(image_path), target_image)
    
    if result:
        print("\n--- MCQ KEY EXTRACTION SUCCESSFUL ---")
        output = json.dumps(result.model_dump(), indent=2, ensure_ascii=False)
        output_file = script_dir / "sample_mcq_keys_output.json"
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Results saved to: {output_file}")
        
        # Also print sample of the 50 answers
        print(f"Captured {len(result.solutions)} answers.")
    else:
        print("\n--- EXTRACTION FAILED ---")

if __name__ == "__main__":
    asyncio.run(test_single_extraction())
