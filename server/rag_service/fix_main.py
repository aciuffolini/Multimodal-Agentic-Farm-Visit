from pathlib import Path
main_py = Path("main.py")
content = main_py.read_text(encoding="utf-8")
# Apply fixes here - simplified version
print("[INFO] Applying fixes...")
# Add startup diagnostics after EMBEDDING_PROVIDER
if "Startup Diagnostics" not in content:
    diagnostics = "\n# Startup diagnostics\ndef _redact_key(key):\n    if not key: return \"not set\"\n    if len(key) <= 8: return \"***\"\n    return f\"{key[:4]}...{key[-4:]}\"\n\nprint(\"=\" * 60)\nprint(\"[INFO] RAG Service Startup Diagnostics\")\nprint(\"=\" * 60)\nprint(f\"[INFO] Embedding provider: {EMBEDDING_PROVIDER}\")\nprint(f\"[INFO] OPENAI_API_KEY loaded: {_redact_key(OPENAI_API_KEY)}\")\nprint(f\"[INFO] DATA_DIR: {DATA_DIR.resolve()}\")\nif not OPENAI_API_KEY:\n    print(\"[WARNING] OPENAI_API_KEY not set - embeddings will fail!\")\nprint(\"=\" * 60)\n"
    content = content.replace("OPENAI_API_KEY = os.getenv(\"OPENAI_API_KEY\")\n\ndef get_embedding", "OPENAI_API_KEY = os.getenv(\"OPENAI_API_KEY\")" + diagnostics + "\ndef get_embedding")
    main_py.write_text(content, encoding="utf-8")
    print("[OK] Fixes applied")
else:
    print("[OK] Fixes already applied")
