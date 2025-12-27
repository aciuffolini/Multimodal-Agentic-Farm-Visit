# Fix: Client Not Connecting to RAG Service

## ✅ RAG Service Status
- **Service is running** ✅
- **Health check works** ✅  
- **Search endpoint works** ✅ (returns 3 results)
- **Embeddings working** ✅

## ❌ Client Issue
The web app is not connecting to the RAG service correctly.

## 🔧 Quick Fix

### Step 1: Set RAG Server URL in Browser Console

Open browser console (F12) and run:

```javascript
// Set RAG server URL
localStorage.setItem('rag_server_url', 'http://localhost:8000');

// Verify it's set
console.log('RAG Server URL:', localStorage.getItem('rag_server_url'));

// Test connection
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(data => {
    console.log('✅ RAG Service Health:', data);
    console.log('Provider:', data.provider_active);
    console.log('Embedding available:', data.embedding_available);
  })
  .catch(err => console.error('❌ RAG Service Error:', err));
```

### Step 2: Test RAG Search from Browser

```javascript
// Test RAG search
fetch('http://localhost:8000/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'field 12', k: 5 })
})
  .then(r => r.json())
  .then(data => {
    console.log('✅ RAG Search Results:', data);
    console.log('Found', data.length, 'results');
  })
  .catch(err => console.error('❌ RAG Search Error:', err));
```

### Step 3: Restart Dev Server (if .env changed)

If you just created/updated `apps/web/.env`, restart the dev server:

```powershell
# Stop current server (Ctrl+C)
# Then restart:
cd apps/web
pnpm run dev
```

### Step 4: Test Chat Again

After setting the RAG server URL, try the chat again. It should now:
1. Connect to RAG service
2. Search for relevant records
3. Include them in the chat response

## 🔍 Verify Configuration

**Check in browser console:**

```javascript
// Check environment variables
console.log('VITE_RAG_SERVER_URL:', import.meta.env.VITE_RAG_SERVER_URL);
console.log('localStorage rag_server_url:', localStorage.getItem('rag_server_url'));

// The app should use one of these (localStorage takes precedence)
```

## 📝 Why This Happens

The RAG client needs to know where the RAG service is running. It checks:
1. `localStorage.getItem('rag_server_url')` (runtime, takes precedence)
2. `import.meta.env.VITE_RAG_SERVER_URL` (from .env file)

If neither is set, RAG features won't work.

## ✅ After Fix

You should see in console:
- `[RAGClient] Search returned X results` ✅
- Chat responses include historical data ✅
- No "Embedding provider unavailable" errors ✅

