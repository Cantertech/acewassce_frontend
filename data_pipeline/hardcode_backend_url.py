import os

files_to_update = [
    "src/pages/ExamResults.tsx",
    "src/pages/MCQExam.tsx",
    "src/pages/TheoryExam.tsx"
]

for fpath in files_to_update:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        old_pattern = "'http://localhost:8000'"
        new_pattern = "'https://acewassce-backend.onrender.com'"
        
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated default fallback backend URL in {fpath}")
        else:
            # Check for double quotes
            old_pattern_double = '"http://localhost:8000"'
            if old_pattern_double in content:
                content = content.replace(old_pattern_double, new_pattern)
                with open(fpath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Updated default fallback backend URL (double quotes) in {fpath}")
            else:
                print(f"⚠️ Pattern not found in {fpath}")
