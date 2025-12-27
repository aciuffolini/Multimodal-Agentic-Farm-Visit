# Farm Visit Agentic RAG System

A multimodal Agentic RAG system for agricultural farm visits, featuring a React frontend, Node.js Chat API, and Python RAG service with CLIP image embeddings.

## Project Structure

- **apps/web**: React Frontend (Vite) + Node.js Chat API
- **server/rag_service**: Python RAG Service (FastAPI + ChromaDB + SQLite)
- **docs**: Architecture and strategy documentation

## Prerequisites

- Node.js 18+
- Python 3.10+
- `uv` (Recommended for Python package management)
- `pnpm` (Recommended for Node.js)

## Quick Start

1. **Install Dependencies**
   ```bash
   # Frontend
   cd apps/web
   pnpm install

   # Backend (using uv)
   cd ../../server/rag_service
   uv pip install -r requirements.txt
   ```

2. **Configure Environment**
   - Copy `.env.example` to `.env` in `apps/web` and `server/rag_service`
   - Set your `OPENAI_API_KEY`

3. **Start System**
   ```powershell
   cd apps/web
   .\start-all-servers.ps1
   ```

## Architecture

- **RAG Service (8000)**: Manages visit records, text embeddings (ChromaDB), and image embeddings (CLIP).
- **Chat API (3000)**: Proxies LLM requests (OpenAI/Anthropic).
- **Web Client (5173)**: Offensive-offline PWA for data collection and AI chat.

## Multimodal Features (Phase 1)

- **Dual Vector Store**: Text search + Image search (ready).
- **CLIP Embeddings**: Image analysis support (currently requires clean env on Windows).
- **Field Data**: GPS-tagged photo metadata extraction.
