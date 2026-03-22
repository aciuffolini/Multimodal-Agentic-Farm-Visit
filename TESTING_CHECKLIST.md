# ✅ Testing Checklist - Before Commit

## 🚀 Quick Start

1. **Start servers:**
   ```powershell
   # Terminal 1
   cd apps/web
   node test-server.js
   
   # Terminal 2  
   cd apps/web
   pnpm run dev
   ```

2. **Open app:** http://localhost:5173

---

## ✅ Pre-Test Checks

- [ ] **No TypeScript errors** (already verified ✅)
- [ ] **Shared package builds** (already verified ✅)
- [ ] **Dev server starts** (test now)
- [ ] **App loads in browser** (test now)

---

## 🧪 Test Scenarios

### Test 1: Basic Functionality
- [ ] App loads without errors
- [ ] Can capture GPS
- [ ] Can take photo
- [ ] Can record audio
- [ ] Can save visit
- [ ] Visit appears in "Recent Records"

### Test 2: Offline AI Queue
- [ ] Set API key in chat drawer (🔑 button)
- [ ] Go offline (DevTools → Network → Offline)
- [ ] Save a visit with photo
- [ ] Check console: Should see `[AIQueue] Queued...`
- [ ] Check localStorage: `farm_visit_ai_queue_v1` should exist
- [ ] Go online
- [ ] Check console: Should see `[AIQueue] Processing...`
- [ ] Check database: Record should have `photo_caption` field

### Test 3: Export System
- [ ] Open browser console (F12)
- [ ] Run test script (see below)
- [ ] JSON export works
- [ ] CSV export works (optional)
- [ ] ZIP export works (optional)

---

## 🔧 Quick Test Script

**In browser console (F12):**

```javascript
// Quick export test
(async () => {
  const { visitDB } = await import('./src/lib/db.ts');
  const { ExportService } = await import('./src/lib/export/index.ts');
  
  const records = await visitDB.list(5);
  console.log(`Found ${records.length} records`);
  
  if (records.length > 0) {
    const apiKey = localStorage.getItem('user_api_key') || '';
    const service = new ExportService(apiKey);
    
    const result = await service.export(records, {
      format: 'json',
      includeMedia: false,
      generateIndex: false,
    });
    
    console.log('✅ Export successful!', result);
    
    // Download
    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
  }
})();
```

---

## 🐛 Common Issues

### Issue: Import errors in console
**Fix:** Make sure you're using `.ts` extension in imports, or check Vite config

### Issue: AI queue not processing
**Check:**
- API key is set: `localStorage.getItem('user_api_key')`
- Internet is connected: `navigator.onLine`
- Check console for errors

### Issue: Export fails
**Check:**
- Are there records? `await visitDB.list()`
- Check console for specific error

---

## 📝 What to Verify

1. ✅ **No build errors**
2. ✅ **App loads and works**
3. ✅ **Offline queue works** (queues when offline, processes when online)
4. ✅ **Export works** (at least JSON format)
5. ✅ **No console errors** (except expected warnings)

---

## 🎯 Ready to Commit?

Once all tests pass:
- [ ] All functionality works
- [ ] No console errors
- [ ] Export generates valid files
- [ ] Offline queue processes correctly

**Then:** `git add -A && git commit -m "feat: add scalable task template system and offline AI processing"`


