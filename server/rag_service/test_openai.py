#!/usr/bin/env python3
"""Test OpenAI API key"""

from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH, override=True)

key = os.getenv("OPENAI_API_KEY")
print(f"Key loaded: {'YES' if key else 'NO'}")
print(f"Key length: {len(key) if key else 0}")
print(f"Key starts with: {key[:7] if key else 'N/A'}")

if not key:
    print("❌ No API key found!")
    exit(1)

# Test OpenAI API
try:
    import openai
    print("\nTesting OpenAI API call...")
    client = openai.OpenAI(api_key=key)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input="test query"
    )
    print("SUCCESS: OpenAI API works!")
    print(f"   Embedding dimension: {len(response.data[0].embedding)}")
    print(f"   Model: {response.model}")
except Exception as e:
    print(f"ERROR: OpenAI API error: {e}")
    print(f"   Error type: {type(e).__name__}")
    import traceback
    traceback.print_exc()
    exit(1)

