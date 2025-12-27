# 🔑 API Key Explanation - One Key, Two Uses

## Quick Answer

**You need ONE OpenAI API key, but it's used in TWO places:**

1. **Client-side (Browser)** - For AI processing (photo captions, audio transcripts)
2. **Server-side (RAG Service)** - For generating embeddings (ChromaDB)

---

## 📍 Where API Keys Are Used

### 1. Client-Side (Browser) ✅ Working

**Location:** `localStorage.getItem('user_api_key')`

**Used for:**
- Photo descriptions (OpenAI Vision API)
- Audio transcriptions (OpenAI Whisper API)

**Status:** ✅ Working (you can see AI processing in console)

**How to set:**
```javascript
// In browser console or app settings
localStorage.setItem('user_api_key', 'sk-...');
```

---

### 2. Server-Side (RAG Service) ⚠️ Check if Running

**Location:** Environment variable `OPENAI_API_KEY` in Python service

**Used for:**
- Generating embeddings for semantic search (OpenAI Embeddings API)
- Storing in ChromaDB for search

**Status:** ⚠️ Need to check if RAG service is running

**How to set:**
```bash
# In terminal where RAG service runs
export OPENAI_API_KEY="sk-..."
# Or on Windows PowerShell:
$env:OPENAI_API_KEY="sk-..."
```

---

## 🔍 Current Status Check

From your screenshot, I can see:
- ✅ **AI Processing Working:** Photo captions are being generated
- ⚠️ **Sync Queue:** 2 records waiting to sync
- ❓ **RAG Service:** Need to check if running

---

## 🚀 How to Check if RAG Service is Working

### Step 1: Check if RAG Service is Running

```bash
# Test if service is running
curl http://localhost:8000/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

**If not running:**
```bash
cd server/rag_service
python main.py
```

### Step 2: Check if Records Are Synced

```bash
# Check SQLite database
sqlite3 server/rag_service/data/visits.db "SELECT COUNT(*) FROM visits;"
```

**Expected:** Should show number of synced records

### Step 3: Check if Embeddings Are Generated

```bash
# Check ChromaDB (if Python is available)
cd server/rag_service
python -c "import chromadb; client = chromadb.PersistentClient(path='data/chroma'); collection = client.get_collection('farm_visits'); print(f'Records: {collection.count()}')"
```

---

## 🔧 Setup Instructions

### Option 1: Same API Key for Both (Recommended)

**Client (Browser):**
```javascript
localStorage.setItem('user_api_key', 'sk-your-key-here');
```

**Server (RAG Service):**
```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-key-here"
python server/rag_service/main.py

# Or Linux/Mac
export OPENAI_API_KEY="sk-your-key-here"
python server/rag_service/main.py
```

### Option 2: Different Keys (If Needed)

You can use different keys if you want to track usage separately, but usually one key is fine.

---

## 🐛 Troubleshooting

### Issue: Sync Queue Not Processing

**Check:**
1. Is RAG service running? `curl http://localhost:8000/health`
2. Is server URL configured? `localStorage.getItem('rag_server_url')`
3. Check sync queue status in browser console:
   ```javascript
   import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
     const queue = getSyncQueue();
     const status = await queue.getStatus();
     console.log('Sync status:', status);
   });
   ```

### Issue: Embeddings Not Generated

**Check:**
1. Is `OPENAI_API_KEY` set in RAG service?
2. Check RAG service logs
3. Test embedding generation:
   ```bash
   curl -X POST http://localhost:8000/rag/upsert \
     -H "Content-Type: application/json" \
     -d '{"id":"test","createdAt":1234567890,"task_type":"field_visit","field_id":"test"}'
   ```

---

## 📊 Summary

| Component | API Key Location | Purpose | Status |
|-----------|-----------------|---------|--------|
| **Client AI** | `localStorage.user_api_key` | Photo/Audio AI | ✅ Working |
| **RAG Service** | `OPENAI_API_KEY` env var | Embeddings | ⚠️ Check if running |

**Action Items:**
1. ✅ Client-side API key is set (working)
2. ⚠️ Check if RAG service is running on port 8000
3. ⚠️ Set `OPENAI_API_KEY` environment variable for RAG service
4. ⚠️ Check if sync queue is processing records

---

## 💡 Quick Test

**Test if everything is working:**

```javascript
// In browser console
// 1. Check client API key
console.log('Client API key:', localStorage.getItem('user_api_key') ? 'Set ✅' : 'Not set ❌');

// 2. Check RAG server URL
console.log('RAG server URL:', localStorage.getItem('rag_server_url') || 'Not set ❌');

// 3. Test RAG service connection
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('RAG service:', d.status === 'ok' ? 'Running ✅' : 'Not running ❌'))
  .catch(() => console.log('RAG service: Not running ❌'));

// 4. Check sync queue
import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
  const queue = getSyncQueue();
  const status = await queue.getStatus();
  console.log('Sync queue:', status);
});
```

