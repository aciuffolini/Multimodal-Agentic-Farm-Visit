# Fix: Chat API Key Not Being Sent

## Problem
Server logs show:
- `API Key: ❌ NOT PROVIDED`
- `Messages: 0` (should be 1)
- `content-length: 28` (too small for a chat request)

## Root Cause
The API key is saved in localStorage, but either:
1. `getUserApiKey()` is not finding it
2. The header is not being sent (proxy issue?)
3. The request body is malformed

## Quick Fix

### Step 1: Verify API Key in Browser Console

Open browser console (F12) and run:

```javascript
// Check if key exists
const key = localStorage.getItem('user_api_key');
console.log('API Key in localStorage:', key ? `${key.substring(0, 10)}...` : 'NOT SET');

// Check getUserApiKey function
import('./src/lib/config/userKey.js').then(m => {
  const apiKey = m.getUserApiKey();
  console.log('getUserApiKey() returns:', apiKey ? `${apiKey.substring(0, 10)}...` : 'EMPTY');
});
```

### Step 2: If Key is Missing, Set It

```javascript
localStorage.setItem('user_api_key', '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');
console.log('✅ API key set');
```

### Step 3: Test Direct API Call

```javascript
// Test if the API call works with the key
const key = localStorage.getItem('user_api_key');
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': key
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'test' }]
  })
})
.then(async r => {
  console.log('Status:', r.status);
  if (!r.ok) {
    const text = await r.text();
    console.error('Error:', text);
    return;
  }
  console.log('✅ Success! Check server logs for API key');
})
.catch(e => console.error('Error:', e));
```

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Send a chat message
3. Find `/api/chat` request
4. Check **Request Headers** - should show `X-API-Key: sk-...`
5. Check **Request Payload** - should show `messages: [{ role: 'user', content: '...' }]`

## If Still Not Working

The issue might be:
1. **Vite proxy not forwarding headers** - Check `vite.config.ts` proxy config
2. **Request being made before key is set** - Check timing in `ChatDrawer.tsx`
3. **Header case sensitivity** - Server looks for `x-api-key` (lowercase)

## Expected Behavior

After fix, server logs should show:
```
📨 Chat Request Received
   Messages: 1
   API Key: sk-iWUwfvz...ttfj
   ✅ Calling OpenAI API...
```

