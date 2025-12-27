# 🧪 Testing Guide: Offline AI Processing & Export

## Prerequisites

1. **Start both servers:**
   ```powershell
   # Terminal 1: API Server
   cd apps/web
   node test-server.js
   
   # Terminal 2: Dev Server
   cd apps/web
   pnpm run dev
   ```

2. **Set API Key:**
   - Open app in browser: http://localhost:5173
   - Click 🔑 button in chat drawer
   - Enter your OpenAI API key
   - Save

---

## Test 1: Offline Capture → Queue Processing

### Steps:
1. **Disconnect internet** (or use DevTools → Network → Offline)
2. **Capture a visit:**
   - Get GPS
   - Take a photo
   - Record audio (optional)
   - Add a note
   - Click "Save Visit"
3. **Check console:**
   ```
   [FieldVisit] Saved visit with photo: Yes (...)
   [FieldVisit] Queued AI processing for offline/online completion
   [AIQueue] Queued photo_description processing for record abc123
   ```
4. **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Look for `farm_visit_ai_queue_v1`
   - Should see queued task

### Expected Result:
✅ Visit saved to IndexedDB
✅ AI task queued in localStorage
✅ No errors in console

---

## Test 2: Online Processing (Auto-Complete)

### Steps:
1. **Reconnect internet** (or disable Network Offline in DevTools)
2. **Watch console:**
   ```
   [AIQueue] Connectivity restored, processing queue...
   [AIQueue] Processing 1 queued tasks...
   [AIQueue] ✅ Processed task xyz789 for record abc123
   [AIQueue] Updated record abc123 with AI index
   ```
3. **Check database:**
   - Open DevTools → Application → IndexedDB → FarmVisitDB → visits
   - Find your record
   - Should have `photo_caption` and `audio_transcript` fields

### Expected Result:
✅ Queue automatically processes
✅ Record updated with AI index
✅ Task removed from queue

---

## Test 3: Export with AI Index

### Steps:
1. **Ensure you have records with AI index** (from Test 2)
2. **Open browser console** and run:
   ```javascript
   // Import export service
   import { ExportService } from './lib/export';
   import { visitDB } from './lib/db';
   
   // Get records
   const records = await visitDB.list(10);
   
   // Export with AI index
   const apiKey = localStorage.getItem('user_api_key');
   const service = new ExportService(apiKey);
   const result = await service.export(records, {
     format: 'json',
     includeMedia: true,
     mediaFormat: 'embedded',
     generateIndex: true,
     apiKey: apiKey
   });
   
   // Download
   const blob = new Blob([result.data], { type: result.mimeType });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = result.filename;
   a.click();
   ```
3. **Check exported JSON:**
   - Open the downloaded file
   - Should see `index` field with `photo_caption` and `audio_transcript`
   - Should see `raw_media` with full base64 data

### Expected Result:
✅ JSON export includes AI index
✅ Raw media preserved
✅ File downloads successfully

---

## Test 4: CSV Export (Metadata Only)

### Steps:
1. **In browser console:**
   ```javascript
   const records = await visitDB.list(10);
   const service = new ExportService(apiKey);
   const result = await service.export(records, {
     format: 'csv',
     includeMedia: false,
     generateIndex: false
   });
   
   // Download CSV
   const blob = new Blob([result.data], { type: 'text/csv' });
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = result.filename;
   a.click();
   ```
2. **Open CSV in Excel:**
   - Should see all metadata columns
   - Should see `photo_caption` and `audio_transcript` if available
   - Media files referenced (not embedded)

### Expected Result:
✅ CSV exports successfully
✅ Human-readable in Excel
✅ Includes AI-generated captions/transcripts

---

## Test 5: ZIP Export (Complete Package)

### Steps:
1. **In browser console:**
   ```javascript
   const records = await visitDB.list(10);
   const service = new ExportService(apiKey);
   const result = await service.export(records, {
     format: 'zip',
     includeMedia: true,
     mediaFormat: 'separate',
     generateIndex: true,
     apiKey: apiKey
   });
   
   // Download ZIP
   const blob = result.data;
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = result.filename;
   a.click();
   ```
2. **Extract ZIP:**
   - Should contain: `records.csv`, `records.json`, `media/` folder
   - Media files should be separate files
   - README.txt should explain structure

### Expected Result:
✅ ZIP exports successfully
✅ Contains all files
✅ Media files separate

---

## Test 6: Queue Status Check

### Steps:
1. **In browser console:**
   ```javascript
   import { getAIProcessingQueue } from './lib/export';
   
   const queue = getAIProcessingQueue();
   const status = queue.getStatus();
   console.log('Queue status:', status);
   // Should show: { queued: 0, processing: false }
   ```

### Expected Result:
✅ Can check queue status
✅ Returns correct counts

---

## Troubleshooting

### Issue: Queue not processing
- **Check:** Is API key set? `localStorage.getItem('user_api_key')`
- **Check:** Is internet connected? `navigator.onLine`
- **Check:** Console for errors

### Issue: Export fails
- **Check:** Are there records in database?
- **Check:** Is JSZip installed? (for ZIP export)
- **Check:** Console for errors

### Issue: AI processing fails
- **Check:** API key is valid
- **Check:** OpenAI API quota/limits
- **Check:** Network connectivity

---

## Quick Test Script

Run this in browser console after starting dev server:

```javascript
// Quick test
(async () => {
  console.log('🧪 Testing Export System...');
  
  // 1. Check records
  const { visitDB } = await import('./lib/db');
  const records = await visitDB.list(5);
  console.log(`✅ Found ${records.length} records`);
  
  // 2. Check queue
  const { getAIProcessingQueue } = await import('./lib/export');
  const queue = getAIProcessingQueue();
  const status = queue.getStatus();
  console.log(`✅ Queue status:`, status);
  
  // 3. Test export (if records exist)
  if (records.length > 0) {
    const { ExportService } = await import('./lib/export');
    const apiKey = localStorage.getItem('user_api_key') || '';
    const service = new ExportService(apiKey);
    
    try {
      const result = await service.export(records, {
        format: 'json',
        includeMedia: false, // Faster for testing
        generateIndex: false,
      });
      console.log(`✅ Export successful: ${result.filename} (${result.sizeBytes} bytes)`);
      console.log(`   Records: ${result.totalRecords}, Photos: ${result.recordsWithPhotos}`);
    } catch (err) {
      console.error('❌ Export failed:', err);
    }
  }
  
  console.log('✅ Test complete!');
})();
```

