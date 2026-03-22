# 🔧 Setting Up .env File

## Quick Setup

1. **Copy the example file:**
   ```bash
   cd apps/web
   cp .env.example .env
   ```

2. **The .env file is already configured with your API key!**

3. **Restart the dev server** for changes to take effect:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart:
   pnpm run dev
   ```

---

## What's Configured

Your `.env.example` includes:
- ✅ `VITE_OPENAI_API_KEY` - Your OpenAI API key (for client-side AI processing)
- ✅ `VITE_RAG_SERVER_URL` - RAG service URL (http://localhost:8000)
- ✅ `VITE_API_URL` - Chat API URL (empty = use proxy)

---

## How It Works

The app now checks for API key in this order:
1. **Environment variable** (`VITE_OPENAI_API_KEY` from `.env`) ← **NEW!**
2. **localStorage** (`user_api_key`) - fallback

This means:
- ✅ You can set it once in `.env` file
- ✅ It works automatically when dev server starts
- ✅ No need to set in browser console each time
- ✅ Still works if set in localStorage (for runtime changes)

---

## For RAG Service (Server-Side)

The RAG service still needs the API key as an environment variable:

**PowerShell:**
```powershell
$env:OPENAI_API_KEY="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"
cd server/rag_service
python main.py
```

**Or use the script:**
```bash
cd server/rag_service
start-with-key.bat
```

---

## Verify It's Working

**Check if env var is loaded:**
```javascript
// In browser console
console.log('API Key from env:', import.meta.env.VITE_OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('API Key from localStorage:', localStorage.getItem('user_api_key') ? '✅ Set' : '❌ Not set');
```

**The app will use whichever is available!**

---

## Security Note

⚠️ **The API key in `.env` is exposed to the browser** (Vite bundles it into the app).

For production:
- Consider using a proxy server
- Or set key in localStorage at runtime
- Never commit `.env` to git (it's in `.gitignore`)

---

## Summary

✅ **Client-side:** Set in `.env` file → `VITE_OPENAI_API_KEY`  
✅ **Server-side:** Set as environment variable → `OPENAI_API_KEY`  
✅ **Both use the same key** (one key, two places)


