# 🚀 Quick Setup - API Key Configuration

## ⚠️ Security Warning

**Your API key has been shared publicly.** After setup, consider rotating it in your OpenAI dashboard.

---

## ✅ Step 1: Set Client-Side Key (Browser)

**Open browser console (F12) and run:**
```javascript
localStorage.setItem('user_api_key', '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');
console.log('✅ Client API key set!');
```

**Verify:**
```javascript
console.log('Key set:', localStorage.getItem('user_api_key') ? 'Yes ✅' : 'No ❌');
```

---

## ✅ Step 2: Start RAG Service with Key

### Option A: Use the Script (Easiest)

**Windows:**
```bash
cd server/rag_service
start-with-key.bat
```

**PowerShell:**
```powershell
cd server/rag_service
.\start-with-key.ps1
```

### Option B: Manual

**PowerShell:**
```powershell
$env:OPENAI_API_KEY="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"
cd server/rag_service
python main.py
```

**CMD:**
```cmd
set OPENAI_API_KEY=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
cd server\rag_service
python main.py
```

---

## ✅ Step 3: Verify Everything Works

### Test RAG Service:
```bash
curl http://localhost:8000/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

### Test in Browser Console:
```javascript
// Check client key
console.log('Client key:', localStorage.getItem('user_api_key') ? '✅' : '❌');

// Check RAG service
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('RAG service:', d.status === 'ok' ? '✅ Running' : '❌'))
  .catch(() => console.log('RAG service: ❌ Not running'));

// Check sync queue
import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
  const queue = getSyncQueue();
  const status = await queue.getStatus();
  console.log('Sync queue:', status);
});
```

---

## ✅ Step 4: Test End-to-End

1. **Save a visit** with photo/audio
2. **Check AI processing** - should generate captions/transcripts
3. **Check sync queue** - should sync to RAG service
4. **Check ChromaDB** - embeddings should be generated

---

## 🔄 What Happens Next

1. **Client-side:** AI processing works immediately (photo captions, audio transcripts)
2. **Server-side:** When records sync, embeddings are generated automatically
3. **ChromaDB:** Embeddings stored for semantic search

---

## 🐛 Troubleshooting

### "RAG service not running"
- Check if Python is installed: `python --version`
- Check if dependencies installed: `pip install -r requirements.txt`
- Check if port 8000 is available

### "Embeddings not generating"
- Check if `OPENAI_API_KEY` is set: `echo $env:OPENAI_API_KEY` (PowerShell)
- Check RAG service logs for errors
- Verify API key is valid in OpenAI dashboard

### "Sync queue not processing"
- Check if RAG service is running
- Check if server URL is configured: `localStorage.getItem('rag_server_url')`
- Check browser console for sync errors

---

## 📝 Summary

**One API key, two uses:**
- ✅ Client: `localStorage.user_api_key` → AI processing
- ✅ Server: `OPENAI_API_KEY` env var → Embeddings

**Both are now configured!** 🎉

