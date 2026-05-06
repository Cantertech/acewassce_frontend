import base64, os, requests
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(dotenv_path='data_pipeline/.env')
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

image_path = 'data_pipeline/raw_schemes/2025 WASSCE MATHEMATICS CORE 1 SOLUTION_page_1.jpg'

with open(image_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

print("Sending visual request to extract Q49 official key...")
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "You are a professional math grader. Look at the image containing the official MCQ answers for the 2025 exam. Extract the official key for Question 49 (usually a letter like A, B, C, or D)."
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What is the official correct option (A, B, C, or D) for Question 49?"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded_string}"}}
            ]
        }
    ]
)

print("Official Key Response for Q49:")
print(response.choices[0].message.content)
