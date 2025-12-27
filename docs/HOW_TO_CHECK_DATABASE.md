# 🔍 How to Check the Database

## Quick Method: Use Helper Script

1. **Open app:** http://localhost:5173
2. **Open DevTools:** Press `F12`
3. **Go to Console tab**
4. **Load helper script:**
   ```javascript
   // Copy and paste the entire content of apps/web/check-database.js
   // Or just run:
   ```
5. **Use helper commands:**
   ```javascript
   checkDB.list()              // List all records
   checkDB.stats()             // Get statistics
   checkDB.checkQueue()        // Check AI queue
   checkDB.checkLocalStorage() // Check localStorage
   checkDB.get('record-id')    // Get specific record
   ```

---

## Manual Method: Browser DevTools

### 1. Check IndexedDB (Main Database)

**Steps:**
1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Expand **IndexedDB** → **FarmVisitDB** → **visits**
4. Click on a record to see its data

**What to look for:**
- ✅ `photo_data` - Should contain base64 image
- ✅ `audio_data` - Should contain base64 audio
- ✅ `photo_caption` - AI-generated caption (if processed)
- ✅ `audio_transcript` - AI-generated transcript (if processed)
- ✅ `ai_indexed` - Should be `true` if AI processing complete
- ✅ `synced` - Should be `true` if synced to server

---

### 2. Check localStorage (Queues)

**Steps:**
1. DevTools → **Application** tab
2. Expand **Local Storage** → `http://localhost:5173`
3. Look for:
   - `farm_visit_ai_queue_v1` - AI processing queue
   - `farm_visit_outbox_v1` - Server sync queue

**What to look for:**
- AI Queue: Array of tasks waiting to be processed
- Outbox: Array of API requests waiting to be sent

---

## Console Commands (Direct)

### List Records
```javascript
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(10);
  console.table(records.map(r => ({
    id: r.id,
    date: new Date(r.ts).toLocaleString(),
    field: r.field_id,
    crop: r.crop,
    photo: r.photo_present ? '✅' : '❌',
    audio: r.audio_data ? '✅' : '❌',
    aiIndexed: r.ai_indexed ? '✅' : '❌',
    synced: r.synced ? '✅' : '⏳'
  })));
});
```

### Get Specific Record
```javascript
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const record = await visitDB.get('your-record-id');
  console.log(record);
});
```

### Check AI Queue
```javascript
import('./src/lib/export/index.ts').then(async ({ getAIProcessingQueue }) => {
  const queue = getAIProcessingQueue();
  const tasks = queue.list();
  const status = queue.getStatus();
  console.log('Queue status:', status);
  console.log('Tasks:', tasks);
});
```

### Check Statistics
```javascript
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(1000);
  const stats = {
    total: records.length,
    withPhotos: records.filter(r => r.photo_present).length,
    withAudio: records.filter(r => r.audio_data).length,
    aiIndexed: records.filter(r => r.ai_indexed).length,
    synced: records.filter(r => r.synced).length,
    withCaptions: records.filter(r => r.photo_caption).length,
    withTranscripts: records.filter(r => r.audio_transcript).length,
  };
  console.table(stats);
});
```

---

## What to Verify After Saving

### ✅ After Clicking "Save Visit"

1. **Check console logs:**
   ```
   [FieldVisit] Saved visit with photo: Yes (...)
   [FieldVisit] Queued AI processing for offline/online completion
   [AIQueue] Queued photo_description processing for record abc123
   ```

2. **Check IndexedDB:**
   - New record should appear in `visits` table
   - Should have `photo_data` and/or `audio_data`
   - `ai_indexed` should be `false` initially
   - `synced` should be `false` initially

3. **Check localStorage:**
   - `farm_visit_ai_queue_v1` should have a new task
   - Task should have `recordId` matching the saved record

### ✅ After Going Online (if was offline)

1. **Check console logs:**
   ```
   [AIQueue] Connectivity restored, processing queue...
   [AIQueue] Processing 1 queued tasks...
   [AIQueue] ✅ Processed task xyz789 for record abc123
   [AIQueue] Updated record abc123 with AI index
   ```

2. **Check IndexedDB:**
   - Record should now have `photo_caption` (if had photo)
   - Record should now have `audio_transcript` (if had audio)
   - `ai_indexed` should be `true`
   - Task should be removed from queue

3. **Check localStorage:**
   - `farm_visit_ai_queue_v1` should be empty (or have fewer tasks)

---

## Troubleshooting

### Issue: Record saved but no AI processing
**Check:**
- Is API key set? `localStorage.getItem('user_api_key')`
- Does record have photo or audio?
- Check console for errors

### Issue: AI processing stuck
**Check:**
- Is internet connected? `navigator.onLine`
- Check queue: `checkDB.checkQueue()`
- Check retry count (should be < 3)

### Issue: Record not in database
**Check:**
- Check console for errors during save
- Try saving again
- Check IndexedDB quota (might be full)

---

## Quick Test

Run this after saving a visit:

```javascript
// Quick check
(async () => {
  const { visitDB } = await import('./src/lib/db.ts');
  const { getAIProcessingQueue } = await import('./src/lib/export/index.ts');
  
  const records = await visitDB.list(5);
  const latest = records[0];
  
  console.log('Latest record:', {
    id: latest.id,
    hasPhoto: !!latest.photo_data,
    hasAudio: !!latest.audio_data,
    aiIndexed: latest.ai_indexed,
    photoCaption: latest.photo_caption?.substring(0, 50),
  });
  
  const queue = getAIProcessingQueue();
  const queued = queue.list().filter(t => t.recordId === latest.id);
  console.log('In queue:', queued.length > 0);
})();
```

