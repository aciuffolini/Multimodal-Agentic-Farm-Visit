# 🔑 Setting Up Your OpenAI API Key

## ⚠️ Security Note

**You've shared your API key publicly.** After setting this up, consider:
1. Rotating your key in OpenAI dashboard
2. Never commit keys to git
3. Use environment variables or secure storage

---

## ✅ Quick Setup

### 1. Client-Side (Browser) - For AI Processing

**In browser console (F12):**
```javascript
localStorage.setItem('user_api_key', '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');
console.log('✅ API key set for client-side AI processing');
```

**Or in your app settings/UI** (if you have a settings page)

---

### 2. Server-Side (RAG Service) - For Embeddings

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY="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"
cd server/rag_service
python main.py
```

**Windows CMD:**
```cmd
set OPENAI_API_KEY=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
cd server\rag_service
python main.py
```

**Linux/Mac:**
```bash
export OPENAI_API_KEY="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"
cd server/rag_service
python main.py
```

---

## 🧪 Test It Works

### Test Client-Side (Browser Console):
```javascript
// Check if key is set
console.log('Client API key:', localStorage.getItem('user_api_key') ? '✅ Set' : '❌ Not set');

// Test AI processing (should work automatically when you save a visit with photo/audio)
```

### Test Server-Side:
```bash
# Check if RAG service is running
curl http://localhost:8000/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## 🔄 Permanent Setup (Optional)

### Create `.env` file for RAG service:

**`server/rag_service/.env`:**
```
OPENAI_API_KEY=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
```

**Then update `main.py` to load from .env:**
```python
from dotenv import load_dotenv
load_dotenv()
```

**Install python-dotenv:**
```bash
pip install python-dotenv
```

---

## ✅ Verification Checklist

- [ ] Client API key set in localStorage
- [ ] Server API key set as environment variable
- [ ] RAG service running on port 8000
- [ ] Health check returns OK
- [ ] Records syncing to server
- [ ] Embeddings being generated

---

## 🚨 Security Best Practices

1. **Never commit keys to git:**
   - Add `.env` to `.gitignore`
   - Use environment variables
   - Use secrets management in production

2. **Rotate keys regularly:**
   - If key is exposed, rotate immediately
   - Set usage limits in OpenAI dashboard

3. **Use different keys for dev/prod:**
   - Separate keys for testing vs production
   - Monitor usage per key

---

## 📝 Next Steps

1. Set client key (browser console)
2. Start RAG service with server key
3. Save a visit with photo/audio
4. Check if sync queue processes
5. Verify embeddings in ChromaDB

