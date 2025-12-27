# RAG MVP - Runbook

## Quick Start

### 1. Start Python RAG Service

```bash
cd server/rag_service
pip install -r requirements.txt
export OPENAI_API_KEY="your-openai-api-key"
python main.py
```

Service runs on `http://localhost:8000`

**Verify:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

### 2. Configure Client

**Option A: Environment Variable**
```bash
# In apps/web/.env.local
VITE_RAG_SERVER_URL=http://localhost:8000
```

**Option B: LocalStorage (Runtime)**
```javascript
// In browser console or app config
localStorage.setItem('rag_server_url', 'http://localhost:8000');
```

---

### 3. Run Web App

```bash
cd apps/web
pnpm install
pnpm run dev
```

Open: http://localhost:5173

---

### 4. Run Android App

```bash
cd apps/web
pnpm run build:android
npx cap sync android
npx cap run android
```

---

## Testing Workflow

### Test 1: Offline Save

1. **Disable network** (DevTools → Network → Offline)
2. **Capture visit:**
   - Get GPS
   - Take photo
   - Record audio
   - Fill fields (field_id, crop, issue)
   - Save visit
3. **Verify:**
   ```javascript
   // In browser console
   import('./src/lib/db.ts').then(async ({ visitDB }) => {
     const records = await visitDB.list(1);
     const r = records[0];
     console.log('Saved:', r.id);
     console.log('Photo:', r.photo?.kind); // Should be 'blob' (web) or 'file' (Android)
     console.log('Sync Status:', r.syncStatus); // Should be 'pending'
   });
   ```

---

### Test 2: AI Processing

1. **Enable network**
2. **Set API key:**
   ```javascript
   localStorage.setItem('user_api_key', 'your-openai-key');
   ```
3. **Wait for AI processing** (auto-triggers on online event)
4. **Verify:**
   ```javascript
   import('./src/lib/db.ts').then(async ({ visitDB }) => {
     const record = await visitDB.get('your-record-id');
     console.log('AI Status:', record.aiStatus);
     console.log('Photo Caption:', record.photo_caption);
     console.log('Audio Transcript:', record.audio_transcript);
   });
   ```

---

### Test 3: Sync to Server

1. **Ensure server is running** (`curl http://localhost:8000/health`)
2. **Wait for sync** (auto-triggers on online event)
3. **Verify:**
   ```bash
   # Check SQLite
   sqlite3 server/rag_service/data/visits.db "SELECT id, field_id, crop FROM visits LIMIT 5;"
   
   # Check media files
   ls server/rag_service/data/media/
   ```

---

### Test 4: Semantic Search

1. **Ensure records are synced and embeddings generated**
2. **Search:**
   ```javascript
   import('./src/lib/services/ragClient.ts').then(async ({ getRAGClient }) => {
     const client = getRAGClient({ serverUrl: 'http://localhost:8000' });
     const results = await client.search('corn pest damage', 5);
     console.log('Results:', results);
   });
   ```
3. **Verify results include relevant visits**

---

## Troubleshooting

### AI Processing Not Working

**Check:**
- API key set: `localStorage.getItem('user_api_key')`
- Network online: `navigator.onLine`
- Queue status:
  ```javascript
  import('./src/lib/queues/AIProcessingQueue.ts').then(async ({ getAIProcessingQueue }) => {
    const queue = getAIProcessingQueue();
    const tasks = await queue.getQueuedTasks();
    console.log('Queued tasks:', tasks);
  });
  ```

**Fix:**
- Set API key if missing
- Check OpenAI API quota/errors
- Manually trigger: `queue.processQueue()`

---

### Sync Not Working

**Check:**
- Server running: `curl http://localhost:8000/health`
- Server URL configured: `localStorage.getItem('rag_server_url')`
- Sync queue:
  ```javascript
  import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
    const queue = getSyncQueue();
    const status = await queue.getStatus();
    console.log('Sync status:', status);
  });
  ```

**Fix:**
- Start server if not running
- Set server URL if missing
- Manually trigger: `queue.syncAllPending()`

---

### Search Returns No Results

**Check:**
- Records synced: `sqlite3 data/visits.db "SELECT COUNT(*) FROM visits;"`
- Embeddings generated: Check ChromaDB collection
- OpenAI API key set on server: `export OPENAI_API_KEY="..."`

**Fix:**
- Re-run `/rag/upsert` for existing records
- Check embedding provider: `EMBEDDING_PROVIDER=openai`

---

### Media Not Stored Correctly

**Web:**
- Check IndexedDB: DevTools → Application → IndexedDB → FarmVisitMediaDB
- Should see Blob entries, not base64 strings

**Android:**
- Check Capacitor Filesystem: Files stored in app-private directory
- Use `adb shell` to inspect: `/data/data/com.farmvisit.app/files/`

**Fix:**
- Clear IndexedDB and re-save
- Check Capacitor Filesystem permissions

---

## Data Locations

### Client (Web)
- **IndexedDB**: `FarmVisitDB` (visits, aiQueue, syncQueue)
- **Media Blobs**: `FarmVisitMediaDB` (media store)

### Client (Android)
- **IndexedDB**: Same as web
- **Media Files**: Capacitor Filesystem (`farm_visit_media/{visitId}/`)

### Server
- **SQLite**: `server/rag_service/data/visits.db`
- **ChromaDB**: `server/rag_service/data/chroma/`
- **Media**: `server/rag_service/data/media/{visitId}/`

---

## Environment Variables

### Client
- `VITE_RAG_SERVER_URL`: RAG service URL (default: `http://localhost:8000`)

### Server
- `OPENAI_API_KEY`: OpenAI API key (required for embeddings)
- `EMBEDDING_PROVIDER`: `openai` or `sentence-transformers` (default: `openai`)
- `DATA_DIR`: Data directory path (default: `./data`)

---

## Performance Tips

1. **Batch AI Processing**: Queue processes one task at a time (prevents API rate limits)
2. **Sync Throttling**: Sync queue uses exponential backoff (prevents server overload)
3. **Media Storage**: Blob/File storage is more efficient than base64 (smaller DB size)

---

## Next Steps

1. **Add RAG Search UI**: Create React component for search interface
2. **Add Embedding Generation**: Trigger embedding generation after AI processing
3. **Add Filters**: Support filtering search results by field_id, crop, date range
4. **Add Export**: Export search results to CSV/JSON

