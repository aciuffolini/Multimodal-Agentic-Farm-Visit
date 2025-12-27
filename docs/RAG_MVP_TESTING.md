# RAG MVP - Testing Checklist

## Acceptance Criteria

### ✅ 1. Offline Save Works

**Web:**
- [ ] Save visit with photo/audio offline
- [ ] Record appears in IndexedDB immediately
- [ ] Media stored as Blob (not base64) in IndexedDB
- [ ] Photo/audio accessible after page reload

**Android:**
- [ ] Save visit with photo/audio offline
- [ ] Record appears in IndexedDB immediately
- [ ] Media stored as File (not base64) via Capacitor Filesystem
- [ ] Photo/audio accessible after app restart

**Test:**
```javascript
// In browser console
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(5);
  records.forEach(r => {
    console.log(r.id, r.photo?.kind, r.audio?.kind);
  });
});
```

---

### ✅ 2. AI Processing - Per-Task Idempotency

**Test Scenarios:**

1. **Photo caption only:**
   - [ ] Save visit with photo (no audio)
   - [ ] `aiStatus.captionDone = true` after processing
   - [ ] `aiStatus.transcriptDone = false` (not attempted)
   - [ ] Re-saving doesn't re-process photo

2. **Audio transcript only:**
   - [ ] Save visit with audio (no photo)
   - [ ] `aiStatus.transcriptDone = true` after processing
   - [ ] `aiStatus.captionDone = false` (not attempted)

3. **Both photo and audio:**
   - [ ] Save visit with both
   - [ ] Both tasks process independently
   - [ ] Partial completion doesn't block other task

**Test:**
```javascript
// Check AI status
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const record = await visitDB.get('your-record-id');
  console.log('AI Status:', record.aiStatus);
});
```

---

### ✅ 3. Sync Queue - Offline to Online

**Test:**
1. [ ] Save visit offline
2. [ ] Check `syncStatus = 'pending'`
3. [ ] Go online
4. [ ] Verify sync queue processes automatically
5. [ ] Check `syncStatus = 'synced'` and `syncedAt` set
6. [ ] Verify media uploaded to server

**Test:**
```javascript
// Check sync status
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const unsynced = await visitDB.getUnsynced();
  console.log('Unsynced:', unsynced.length);
});
```

---

### ✅ 4. Media Storage - No Base64 on Web

**Web:**
- [ ] Photo stored as Blob in IndexedDB
- [ ] `photo.kind = 'blob'`
- [ ] `photo.blobKey` exists
- [ ] No `photo_data` base64 string (or only for legacy)

**Android:**
- [ ] Photo stored as File
- [ ] `photo.kind = 'file'`
- [ ] `photo.uri` points to Capacitor Filesystem path

**Test:**
```javascript
// Check media storage
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const record = await visitDB.get('your-record-id');
  console.log('Photo:', record.photo);
  console.log('Audio:', record.audio);
  // Should NOT have large base64 strings
  console.log('Has photo_data?', !!record.photo_data);
});
```

---

### ✅ 5. Timestamp Consistency

**Test:**
- [ ] All records have `createdAt` (epoch ms)
- [ ] Exports use `createdAt` (not `ts`)
- [ ] UI displays dates from `createdAt`
- [ ] No "Invalid Date" in exports

**Test:**
```javascript
// Check timestamps
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(5);
  records.forEach(r => {
    console.log(r.id, 'createdAt:', new Date(r.createdAt).toISOString());
    console.log('Has ts?', !!r.ts); // Should be optional/deprecated
  });
});
```

---

### ✅ 6. RAG Search Returns Results

**Test:**
1. [ ] Save multiple visits with different fields
2. [ ] Wait for AI processing and sync
3. [ ] Search: "corn pest damage"
4. [ ] Results include relevant visits
5. [ ] Results show scores, snippets, metadata

**Test:**
```javascript
// Search
import('./src/lib/services/ragClient.ts').then(async ({ getRAGClient }) => {
  const client = getRAGClient({ serverUrl: 'http://localhost:8000' });
  const results = await client.search('corn pest damage', 5);
  console.log('Results:', results);
});
```

---

### ✅ 7. Server Endpoints Work

**Test each endpoint:**

- [ ] `GET /health` → `{"status": "ok"}`
- [ ] `POST /sync/visits/upsert` → Returns `{"status": "ok", "id": "..."}`
- [ ] `POST /sync/media/upload` → Returns `{"uri": "/media/..."}`
- [ ] `POST /rag/upsert` → Returns `{"status": "ok"}`
- [ ] `POST /rag/search` → Returns array of results
- [ ] `GET /visits/{id}` → Returns full record

**Test:**
```bash
# Health check
curl http://localhost:8000/health

# Search
curl -X POST http://localhost:8000/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "corn", "k": 5}'
```

---

### ✅ 8. ChromaDB is NOT Source of Truth

**Test:**
1. [ ] Delete ChromaDB directory
2. [ ] SQLite still has all records
3. [ ] Re-run `/rag/upsert` to regenerate embeddings
4. [ ] Search still works

**Test:**
```bash
# Delete ChromaDB
rm -rf data/chroma/

# Records still in SQLite
sqlite3 data/visits.db "SELECT COUNT(*) FROM visits;"
```

---

## End-to-End Test Flow

### Complete Workflow

1. **Setup:**
   - [ ] Start Python RAG service
   - [ ] Configure client with server URL
   - [ ] Set OpenAI API key (for embeddings)

2. **Capture Visit (Offline):**
   - [ ] Disable network (DevTools → Network → Offline)
   - [ ] Capture GPS, photo, audio
   - [ ] Save visit
   - [ ] Verify saved in IndexedDB
   - [ ] Verify media stored (Blob/File, not base64)

3. **AI Processing (Go Online):**
   - [ ] Enable network
   - [ ] Wait for AI queue to process
   - [ ] Verify `photo_caption` and `audio_transcript` generated
   - [ ] Verify `aiStatus` updated

4. **Sync (Online):**
   - [ ] Wait for sync queue to process
   - [ ] Verify record in SQLite
   - [ ] Verify media files in `data/media/`
   - [ ] Verify embedding in ChromaDB

5. **Search:**
   - [ ] Search for visit content
   - [ ] Verify results returned
   - [ ] Click result → verify full record loads

---

## Known Limitations

1. **Embedding Provider**: Requires OpenAI API key for semantic search
2. **Media Migration**: Legacy base64 data kept during migration period
3. **Android Testing**: Requires physical device or emulator with Capacitor

---

## Troubleshooting

### AI Processing Not Working
- Check OpenAI API key in localStorage: `localStorage.getItem('user_api_key')`
- Check AI queue: `aiQueue.getQueuedTasks()`
- Check network connectivity

### Sync Not Working
- Check server URL: `localStorage.getItem('rag_server_url')`
- Check server is running: `curl http://localhost:8000/health`
- Check sync queue: `syncQueue.getStatus()`

### Search Returns No Results
- Verify embeddings generated: Check ChromaDB collection
- Verify records synced: Check SQLite database
- Check embedding provider: `OPENAI_API_KEY` set?

---

## Performance Benchmarks

- **Save visit (offline)**: < 100ms
- **AI processing (photo)**: ~2-5s (OpenAI Vision API)
- **AI processing (audio)**: ~3-10s (OpenAI Whisper API)
- **Sync (record + media)**: ~1-3s
- **Search (10 results)**: ~200-500ms

