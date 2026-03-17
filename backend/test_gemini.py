import requests
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv('GROQ_KEY_1')
print('Key loaded:', key[:10] if key else 'NONE')

url = 'https://api.groq.com/openai/v1/chat/completions'
payload = {
    'model': 'llama-3.3-70b-versatile',
    'messages': [{'role': 'user', 'content': 'What is 2+2? Reply with just the number.'}],
    'max_tokens': 64,
    'temperature': 0.1
}

response = requests.post(
    url,
    headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
    json=payload,
    timeout=30
)
print('Status:', response.status_code)
print('Response:', response.text[:500])