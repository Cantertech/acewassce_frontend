import asyncio
import os
import aiofiles
from extract import process_question_image

async def run_single():
    filename = "2025 WASSCE MATHEMATICS CORE 2_page_2.jpg"
    filepath = os.path.join("raw_questions", filename)
    print(f"Running extract on {filepath}")
    
    result = await process_question_image(filepath, filename, model="gpt-4o")
    
    if result:
        output_path = os.path.join("processed", "questions", "2025 WASSCE MATHEMATICS CORE 2_page_2.json")
        async with aiofiles.open(output_path, mode='w', encoding='utf-8') as f:
            await f.write(result.model_dump_json(indent=2))
        print("Success! Saved updated extraction.")
    else:
        print("Extraction failed.")

if __name__ == "__main__":
    asyncio.run(run_single())
