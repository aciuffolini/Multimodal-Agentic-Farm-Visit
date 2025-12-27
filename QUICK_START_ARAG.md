# 🚀 Farm Visit ARAG System - Quick Start

This guide gets all three servers running for the full ARAG (Agentic RAG) experience.

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with pnpm
- **OpenAI API key** (optional, for cloud embeddings and chat)

## 📦 One-Time Setup

### 1. Install Python Dependencies
```powershell
cd server/rag_service
pip install -r requirements.txt
```

### 2. Install Node Dependencies
```powershell
cd apps/web
pnpm install
```

### 3. Configure Environment Variables

**RAG Service** - Create `server/rag_service/.env`:
```env
OPENAI_API_KEY=sk-your-key-here
EMBEDDING_PROVIDER=auto
```

**Web App** - Create `apps/web/.env`:
```env
VITE_RAG_SERVER_URL=http://localhost:8000
```

---

## 🏃 Starting All Servers

### Option A: PowerShell Script (Recommended)
```powershell
cd apps/web
.\start-all-servers.ps1
```

### Option B: Manual (3 Terminals)

**Terminal 1 - RAG Service:**
```powershell
cd server/rag_service
python main.py
# Should show: "Uvicorn running on http://0.0.0.0:8000"
```

**Terminal 2 - Chat API Server:**
```powershell
cd apps/web
node test-server.js
# Should show: "Server running on port 3000"
```

**Terminal 3 - Vite Dev Server:**
```powershell
cd apps/web
pnpm run dev
# Opens browser at http://localhost:5173
```

---

## ✅ Verify Everything Works

### Check Server Health
```powershell
# RAG Service
curl http://localhost:8000/health

# Chat API (should return 404 or similar)
curl http://localhost:3000/
```

### Test in Browser
1. Open http://localhost:5173
2. Click the **chat icon** to open the chat drawer
3. Enter your **OpenAI or Claude API key** in settings
4. Ask: *"What's the status of field 12?"*
5. You should get a contextual agricultural response

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED :8000` | Start RAG service: `python main.py` |
| `ECONNREFUSED :3000` | Start Chat API: `node test-server.js` |
| `Embedding unavailable` | Check `OPENAI_API_KEY` in `.env` or use `EMBEDDING_PROVIDER=local` |
| Chat returns errors | Verify API key is set in the chat settings |

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (:5173)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐│
│  │ Chat Drawer │  │  FieldVisit │  │      FarmMap         ││
│  └──────┬──────┘  └─────────────┘  └──────────────────────┘│
│         │                                                   │
└─────────┼───────────────────────────────────────────────────┘
          │
    ┌─────▼─────┐         ┌─────────────────┐
    │  /api/*   │────────▶│ Chat API :3000  │──▶ OpenAI/Claude
    │  Proxy    │         └─────────────────┘
    └───────────┘
          │
    ┌─────▼────────────┐
    │ RAG Service :8000 │──▶ ChromaDB + SQLite
    └──────────────────┘
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server/rag_service/main.py` | RAG API with semantic search |
| `apps/web/test-server.js` | LLM proxy for OpenAI/Claude |
| `apps/web/src/lib/llm/LLMProvider.ts` | Frontend LLM orchestration |
| `apps/web/src/lib/services/ragClient.ts` | RAG client |
