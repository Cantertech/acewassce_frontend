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
            
        old_pattern = "const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://acewassce-backend.onrender.com';"
        new_pattern = "const backendUrl = 'https://acewassce-backend.onrender.com';"
        
        if old_pattern in content:
            content = content.replace(old_pattern, new_pattern)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Hardcoded production backend URL in {fpath}")
        else:
            # Check for double quotes or slightly different space patterns
            print(f"⚠️ Precise pattern not found in {fpath}. Attempting regex/alternate replacement.")
            # Let's replace any line containing import.meta.env.VITE_BACKEND_URL
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if "import.meta.env.VITE_BACKEND_URL" in line:
                    lines[i] = "      const backendUrl = 'https://acewassce-backend.onrender.com';" if "const backendUrl" in line else "const backendUrl = 'https://acewassce-backend.onrender.com';"
            content = '\n'.join(lines)
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Replaced VITE_BACKEND_URL lines in {fpath}")

# Update the local .env files as well for safety
env_path = '.env'
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        env_content = f.read()
    env_content = env_content.replace('VITE_BACKEND_URL=http://localhost:8000', 'VITE_BACKEND_URL=https://acewassce-backend.onrender.com')
    env_content = env_content.replace('BACKEND_URL=http://localhost:8000', 'BACKEND_URL=https://acewassce-backend.onrender.com')
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    print("✅ Updated root .env file backend URLs")
