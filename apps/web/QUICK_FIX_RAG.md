# Quick Fix: Chat Agent Not Accessing Database

## 🚀 Quick Fix (No Need to Start Over!)

### Step 1: Check RAG Service
Open browser console (F12) and run:
```javascript
fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)
```

**If it fails:** RAG service is not running. Start it:
```bash
cd server/rag_service
python main.py
```

### Step 2: Run Diagnostic
In browser console:
```javascript
import('./src/lib/rag/diagnoseRAG.ts').then(async ({ diagnoseRAG }) => {
  await diagnoseRAG();
});
```

This will show you exactly what's wrong.

### Step 3: Check ChromaDB Records
```bash
cd server/rag_service
python test-chromadb.py
```

**If 0 records:** Records need to be synced and embeddings generated.

### Step 4: Manual Sync (If Needed)
In browser console:
```javascript
import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
  const queue = getSyncQueue();
  queue.setConfig({
    serverUrl: 'http://localhost:8000',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('user_api_key')
  });
  await queue.processQueue();
  console.log('Sync complete!');
});
```

### Step 5: Test Chat
Ask a question like: "What's the history of field 12?"

Check console for:
- `[RAGClient] Search returned X results` ✅
- `[LLMProvider] RAG search failed:` ❌ (if error)

---

## 🔍 Common Issues

1. **RAG Service Not Running**
   - Fix: Start `python main.py` in `server/rag_service`

2. **No Records in ChromaDB**
   - Fix: Sync records first, embeddings generate automatically

3. **Wrong Server URL**
   - Fix: Check `.env` or set `localStorage.setItem('rag_server_url', 'http://localhost:8000')`

4. **API Key Missing**
   - Fix: Set in `server/rag_service/.env`

---

## ✅ Everything Should Work After These Steps!

No need to start over - just diagnose and fix the specific issue.

