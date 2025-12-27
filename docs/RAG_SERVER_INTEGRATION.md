# RAG Service Integration with Existing Servers

## 🎯 Server Architecture

You now have **3 servers** that work together:

| Server | Port | Purpose | Required For |
|--------|------|---------|--------------|
| **Vite Dev Server** | 5173 | Frontend app (React) | ✅ Always needed |
| **Chat API Server** | 3000 | Chat functionality (`/api/chat`) | ✅ Always needed |
| **RAG Service** | 8000 | Semantic search & sync | ⚠️ Optional (for RAG features) |

---

## ✅ How They Work Together

### Scenario 1: Basic Usage (Chat Only)
**You need:**
- ✅ Vite dev server (port 5173)
- ✅ Chat server (port 3000)
- ❌ RAG service (not needed)

**Start:**
```bash
# Terminal 1
cd apps/web
pnpm run dev

# Terminal 2
cd apps/web
node test-server.js
```

**Result:** Chat works, but no RAG search/sync features.

---

### Scenario 2: Full Features (Chat + RAG)
**You need:**
- ✅ Vite dev server (port 5173)
- ✅ Chat server (port 3000)
- ✅ RAG service (port 8000)

**Start:**
```bash
# Terminal 1 - Frontend
cd apps/web
pnpm run dev

# Terminal 2 - Chat API
cd apps/web
node test-server.js

# Terminal 3 - RAG Service
cd server/rag_service
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py
```

**Result:** 
- ✅ Chat works
- ✅ RAG search works
- ✅ Sync to server works
- ✅ Semantic search works

---

## 🔧 Quick Start Script

Create a script to start all three:

**`apps/web/start-all-servers.bat`** (Windows):
```batch
@echo off
echo Starting all servers...
start "Vite Dev Server" cmd /k "cd /d %~dp0 && pnpm run dev"
timeout /t 2 /nobreak >nul
start "Chat API Server" cmd /k "cd /d %~dp0 && node test-server.js"
timeout /t 2 /nobreak >nul
start "RAG Service" cmd /k "cd /d %~dp0\..\..\server\rag_service && python main.py"
echo All servers starting...
pause
```

**`apps/web/start-all-servers.ps1`** (PowerShell):
```powershell
Write-Host "Starting all servers..." -ForegroundColor Green

# Start Vite dev server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; pnpm run dev"

Start-Sleep -Seconds 2

# Start Chat API server
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; node test-server.js"

Start-Sleep -Seconds 2

# Start RAG service
$ragPath = Join-Path $PSScriptRoot "..\..\server\rag_service"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ragPath'; python main.py"

Write-Host "All servers starting in separate windows..." -ForegroundColor Green
```

---

## 🔍 Verify All Servers Are Running

### Check Vite Dev Server (5173)
```bash
curl http://localhost:5173
# Should return HTML
```

### Check Chat API Server (3000)
```bash
curl http://localhost:3000/health
# Should return: {"ok":true,"message":"Test server running"}
```

### Check RAG Service (8000)
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## 📋 Integration Points

### 1. Chat Server (test-server.js)
- **Purpose:** Handles chat messages, OpenAI API calls
- **Endpoints:** `/api/chat`, `/api/visits`, `/health`
- **Status:** ✅ Already working, no changes needed

### 2. RAG Service (main.py)
- **Purpose:** Semantic search, record sync, embeddings
- **Endpoints:** `/rag/search`, `/sync/visits/upsert`, `/sync/media/upload`
- **Status:** ✅ New service, runs separately

### 3. Frontend (Vite)
- **Purpose:** React app, UI
- **Configuration:**
  - Chat API: Uses proxy in `vite.config.ts` → `http://localhost:3000`
  - RAG Service: Configured via `localStorage` or env var → `http://localhost:8000`

---

## ⚙️ Configuration

### Frontend Configuration

The frontend automatically uses:
- **Chat API:** Via Vite proxy (configured in `vite.config.ts`)
- **RAG Service:** Via `RAGClient` (configured at runtime)

**Set RAG server URL:**
```javascript
// In browser console or app config
localStorage.setItem('rag_server_url', 'http://localhost:8000');
```

Or via environment variable:
```bash
# In apps/web/.env.local
VITE_RAG_SERVER_URL=http://localhost:8000
```

---

## 🎯 What Each Server Does

### Chat Server (port 3000)
- ✅ Handles `/api/chat` requests
- ✅ Processes chat messages with OpenAI
- ✅ Returns streaming responses
- ✅ No changes needed for RAG integration

### RAG Service (port 8000)
- ✅ Handles `/rag/search` (semantic search)
- ✅ Handles `/sync/visits/upsert` (record sync)
- ✅ Handles `/sync/media/upload` (media upload)
- ✅ Generates embeddings (server-side)
- ✅ Stores in SQLite + ChromaDB

### Frontend (port 5173)
- ✅ React app
- ✅ Uses Chat API for chat
- ✅ Uses RAG service for search/sync
- ✅ Both work independently

---

## 🚀 Recommended Workflow

### Development

1. **Start all three servers:**
   ```bash
   # Use the start-all-servers script, or manually:
   # Terminal 1: pnpm run dev
   # Terminal 2: node test-server.js
   # Terminal 3: python server/rag_service/main.py
   ```

2. **Test chat:**
   - Open http://localhost:5173
   - Use chat drawer
   - Should work with Chat API (port 3000)

3. **Test RAG features:**
   - Save a visit (offline)
   - Go online → AI processes → Syncs to RAG service
   - Search using RAG client

---

## ⚠️ Important Notes

1. **Chat and RAG are separate:**
   - Chat uses Chat API (port 3000)
   - RAG uses RAG service (port 8000)
   - They don't interfere with each other

2. **RAG service is optional:**
   - App works without it (chat still works)
   - RAG features (search/sync) only work if service is running

3. **Port conflicts:**
   - If port 8000 is in use, change in `server/rag_service/main.py`:
     ```python
     uvicorn.run(app, host="0.0.0.0", port=8001)  # Change port
     ```
   - Update client config: `localStorage.setItem('rag_server_url', 'http://localhost:8001')`

---

## 🐛 Troubleshooting

### "RAG service not found"
- ✅ Check if service is running: `curl http://localhost:8000/health`
- ✅ Check client config: `localStorage.getItem('rag_server_url')`
- ✅ Start service: `python server/rag_service/main.py`

### "Chat not working"
- ✅ Check Chat API server: `curl http://localhost:3000/health`
- ✅ Start Chat API: `node apps/web/test-server.js`

### "Both services conflict"
- ✅ They run on different ports (3000 vs 8000), no conflict
- ✅ They serve different purposes, can run simultaneously

---

## 📝 Summary

**Yes, the RAG service works alongside your existing servers!**

- ✅ Chat server (3000) - Still needed for chat
- ✅ RAG service (8000) - New, optional, for search/sync
- ✅ Both can run at the same time
- ✅ Frontend uses both independently

**You can:**
- Use chat without RAG service (basic functionality)
- Use RAG features when service is running (full features)
- Run all three for complete functionality

