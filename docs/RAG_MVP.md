# RAG MVP - End-to-End Pipeline

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (PWA + Android)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  FieldVisit  │  │ MediaStorage │  │   RAGClient   │     │
│  │  Component   │  │  (Blob/File) │  │  (Search API) │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              IndexedDB (Local Storage)              │   │
│  │  - visits (structured records)                      │   │
│  │  - aiQueue (per-task AI processing)                │   │
│  │  - syncQueue (offline sync)                        │   │
│  │  - media (blobs on web, file refs on Android)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Local RAG Service (Python)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   FastAPI    │  │   SQLite     │  │   ChromaDB   │     │
│  │   Server     │  │  (Source of  │  │  (Embeddings)│     │
│  │              │  │   Truth)     │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│                           ▼                                  │
│              ┌────────────────────────┐                      │
│              │   Media Storage        │                      │
│              │   (data/media/)        │                      │
│              └────────────────────────┘                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. **Offline-First Architecture**
- All data saved locally first (IndexedDB)
- AI processing queued offline, processed when online
- Sync queue handles server synchronization
- Never blocks "Save Visit" on network

### 2. **Media Storage Strategy**
- **Web PWA**: Blob in IndexedDB (not base64)
- **Android**: Filesystem via Capacitor (app-private path)
- **Server**: Files on disk under `data/media/{visitId}/`
- Media pointers: `{ kind: 'blob'|'file'|'remote', uri?, blobKey?, mimeType? }`

### 3. **Timestamp Standardization**
- `createdAt` is primary timestamp (epoch ms)
- `ts` deprecated but kept for migration
- All exports use `createdAt`

### 4. **AI Processing - Per-Task Idempotency**
- `aiStatus: { captionDone, transcriptDone, embeddingDone }`
- Each task can complete independently
- No re-processing if already done

### 5. **ChromaDB is NOT Source of Truth**
- SQLite stores structured records
- ChromaDB stores embeddings + metadata only
- Embeddings generated server-side (API keys never in client)

## Data Flow

### 1. Save Visit (Offline)
```
User captures visit
    ↓
FieldVisit.handleSave()
    ↓
MediaStorage.storePhoto/Audio() → Blob (web) or File (Android)
    ↓
visitDB.insert() → IndexedDB
    ↓
aiQueue.queueProcessing() → IndexedDB queue
    ↓
syncQueue.queueRecord() → IndexedDB queue
    ↓
✅ Saved (works offline)
```

### 2. AI Processing (When Online)
```
navigator.onLine = true
    ↓
aiQueue.processQueue()
    ↓
For each task:
    - Get record from IndexedDB
    - Get media via MediaStorage
    - Call OpenAI Vision/Whisper API
    - Update record with AI artifacts
    - Mark task as done in aiStatus
    ↓
✅ AI processing complete
```

### 3. Sync to Server (When Online)
```
navigator.onLine = true
    ↓
syncQueue.processQueue()
    ↓
For each record:
    - POST /sync/visits/upsert (metadata)
    - POST /sync/media/upload (photo/audio)
    - POST /rag/upsert (generate embedding)
    ↓
✅ Synced to server
```

### 4. Semantic Search
```
User queries: "corn pest damage"
    ↓
RAGClient.search(query, k=10)
    ↓
POST /rag/search
    ↓
Server: Generate query embedding → Search ChromaDB
    ↓
Return top K results with scores
    ↓
Display results in UI
```

## File Structure

```
apps/web/src/
├── lib/
│   ├── db.ts                    # IndexedDB schema (v2)
│   ├── storage/
│   │   └── MediaStorage.ts      # Blob/File storage abstraction
│   ├── queues/
│   │   ├── AIProcessingQueue.ts # Per-task AI queue (IndexedDB)
│   │   └── SyncQueue.ts         # Sync queue (IndexedDB)
│   └── services/
│       └── ragClient.ts         # RAG API client
│
packages/shared/src/
├── schemas/
│   └── task.ts                  # BaseRecord with media pointers
└── templates/
    └── fieldVisit.ts            # Field visit template (uses createdAt)

server/rag_service/
├── main.py                      # FastAPI service
├── requirements.txt
└── README.md
```

## Running the System

### 1. Start Python RAG Service
```bash
cd server/rag_service
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py
```

Service runs on `http://localhost:8000`

### 2. Configure Client
Set RAG server URL in client:
```typescript
// In FieldVisit or app config
localStorage.setItem('rag_server_url', 'http://localhost:8000');
```

Or via environment variable:
```bash
VITE_RAG_SERVER_URL=http://localhost:8000
```

### 3. Run Web App
```bash
cd apps/web
pnpm run dev
```

### 4. Run Android App
```bash
cd apps/web
pnpm run build:android
npx cap sync android
npx cap run android
```

## API Endpoints

### Server Endpoints

- `GET /health` - Health check
- `POST /sync/visits/upsert` - Upsert visit record (metadata)
- `POST /sync/media/upload` - Upload media file
- `GET /media/{visit_id}/{filename}` - Get media file
- `POST /rag/upsert` - Generate embedding and upsert
- `POST /rag/search` - Semantic search
- `GET /visits/{visit_id}` - Get full visit record

### Client Services

- `RAGClient.search(query, k)` - Semantic search
- `RAGClient.getVisit(id)` - Get full record
- `RAGClient.syncPendingVisits()` - Sync all pending
- `SyncQueue.queueRecord(id)` - Queue record for sync
- `AIProcessingQueue.queueProcessing(record)` - Queue AI tasks

## Migration Notes

### From Old Schema to New

1. **Timestamps**: `ts` → `createdAt` (migration in db.ts v2 upgrade)
2. **Media**: `photo_data` (base64) → `photo` (pointer) (gradual migration)
3. **Sync**: `synced` (boolean) → `syncStatus` ('pending'|'synced'|'failed')
4. **AI**: `ai_indexed` (boolean) → `aiStatus` (per-task flags)

Migration happens automatically on first app load after update.

## Testing Checklist

See `docs/RAG_MVP_TESTING.md` for detailed acceptance criteria.

