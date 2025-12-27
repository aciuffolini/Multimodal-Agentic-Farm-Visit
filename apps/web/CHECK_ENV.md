# ✅ Check Your .env File

## Current Status

✅ **`.gitignore`** - Properly configured (`.env` is ignored)  
✅ **Code updated** - Reads from `VITE_OPENAI_API_KEY` and `VITE_RAG_SERVER_URL`  
⚠️ **`.env` file** - Needs to be created

---

## Create Your .env File

**Location:** `apps/web/.env`

**Content:**
```env
# OpenAI API Key (Client-Side)
VITE_OPENAI_API_KEY=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

# RAG Service URL
VITE_RAG_SERVER_URL=http://localhost:8000

# Chat API URL (leave empty to use proxy)
VITE_API_URL=
```

---

## Quick Setup Commands

**Windows PowerShell:**
```powershell
cd apps/web
@"
VITE_OPENAI_API_KEY=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
VITE_RAG_SERVER_URL=http://localhost:8000
VITE_API_URL=
"@ | Out-File -FilePath .env -Encoding utf8
```

**Windows CMD:**
```cmd
cd apps\web
echo VITE_OPENAI_API_KEY=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 > .env
echo VITE_RAG_SERVER_URL=http://localhost:8000 >> .env
echo VITE_API_URL= >> .env
```

**Linux/Mac:**
```bash
cd apps/web
cat > .env << EOF
VITE_OPENAI_API_KEY=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
VITE_RAG_SERVER_URL=http://localhost:8000
VITE_API_URL=
EOF
```

---

## Verify .env File

**Check if file exists:**
```bash
# Windows
dir apps\web\.env

# Linux/Mac
ls -la apps/web/.env
```

**Check contents (without exposing key):**
```bash
# Windows PowerShell
Get-Content apps/web/.env | Select-String "VITE_"

# Linux/Mac
grep "VITE_" apps/web/.env
```

---

## Verify It's Working

**After creating .env and restarting dev server:**

**In browser console (F12):**
```javascript
// Check if env vars are loaded
console.log('VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('VITE_RAG_SERVER_URL:', import.meta.env.VITE_RAG_SERVER_URL || 'Not set');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL || 'Not set (using proxy)');
```

**Expected output:**
```
VITE_OPENAI_API_KEY: ✅ Set
VITE_RAG_SERVER_URL: http://localhost:8000
VITE_API_URL: Not set (using proxy)
```

---

## Environment Variables Used

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `VITE_OPENAI_API_KEY` | Client-side AI processing | - | ✅ Yes (for AI features) |
| `VITE_RAG_SERVER_URL` | RAG service URL | `http://localhost:8000` | ⚠️ Optional |
| `VITE_API_URL` | Chat API URL | `/api` (proxy) | ⚠️ Optional |

---

## Important Notes

1. **`.env` is in `.gitignore`** ✅ - Won't be committed to git
2. **Restart dev server** after creating/updating `.env`
3. **Vite prefix required** - All env vars must start with `VITE_` to be exposed to browser
4. **Security** - These values are bundled into the app (public in browser)

---

## Troubleshooting

### "Env var not loading"
- ✅ Check file is named exactly `.env` (not `.env.txt`)
- ✅ Check file is in `apps/web/` directory
- ✅ Restart dev server after creating/updating
- ✅ Check variable name starts with `VITE_`

### "API key not working"
- ✅ Check key is correct (no extra spaces)
- ✅ Check key starts with `sk-`
- ✅ Verify in browser console: `import.meta.env.VITE_OPENAI_API_KEY`

---

## Summary

✅ **`.gitignore`** - Correctly configured  
✅ **Code** - Updated to read from env vars  
⚠️ **Action needed:** Create `apps/web/.env` file with your API key

