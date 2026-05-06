import base64, json, os, requests
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

load_dotenv(dotenv_path='data_pipeline/.env')
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

image_path = 'data_pipeline/raw_questions/2025 WASSCE MATHEMATICS CORE 1_page_12.jpg'

with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

class MCQOptions(BaseModel):
    options: list[str] # ["option A text", "option B text", "option C text", "option D text"]

print("Sending visual request to extract Q49 options...")
response = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are a professional math examiner. Look at the image containing Question 49. Extract the EXACT options A, B, C, and D for Question 49. Use standard LaTeX math notation for formatting."
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Extract the options A, B, C, D for Question 49 from this sheet."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_string}"}}
            ]
        }
    ],
    response_format=MCQOptions
)

print("Extracted Options:")
print(json.dumps(response.choices[0].message.parsed.options, indent=2))
