import requests
import random
import time

# --- 1. CONFIGURATION ---
FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSd7jnUlK7vSv2H-I5814xGu98KdtONGUgq7eKdHEVLjtILiMQ/formResponse"

ENTRY_IDS = {
    'age': 'entry.1285485723',
    'occupation': 'entry.962466137',
    'screened_before': 'entry.1611808797',
    'reason_no': 'entry.1094187296',
    'diet_confidence': 'entry.1875896279',
    'likely_to_try': 'entry.661301105',
    'prefer_home': 'entry.175166060',
    'willing_to_pay': 'entry.1975465367'
}

# --- 2. STATISTICAL DISTRIBUTIONS ---
age_data = {
    'choices': ['18-25', '26-35', '36-45'],
    'weights': [80, 16, 4]
}

occupation_data = {
    'choices': ['Student', 'Employed', 'Self-employed', 'Unemployed'],
    'weights': [85, 7, 6, 2]
}

screened_data = {
    'choices': ['No', 'Yes'],
    'weights': [92, 8]
}

reason_no_data = {
    'choices': [
        'I feel fine/have no symptoms',
        'Long hospital queues and wait times',
        'I feel fine/have no symptoms;High cost of testing',
        'I feel fine/have no symptoms;High cost of testing;Long hospital queues and wait times',
        'Other',
        'High cost of testing',
        'I feel fine/have no symptoms;Long hospital queues and wait times;Other',
        'High cost of testing;Long hospital queues and wait times',
        'Fear of invasive blood draws/needles'
    ],
    'weights': [42, 12, 10, 10, 8, 6, 4, 4, 4]
}

diet_data = {
    'choices': ['Somewhat confident', 'Not confident at all', 'Very confident', "I don't know"],
    'weights': [35, 28, 22, 15]
}

likely_data = {
    'choices': ['Very likely', 'Somewhat likely', 'Neutral', 'Unlikely'],
    'weights': [65, 26, 7, 2]
}

prefer_data = {
    'choices': ['Strongly prefer home', 'Somewhat prefer home', 'Neutral', 'Prefer clinic'],
    'weights': [54, 20, 15, 11]
}

pay_data = {
    'choices': ['GHS 10 - GHS 15', 'GHS 15 - GHS 25', 'More than GHS 25', 'Less than GHS 10'],
    'weights': [36, 34, 25, 5]
}

def generate_response():
    """Generates a single form response based on the dataset probabilities."""
    screened = random.choices(screened_data['choices'], weights=screened_data['weights'])[0]
    
    form_data = {
        ENTRY_IDS['age']: random.choices(age_data['choices'], weights=age_data['weights'])[0],
        ENTRY_IDS['occupation']: random.choices(occupation_data['choices'], weights=occupation_data['weights'])[0],
        ENTRY_IDS['screened_before']: screened,
        ENTRY_IDS['diet_confidence']: random.choices(diet_data['choices'], weights=diet_data['weights'])[0],
        ENTRY_IDS['likely_to_try']: random.choices(likely_data['choices'], weights=likely_data['weights'])[0],
        ENTRY_IDS['prefer_home']: random.choices(prefer_data['choices'], weights=prefer_data['weights'])[0],
        ENTRY_IDS['willing_to_pay']: random.choices(pay_data['choices'], weights=pay_data['weights'])[0]
    }

    # Only answer "Reason if No" if they actually haven't been screened
    if screened == 'No':
        reason = random.choices(reason_no_data['choices'], weights=reason_no_data['weights'])[0]
        # Split by semicolon so checkboxes are submitted as a list of individual items
        form_data[ENTRY_IDS['reason_no']] = reason.split(';')

    return form_data

# --- 3. SUBMISSION LOOP ---
submissions_needed = 237
successful_submissions = 0

print(f"Starting {submissions_needed} automated submissions...")

for i in range(submissions_needed):
    form_data = generate_response()

    try:
        response = requests.post(FORM_URL, data=form_data)
        if response.status_code == 200:
            successful_submissions += 1
            print(f"[{successful_submissions}/{submissions_needed}] Submission successful.")
        else:
            print(f"Failed submission {i+1}. Status code: {response.status_code}")
        
        # Random delay between 1.5 and 3.5 seconds to mimic human timing
        time.sleep(random.uniform(1.5, 3.5))
        
    except Exception as e:
        print(f"Error on submission {i+1}: {e}")

print("Automation complete! Check your Google Form responses to confirm.")