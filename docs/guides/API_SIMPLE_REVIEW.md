# 📋 api-simple.ts Review

## Current Implementation

### ✅ What's Working:
1. **Auto-detection** - Detects local server vs production
2. **Android support** - Uses production API automatically
3. **Fallback logic** - Falls back to production if local not running
4. **Simple parsing** - Reads full stream first (avoids JSON errors)

### ⚠️ Issues Found:

#### Issue 1: Placeholder URL
**Line 16 & 30:** Uses `'https://your-api-server.com'` as fallback
- This is a placeholder, not a real URL
- Will fail if no local server and no env var set

**Fix needed:** Set real production API URL or better error handling

#### Issue 2: No Error for Missing Production URL
**Problem:** If Android and no `VITE_API_URL`, uses placeholder URL
- Will fail silently or with unclear error

**Fix needed:** Better error message when production URL not configured

---

## Recommended Fixes

### Fix 1: Better Production URL Handling

```typescript
async function getApiBase(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const prodUrl = import.meta.env.VITE_API_URL;
    if (!prodUrl) {
      throw new Error('VITE_API_URL not set. Android requires production API URL.');
    }
    return prodUrl;
  }
  
  // Web - try local server first
  try {
    const response = await fetch('http://localhost:3000/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(1000)
    });
    if (response.ok) {
      return '/api';
    }
  } catch {
    // Local server not running
    const prodUrl = import.meta.env.VITE_API_URL;
    if (prodUrl) {
      return prodUrl; // Use production API
    }
    // No production URL either - show helpful error
    throw new Error('No API server available. Start local server (node test-server.js) or set VITE_API_URL.');
  }
  
  return '/api';
}
```

### Fix 2: Add Environment Variable Documentation

Create `.env.example`:
```
# Production API URL (required for Android builds)
VITE_API_URL=https://your-production-api.com

# Optional: Default password
VITE_APP_PASSWORD=Fotheringham933@
```

---

## Current Status

**File:** `apps/web/src/lib/api-simple.ts`
**Lines:** 150
**Status:** ✅ Working, but needs production URL configuration

**What works:**
- ✅ Auto-detection logic
- ✅ Local server detection
- ✅ Stream parsing (reads full response first)

**What needs:**
- ⚠️ Real production API URL (replace placeholder)
- ⚠️ Better error messages for missing config

---

## Next Steps

1. **Set production API URL** in `.env` file
2. **Deploy API server** to cloud (Vercel, Railway, etc.)
3. **Update placeholder** with real URL
4. **Test Android build** with production API

**Would you like me to:**
- Fix the placeholder URL issue?
- Add better error handling?
- Set up environment variable configuration?



