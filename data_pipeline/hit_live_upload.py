import requests

url = "https://acewassce-backend.onrender.com/api/v1/attempts/9907bb36-7238-4dc7-b2f8-b1cb6a294de5/upload-working?is_general=true"

# Let's create a tiny dummy file to upload
files = {
    'file': ('test_image.jpg', b'dummy image content to simulate upload', 'image/jpeg')
}

print("--- Sending upload request to live Render backend ---")
try:
    response = requests.post(url, files=files, timeout=15)
    print("Status Code:", response.status_code)
    print("Response JSON/Text:", response.text)
except Exception as e:
    print("Request failed:", e)
