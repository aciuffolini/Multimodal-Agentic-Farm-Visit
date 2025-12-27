# RAG Service Diagnostic Guide

## 🔍 Quick Diagnostic

If the chat agent isn't accessing the database after refresh, run this in the browser console:

```javascript
// Import and run diagnostic
import('./src/lib/rag/diagnoseRAG.ts').then(async ({ diagnoseRAG }) => {
  await diagnoseRAG();
});
```

Or use the global function (if available):
```javascript
await diagnoseRAG();
```

---

## 🐛 Common Issues

### 1. **RAG Service Not Running**
**Symptom:** Health check fails

**Fix:**
```bash
cd server/rag_service
python main.py
```

**Verify:**
```bash
curl http://localhost:8000/health
```

---

### 2. **No Records in ChromaDB**
**Symptom:** Search returns 0 results

**Fix:**
1. Check if records are synced to SQLite:
   ```bash
   cd server/rag_service
   python check-structured-fields.py
   ```

2. Check if embeddings are generated:
   ```bash
   cd server/rag_service
   python test-chromadb.py
   ```

3. If records exist in SQLite but not ChromaDB:
   - Records need to be synced (they should auto-sync)
   - Embeddings need to be generated (should happen automatically after sync)
   - Check RAG service logs for embedding errors

---

### 3. **RAG Server URL Not Set**
**Symptom:** `ragServerUrl` is null or wrong

**Fix:**
1. Check `.env` file in `apps/web/`:
   ```env
   VITE_RAG_SERVER_URL=http://localhost:8000
   ```

2. Or set in browser localStorage:
   ```javascript
   localStorage.setItem('rag_server_url', 'http://localhost:8000');
   ```

3. Restart dev server after changing `.env`

---

### 4. **CORS Errors**
**Symptom:** Browser console shows CORS errors

**Fix:**
- RAG service should have CORS enabled (already configured)
- Check `server/rag_service/main.py` has:
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

---

### 5. **API Key Missing**
**Symptom:** Embedding generation fails

**Fix:**
1. Check `server/rag_service/.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

2. Restart RAG service after setting API key

---

## 🔧 Step-by-Step Recovery

### If Everything Stopped Working After Refresh:

1. **Check RAG Service:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"ok",...}`

2. **Check ChromaDB:**
   ```bash
   cd server/rag_service
   python test-chromadb.py
   ```

3. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for `[LLMProvider] RAG search failed:` errors
   - Check network tab for failed requests to `/rag/search`

4. **Run Diagnostic:**
   ```javascript
   import('./src/lib/rag/diagnoseRAG.ts').then(async ({ diagnoseRAG }) => {
     await diagnoseRAG();
   });
   ```

5. **If RAG Service is Down:**
   ```bash
   cd server/rag_service
   python main.py
   ```

6. **If No Records in ChromaDB:**
   - Records need to be synced first
   - Check sync queue status in browser console
   - Manually trigger sync if needed

---

## ✅ Verification Checklist

- [ ] RAG service running (`http://localhost:8000/health` returns OK)
- [ ] RAG server URL configured (`.env` or localStorage)
- [ ] Records exist in SQLite (`check-structured-fields.py`)
- [ ] Records exist in ChromaDB (`test-chromadb.py`)
- [ ] Embeddings generated (ChromaDB has records)
- [ ] No CORS errors in browser console
- [ ] API key set in RAG service `.env`
- [ ] Browser console shows RAG search attempts

---

## 🚀 Quick Restart

If nothing works, restart everything:

1. **Stop all servers** (Ctrl+C in each terminal)

2. **Restart RAG Service:**
   ```bash
   cd server/rag_service
   python main.py
   ```

3. **Restart Dev Server:**
   ```bash
   cd apps/web
   pnpm run dev
   ```

4. **Clear browser cache** (optional):
   - Hard refresh: Ctrl+Shift+R
   - Or clear IndexedDB if needed

5. **Test in browser console:**
   ```javascript
   import('./src/lib/rag/diagnoseRAG.ts').then(async ({ diagnoseRAG }) => {
     await diagnoseRAG();
   });
   ```

---

## 📝 Notes

- RAG search is **non-blocking** - if it fails, chat still works with current visit context
- Errors are logged to console with `[LLMProvider]` and `[RAGClient]` prefixes
- Check browser console for detailed error messages
- RAG service logs show embedding generation status

