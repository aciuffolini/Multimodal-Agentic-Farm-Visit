# Restart RAG Service with API Key

## 🚨 Current Issue

The RAG service is running but **doesn't have the API key loaded**, so it can't generate embeddings for search queries.

**Error:** `Embedding provider unavailable`

---

## ✅ Quick Fix

### Option 1: Use Restart Script (Recommended)
```powershell
cd server/rag_service
.\restart-rag-service.ps1
```

### Option 2: Manual Restart
1. **Stop current RAG service:**
   - Find the terminal running `python main.py`
   - Press `Ctrl+C` to stop it

2. **Start with API key:**
   ```powershell
   cd server/rag_service
   .\start-with-env.ps1
   ```

### Option 3: Set Environment Variable
```powershell
cd server/rag_service
$env:OPENAI_API_KEY="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"
python main.py
```

---

## 🔍 Verify It's Working

After restarting, test in browser console:
```javascript
fetch('http://localhost:8000/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'field 12', k: 5 })
}).then(r => r.json()).then(console.log)
```

**Should return:** Array of search results (not an error)

---

## 📝 Why This Happens

The RAG service needs the `OPENAI_API_KEY` environment variable to generate embeddings. If you start it with just `python main.py`, it won't load the `.env` file automatically.

**Solution:** Always use `start-with-env.ps1` or `restart-rag-service.ps1` to ensure the API key is loaded.

---

## ✅ After Restart

1. Chat should work without "Embedding provider unavailable" error
2. RAG search will return results
3. Historical queries will work

