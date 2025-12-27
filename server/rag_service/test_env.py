#!/usr/bin/env python3
"""Test .env loading"""

from pathlib import Path
from dotenv import load_dotenv
import os

# Simulate what main.py does
ENV_PATH = Path(__file__).resolve().parent / ".env"
print(f"ENV_PATH: {ENV_PATH}")
print(f"Exists: {ENV_PATH.exists()}")

if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH, override=True)
    print(f"[INFO] Loaded .env from: {ENV_PATH}")

# Check variables
EMBEDDING_PROVIDER_CONFIG = os.getenv("EMBEDDING_PROVIDER", "auto").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

print("")
print("=== VARIABLES ===")
print(f"EMBEDDING_PROVIDER_CONFIG: '{EMBEDDING_PROVIDER_CONFIG}'")
print(f"OPENAI_API_KEY: {'SET' if OPENAI_API_KEY else 'NOT SET'}")
if OPENAI_API_KEY:
    print(f"OPENAI_API_KEY length: {len(OPENAI_API_KEY)}")

# Determine provider
if EMBEDDING_PROVIDER_CONFIG == "auto":
    if OPENAI_API_KEY:
        EMBEDDING_PROVIDER = "openai"
    else:
        EMBEDDING_PROVIDER = "local"
elif EMBEDDING_PROVIDER_CONFIG in ["openai", "local"]:
    EMBEDDING_PROVIDER = EMBEDDING_PROVIDER_CONFIG
else:
    EMBEDDING_PROVIDER = "local"

print(f"EMBEDDING_PROVIDER: '{EMBEDDING_PROVIDER}'")

