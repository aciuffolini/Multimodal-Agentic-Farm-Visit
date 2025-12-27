# RAG Service Fixes Applied

## Summary

Fixed environment variable loading and added robust fallback embedding provider to ensure RAG service works even without OpenAI API key.

## Changes Made

### 1. Fixed .env Loading (main.py)

**Before:**
- Used relative path `Path(__file__).parent / '.env'` which could fail depending on working directory
- No confirmation message when .env loaded

**After:**
- Uses absolute path: `ENV_PATH = Path(__file__).resolve().parent / ".env"`
- Prints confirmation: `[INFO] Loaded .env from: {ENV_PATH}`
- Works regardless of working directory

### 2. Added Fallback Embedding Provider

**New Features:**
- **Auto mode** (`EMBEDDING_PROVIDER=auto`): Prefers OpenAI if key exists, falls back to local
- **Local provider** (`EMBEDDING_PROVIDER=local`): Uses `sentence-transformers` with `all-MiniLM-L6-v2` model
- **Lazy loading**: Local model only loads when needed
- **Automatic fallback**: If OpenAI fails in auto mode, automatically tries local

**Implementation:**
- `_get_local_embedder()`: Lazy loads sentence-transformers model
- `_get_local_embedding(text)`: Generates embeddings using local model
- `get_embedding(text)`: Updated to support all three modes (auto/openai/local)

### 3. Enhanced Startup Diagnostics

**New Output:**
```
============================================================
[INFO] RAG Service Startup Diagnostics
============================================================
[INFO] Embedding provider config: auto
[INFO] Embedding provider active: openai | local
[INFO] OPENAI_API_KEY loaded: sk-i...fj  (redacted, never full key)
[INFO] DATA_DIR: C:\...\data
[INFO] DB_PATH: C:\...\data\visits.db
[INFO] CHROMA_DIR: C:\...\data\chroma
[INFO] Local embedding model ready  (if using local)
============================================================
```

### 4. Updated /health Endpoint

**New Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00",
  "embedding_provider": "openai" | "local",
  "embedding_available": true | false,
  "openai_key_set": true | false
}
```

### 5. Updated Requirements

Added `sentence-transformers==2.2.2` to `requirements.txt`

### 6. Comprehensive README

Added:
- Windows PowerShell/CMD instructions
- `.env` file configuration guide
- Troubleshooting section
- Acceptance test scenarios
- Architecture notes

## Files Modified

1. `server/rag_service/main.py` - Core fixes
2. `server/rag_service/requirements.txt` - Added sentence-transformers
3. `server/rag_service/README.md` - Complete runbook

## Testing

### Test 1: Without OPENAI_API_KEY

```powershell
cd server/rag_service
# Don't set OPENAI_API_KEY
python main.py
```

**Expected:**
- Service starts
- Uses local embeddings
- `/health` shows `"embedding_provider": "local"` and `"embedding_available": true`
- `/rag/search` works

### Test 2: With OPENAI_API_KEY

```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
python main.py
```

**Expected:**
- Service starts
- Uses OpenAI embeddings
- `/health` shows `"embedding_provider": "openai"` and `"embedding_available": true`
- `/rag/search` works

### Test 3: Auto Mode

```powershell
$env:EMBEDDING_PROVIDER="auto"
# With key -> uses OpenAI
# Without key -> uses local
```

## Next Steps

1. **Install sentence-transformers:**
   ```bash
   pip install sentence-transformers
   ```

2. **Restart RAG service:**
   ```powershell
   cd server/rag_service
   python main.py
   ```

3. **Verify startup diagnostics show correct provider**

4. **Test `/health` endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```

5. **Test search with local embeddings:**
   ```bash
   curl -X POST http://localhost:8000/rag/search \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "k": 5}'
   ```

## Notes

- Local embeddings work offline (no internet required)
- Model downloads automatically on first use (~90MB)
- OpenAI embeddings are higher quality but require API key
- Auto mode provides best of both worlds

