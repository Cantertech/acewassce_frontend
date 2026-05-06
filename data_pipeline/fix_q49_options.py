import os, requests, json
from dotenv import load_dotenv

load_dotenv(dotenv_path='data_pipeline/.env')
url = os.environ.get('SUPABASE_URL') + '/rest/v1/questions'
h = {
    'apikey': os.environ.get('SUPABASE_SERVICE_ROLE_KEY'), 
    'Authorization': 'Bearer ' + os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
}
exam_2025 = 'fd9c561c-f0f1-411d-aee7-75f2656f4904'

new_options = [
    {"id": "A", "text": "$\\frac{5p-q}{p-q}$"},
    {"id": "B", "text": "$\\frac{5p-q}{p+q}$"},
    {"id": "C", "text": "$\\frac{5p+q}{p-q}$"},
    {"id": "D", "text": "$\\frac{5p+q}{p+q}$"}
]

new_solution = (
    "Correct Option: B\n"
    "Explanation: To simplify the expression $\\frac{25p^{2} - q^{2}}{5p^{2} + 6pq + q^{2}}$, we factor both the numerator and the denominator step-by-step:\n\n"
    "1. **Factor the Numerator:**\n"
    "The numerator is a difference of two squares:\n"
    "$$25p^{2} - q^{2} = (5p)^{2} - q^{2} = (5p - q)(5p + q)$$\n\n"
    "2. **Factor the Denominator:**\n"
    "We can factor the quadratic expression $5p^{2} + 6pq + q^{2}$ by splitting the middle term:\n"
    "$$5p^{2} + 6pq + q^{2} = 5p^{2} + 5pq + pq + q^{2}$$\n"
    "$$= 5p(p + q) + q(p + q) = (5p + q)(p + q)$$\n\n"
    "3. **Simplify the Fraction:**\n"
    "Substitute the factored forms back into the fraction:\n"
    "$$\\frac{25p^{2} - q^{2}}{5p^{2} + 6pq + q^{2}} = \\frac{(5p - q)(5p + q)}{(5p + q)(p + q)}$$\n\n"
    "Cancel the common factor $(5p + q)$ from the numerator and denominator:\n"
    "$$= \\frac{5p - q}{p + q}$$\n\n"
    "This matches **Option B** perfectly."
)

print("--- Step 1: Updating Q49 in Supabase database ---")
# Get Q49 ID
r_get = requests.get(url, headers=h, params={
    'exam_id': f'eq.{exam_2025}',
    'is_mcq': 'eq.true',
    'question_number': 'eq.49',
    'select': 'id'
})

if r_get.status_code == 200 and r_get.json():
    q_id = r_get.json()[0]['id']
    r_patch = requests.patch(f"{url}?id=eq.{q_id}", headers=h, json={
        "options": new_options,
        "marking_scheme": new_solution
    })
    if r_patch.status_code == 204:
        print("✅ Successfully updated Q49 options and solutions in Supabase!")
    else:
        print("❌ Failed to patch Q49 in Supabase:", r_patch.text)
else:
    print("❌ Failed to fetch Q49 ID from Supabase:", r_get.text)


print("\n--- Step 2: Updating Q49 in local questions JSON ---")
local_q_path = 'data_pipeline/processed/questions/2025 WASSCE MATHEMATICS CORE 1_page_12.json'
if os.path.exists(local_q_path):
    with open(local_q_path, 'r', encoding='utf-8') as f:
        q_data = json.load(f)
        
    for q in q_data['questions']:
        if q['question_number'] == 49:
            q['options'] = new_options
            break
            
    with open(local_q_path, 'w', encoding='utf-8') as f:
        json.dump(q_data, f, indent=2, ensure_ascii=False)
    print("✅ Successfully updated local questions JSON file!")


print("\n--- Step 3: Updating Q49 in local solutions JSON ---")
local_sol_path = 'data_pipeline/processed/schemes_final/2025_WASSCE_CORE_MATHS_1_SOLUTIONS_LIVE.json'
if os.path.exists(local_sol_path):
    with open(local_sol_path, 'r', encoding='utf-8') as f:
        sol_data = json.load(f)
        
    for q in sol_data:
        if str(q['question_number']) == "49":
            q['options'] = new_options
            q['solution'] = new_solution
            break
            
    with open(local_sol_path, 'w', encoding='utf-8') as f:
        json.dump(sol_data, f, indent=2, ensure_ascii=False)
    print("✅ Successfully updated local solutions JSON file!")
