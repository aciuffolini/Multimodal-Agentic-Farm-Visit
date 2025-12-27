# Sync Issues Fix

## 🐛 Issues Found and Fixed

### 1. **Whisper API 400 Errors**
**Problem:** Audio transcription failing with 400 Bad Request

**Root Causes:**
- File format detection issues
- Missing proper error handling
- File size not checked (25MB limit)

**Fixes Applied:**
- ✅ Better mime type detection and mapping
- ✅ Proper file extension handling for Whisper API
- ✅ File size validation (25MB limit)
- ✅ Better error messages with API response details
- ✅ Don't set Content-Type header (let browser set it with boundary)

**File:** `apps/web/src/lib/export/MediaProcessor.ts`

---

### 2. **Sync Status Showing "Not Synced"**
**Problem:** Records show as not synced even though media and ChromaDB are updated

**Root Causes:**
- `markSynced()` was setting `syncStatus: 'synced'` but schema expects `'completed'`
- UI was checking `r.synced` (boolean) instead of `r.syncStatus` (string)
- Media upload failures were blocking sync completion

**Fixes Applied:**
- ✅ Changed `markSynced()` to use `syncStatus: 'completed'`
- ✅ Updated UI to check `syncStatus` with proper states (✅ completed, 🔄 in_progress, ❌ failed, ⏳ pending)
- ✅ Media upload failures no longer block sync completion (non-blocking)
- ✅ Better error logging for sync failures

**Files:**
- `apps/web/src/lib/db.ts` - Fixed `markSynced()`
- `apps/web/src/components/FieldVisit.tsx` - Fixed UI display
- `apps/web/src/lib/queues/SyncQueue.ts` - Non-blocking media upload

---

### 3. **Photo Caption Not Being Requested**
**Problem:** Photo captions not being generated

**Status:** ✅ Already working - photo caption generation is in AI queue

**Verification:**
- Check `AIProcessingQueue.ts` - photo caption task is queued correctly
- Check console for `[AIQueue] Processed task photo_caption` messages
- Photo caption should be generated when API key is available

---

### 4. **Text Not Saving (Audio Transcript)**
**Problem:** Audio transcript returning empty strings

**Root Cause:** Whisper API 400 errors causing transcription to fail silently

**Fix:** 
- ✅ Better error handling in `transcribeAudio()`
- ✅ Returns empty transcript but logs error details
- ✅ Summary shows "Audio available (transcription failed: [error])"

**Note:** If Whisper API continues to fail, check:
- API key is valid
- Audio file format is supported (webm, mp3, wav, m4a, mp4)
- File size is under 25MB
- Network connectivity

---

## 🔍 How to Verify Fixes

### 1. Check Sync Status
```javascript
// In browser console
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(10);
  records.forEach(r => {
    console.log(`${r.id}: ${r.syncStatus} (syncedAt: ${r.syncedAt ? new Date(r.syncedAt).toISOString() : 'null'})`);
  });
});
```

### 2. Check Whisper API Errors
- Open browser console
- Look for `[MediaProcessor] Audio transcription failed:` messages
- Check error details - should now show specific API error message

### 3. Check Photo Caption Generation
```javascript
// In browser console
import('./src/lib/queues/AIProcessingQueue.ts').then(async ({ getAIProcessingQueue }) => {
  const queue = getAIProcessingQueue();
  const tasks = await queue.getQueuedTasks();
  console.log('Queued AI tasks:', tasks);
});
```

### 4. Check Sync Queue Status
```javascript
// In browser console
import('./src/lib/queues/SyncQueue.ts').then(async ({ getSyncQueue }) => {
  const queue = getSyncQueue();
  const status = await queue.getStatus();
  console.log('Sync status:', status);
});
```

---

## 📝 Summary of Changes

1. **Whisper API Fixes:**
   - Better format detection
   - File size validation
   - Improved error messages
   - Proper FormData handling

2. **Sync Status Fixes:**
   - Use `'completed'` instead of `'synced'`
   - UI checks `syncStatus` instead of `synced` boolean
   - Non-blocking media upload
   - Better error handling

3. **Error Handling:**
   - All errors now logged with details
   - Failures don't block other operations
   - User-friendly error messages

---

## ✅ Expected Behavior After Fix

1. **Sync Status:**
   - Records show ✅ when synced
   - Records show 🔄 when syncing
   - Records show ❌ when failed
   - Records show ⏳ when pending

2. **Whisper API:**
   - Better error messages if transcription fails
   - File size validation prevents oversized uploads
   - Proper format handling

3. **Media Upload:**
   - Photo and audio upload failures don't block sync
   - Sync completes even if media upload fails
   - Errors logged but don't crash sync

---

## 🚀 Next Steps

1. **Test sync flow:**
   - Save a visit with photo and audio
   - Check sync status updates correctly
   - Verify media files are uploaded
   - Check ChromaDB has embeddings

2. **Test Whisper API:**
   - Record audio
   - Check console for transcription errors
   - Verify transcript is saved (or error is logged)

3. **Monitor logs:**
   - Check browser console for sync/AI queue messages
   - Check RAG service logs for embedding generation
   - Verify all operations complete successfully

