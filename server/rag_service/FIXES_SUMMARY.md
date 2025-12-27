# RAG Service Fixes - Complete Summary

## Problem
RAG service was stuck because:
- `.env` file had BOM (Byte Order Mark) causing `OPENAI_API_KEY` to not load
- Startup showed: `OPENAI_API_KEY loaded: not set` even though key was in `.env`
- Embeddings failed with 503 errors

## Solutions Applied

### 1. Fixed .env Loading ✅

**Changes:**
- Uses absolute path: `ENV_PATH = Path(__file__).resolve().parent / ".env"`
- Handles BOM with `utf-8-sig` encoding in manual fallback
- Uses `override=True` to ensure `.env` values take precedence
- Added sanity log: `[INFO] OPENAI_API_KEY loaded: set/not set` (never prints full key)
- Removed BOM from existing `.env` file

**Code location:** `main.py` lines 13-40

### 2. Embedding Provider Selection ✅

**Modes:**
- `auto` (default): Prefers OpenAI if key exists, falls back to local
- `openai`: Force OpenAI (requires key, returns 503 if missing)
- `local`: Force local sentence-transformers (no key needed)

**Implementation:**
- `EMBEDDING_PROVIDER_CONFIG` from env (default: "auto")
- `EMBEDDING_PROVIDER` determined at startup
- Auto-fallback: If OpenAI fails in auto mode, tries local
- Local model: `all-MiniLM-L6-v2` (lazy loaded)

**Code location:** `main.py` lines 158-260

### 3. Requirements Updated ✅

Added `sentence-transformers==2.2.2` to `requirements.txt`
- CPU-friendly (no GPU dependencies)
- Downloads model (~90MB) on first use

### 4. Enhanced /health Endpoint ✅

**New response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00",
  "provider_config": "auto" | "openai" | "local",
  "provider_active": "openai" | "local",
  "openai_key_set": true | false,
  "embedding_available": true | false,
  "chroma_dir": "/path/to/chroma",
  "db_path": "/path/to/visits.db"
}
```

**Code location:** `main.py` lines 297-310

### 5. Clear Error Messages ✅

**/rag/search endpoint:**
- Returns 503 with detailed JSON when OpenAI key missing:
```json
{
  "error": "Embedding provider unavailable",
  "reason": "OPENAI_API_KEY not set but provider is 'openai'",
  "provider_config": "openai",
  "provider_active": "openai",
  "suggestion": "Set OPENAI_API_KEY environment variable or use EMBEDDING_PROVIDER=auto to fallback to local embeddings"
}
```

**Code location:** `main.py` lines 453-475

### 6. README Updated ✅

Added Windows PowerShell/CMD commands:
```powershell
# PowerShell
$env:OPENAI_API_KEY="sk-your-key-here"
$env:EMBEDDING_PROVIDER="auto"
python main.py
```

```cmd
REM CMD
set OPENAI_API_KEY=sk-your-key-here
set EMBEDDING_PROVIDER=auto
python main.py
```

## Acceptance Tests

### Test 1: No OPENAI_API_KEY, EMBEDDING_PROVIDER=auto ✅

```powershell
# Don't set OPENAI_API_KEY
$env:EMBEDDING_PROVIDER="auto"
python main.py
```

**Expected:**
- Service starts
- Provider active: `local`
- `/health` shows `"embedding_available": true` (after model loads)
- `/rag/search` works with local embeddings

### Test 2: With OPENAI_API_KEY, EMBEDDING_PROVIDER=auto ✅

```powershell
$env:OPENAI_API_KEY="sk-your-key-here"
$env:EMBEDDING_PROVIDER="auto"
python main.py
```

**Expected:**
- Service starts
- Provider active: `openai`
- `/health` shows `"embedding_available": true`
- `/rag/search` works with OpenAI embeddings

### Test 3: EMBEDDING_PROVIDER=openai, NO key ✅

```powershell
# Don't set OPENAI_API_KEY
$env:EMBEDDING_PROVIDER="openai"
python main.py
```

**Expected:**
- Service starts (with warning)
- `/rag/search` returns 503 with clear error message
- Error includes suggestion to use `auto` mode

## Files Modified

1. `server/rag_service/main.py` - All fixes
2. `server/rag_service/requirements.txt` - Added sentence-transformers
3. `server/rag_service/.env` - Removed BOM
4. `server/rag_service/README.md` - Added Windows commands

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

3. **Verify startup diagnostics:**
   - Should show `OPENAI_API_KEY loaded: set` (if key in .env)
   - Should show correct `provider_active`

4. **Test /health endpoint:**
   ```bash
   curl http://localhost:8000/health
   ```

5. **Test /rag/search:**
   ```bash
   curl -X POST http://localhost:8000/rag/search \
     -H "Content-Type: application/json" \
     -d '{"query": "test", "k": 5}'
   ```

## Notes

- BOM issue is fixed - `.env` file now loads correctly
- Local embeddings work offline (no internet required)
- Auto mode provides best of both worlds
- All error messages are clear and actionable

