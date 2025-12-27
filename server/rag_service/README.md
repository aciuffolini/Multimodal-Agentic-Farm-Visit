# Farm Visit RAG Service

Local Python service for semantic search and record management with ChromaDB persistence.

## Quick Start

### 1. Install Dependencies

```bash
cd server/rag_service
pip install -r requirements.txt
```

**Note:** `sentence-transformers` will download the `all-MiniLM-L6-v2` model (~90MB) on first use if OpenAI API key is not available.

### 2. Configure Environment Variables

#### Option A: Using `.env` file (Recommended)

Create `server/rag_service/.env`:

```env
OPENAI_API_KEY=sk-your-key-here
EMBEDDING_PROVIDER=auto
DATA_DIR=./data
```

**Embedding Provider Options:**
- `auto` (default): Use OpenAI if `OPENAI_API_KEY` is set, otherwise use local `sentence-transformers`
- `openai`: Force OpenAI embeddings (requires `OPENAI_API_KEY`)
- `local`: Force local `sentence-transformers` embeddings (no API key needed)

#### Option B: Set Environment Variables Directly

**Windows PowerShell:**
```powershell
# Set environment variables for current session
$env:OPENAI_API_KEY="sk-your-key-here"
$env:EMBEDDING_PROVIDER="auto"

# Start the service
cd server/rag_service
python main.py
```

**Windows CMD:**
```cmd
REM Set environment variables for current session
set OPENAI_API_KEY=sk-your-key-here
set EMBEDDING_PROVIDER=auto

REM Start the service
cd server\rag_service
python main.py
```

**Note:** Environment variables set with `$env:` (PowerShell) or `set` (CMD) only last for the current terminal session. To make them permanent, use `setx` (requires new terminal) or create a `.env` file.

**Linux/Mac:**
```bash
export OPENAI_API_KEY="sk-your-key-here"
export EMBEDDING_PROVIDER="auto"
python main.py
```

**Note:** Using `setx` on Windows requires a new terminal session to take effect.

### 3. Run the Service

```bash
python main.py
```

The service will start on `http://0.0.0.0:8000` and display startup diagnostics showing:
- Embedding provider configuration
- Whether `OPENAI_API_KEY` is loaded (redacted)
- Data directory paths
- Embedding model availability

## API Endpoints

### Health Check

```bash
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00",
  "embedding_provider": "openai" | "local",
  "embedding_available": true | false,
  "openai_key_set": true | false
}
```

### Sync Visit Record

```bash
POST /sync/visits/upsert
Content-Type: application/json

{
  "id": "visit-123",
  "createdAt": 1704110400000,
  "task_type": "field_visit",
  "field_id": "14",
  "crop": "corn",
  "note": "Paddock 14 inspection",
  ...
}
```

Automatically generates and stores embeddings after saving to SQLite.

### Upload Media

```bash
POST /sync/media/upload
Content-Type: multipart/form-data

file: <binary>
visit_id: "visit-123"
type: "photo" | "audio"
```

### Semantic Search

```bash
POST /rag/search
Content-Type: application/json

{
  "query": "paddock 14 last month",
  "k": 10,
  "filters": {
    "field_id": "14",
    "created_at_min": 1704110400000
  }
}
```

Returns list of matching visits with similarity scores.

### Get Visit Record

```bash
GET /visits/{visit_id}
```

Returns full visit record with media URIs.

## Data Storage

- **SQLite**: `data/visits.db` - Source of truth for structured visit records
- **ChromaDB**: `data/chroma/` - Vector embeddings and metadata (persistent)
- **Media**: `data/media/{visit_id}/` - Photo and audio files

## Embedding Providers

### OpenAI (Recommended for Production)

- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536
- **Requires**: `OPENAI_API_KEY` environment variable
- **Cost**: ~$0.02 per 1M tokens

### Local (Fallback)

- **Model**: `all-MiniLM-L6-v2` (sentence-transformers)
- **Dimensions**: 384
- **Requires**: No API key, downloads model on first use (~90MB)
- **Cost**: Free, runs locally

**Note:** Local embeddings work offline but may have lower quality for domain-specific queries.

## Troubleshooting

### "OPENAI_API_KEY loaded: not set"

**Solution 1:** Create `.env` file in `server/rag_service/`:
```env
OPENAI_API_KEY=sk-your-key-here
```

**Solution 2:** Set environment variable before starting:
```powershell
# PowerShell
$env:OPENAI_API_KEY="sk-your-key-here"
python main.py
```

**Solution 3:** Verify `.env` file path - the service looks for `.env` in the same directory as `main.py`.

### "Embedding provider unavailable" (503 errors)

**If using OpenAI:**
- Check `OPENAI_API_KEY` is set correctly
- Verify API key is valid and has credits
- Check network connectivity

**If using local:**
- Ensure `sentence-transformers` is installed: `pip install sentence-transformers`
- Check disk space (model download ~90MB)
- Review startup diagnostics for model loading errors

### Service won't start

1. **Check Python version:** Requires Python 3.8+
   ```bash
   python --version
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Check port 8000 is available:**
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Linux/Mac
   lsof -i :8000
   ```

### ChromaDB errors

- Delete `data/chroma/` directory and restart (will recreate)
- Check disk space and permissions
- Ensure ChromaDB version matches: `chromadb==0.4.18`

## Architecture Notes

- **ChromaDB is NOT the source of truth** - SQLite stores the canonical visit records
- **Embeddings are generated server-side** - API keys never exposed to client
- **Offline-first design** - Local embeddings work without internet
- **Auto-fallback** - If OpenAI fails and `EMBEDDING_PROVIDER=auto`, falls back to local

## Development

### Run with auto-reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Test endpoints:

```bash
# Health check
curl http://localhost:8000/health

# Search
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "k": 5}'
```

## Acceptance Tests

### Test 1: Start without OPENAI_API_KEY

```bash
# Don't set OPENAI_API_KEY
python main.py
```

**Expected:**
- Service starts successfully
- Startup diagnostics show `embedding_provider: local`
- `/health` returns `"embedding_available": true` (after model loads)
- `/rag/search` works with local embeddings

### Test 2: Start with OPENAI_API_KEY

```bash
$env:OPENAI_API_KEY="sk-your-key-here"
python main.py
```

**Expected:**
- Service starts successfully
- Startup diagnostics show `embedding_provider: openai`
- `/health` returns `"embedding_provider": "openai"` and `"embedding_available": true`
- `/rag/search` works with OpenAI embeddings

### Test 3: Auto mode (prefer OpenAI, fallback to local)

```bash
# With key
$env:OPENAI_API_KEY="sk-your-key-here"
$env:EMBEDDING_PROVIDER="auto"
python main.py
# Should use OpenAI

# Without key
$env:EMBEDDING_PROVIDER="auto"
python main.py
# Should use local
```

## License

Internal use only.
