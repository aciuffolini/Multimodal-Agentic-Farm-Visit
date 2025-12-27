# 📍 Where is My Saved Data?

## 🗄️ Data Storage Location

Your field visit data is stored in **IndexedDB** (browser's local database) on your device.

---

## 🔍 Method 1: Browser DevTools (Visual)

### Chrome/Edge:
1. **Open DevTools:** Press `F12`
2. **Go to Application tab** (or Storage in Firefox)
3. **Expand IndexedDB** → **FarmVisitDB** → **visits**
4. **Click on a record** to see all data

### What You'll See:
```
IndexedDB
└── FarmVisitDB
    └── visits (table)
        ├── Record 1
        │   ├── id: "abc123..."
        │   ├── ts: 1734523200000
        │   ├── field_id: "feedlot"
        │   ├── photo_data: "data:image/jpeg;base64,..."
        │   ├── audio_data: "data:audio/webm;base64,..."
        │   ├── photo_caption: "Corn field with..."
        │   └── ...
        └── Record 2
```

---

## 🔍 Method 2: Browser Console (Programmatic)

### Quick Check:
```javascript
// Import database helper
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(10);
  console.table(records.map(r => ({
    id: r.id.substring(0, 8) + '...',
    date: new Date(r.ts).toLocaleString(),
    field: r.field_id,
    photo: r.photo_present ? '✅' : '❌',
    aiIndexed: r.ai_indexed ? '✅' : '❌'
  })));
});
```

### Get Specific Record:
```javascript
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const record = await visitDB.get('b1e90914-6960-4072-a6ea-501f9787f973');
  console.log(record);
});
```

---

## 🔍 Method 3: Use Helper Script (Easiest!)

1. **Open:** http://localhost:5173
2. **Press F12** → Console tab
3. **Copy and paste** the entire `apps/web/check-database.js` file
4. **Run commands:**
   ```javascript
   checkDB.list()              // List all records
   checkDB.get('record-id')    // Get specific record
   checkDB.stats()             // Get statistics
   ```

---

## 📂 Physical Location (Windows)

IndexedDB is stored in your browser's profile folder:

**Chrome/Edge:**
```
C:\Users\Atilio\AppData\Local\Microsoft\Edge\User Data\Default\IndexedDB\
```

**Firefox:**
```
C:\Users\Atilio\AppData\Roaming\Mozilla\Firefox\Profiles\...\storage\default\
```

**Note:** These files are binary and not human-readable. Use DevTools or console instead!

---

## 💾 Export Your Data

### Export to JSON:
```javascript
import('./src/lib/export/index.ts').then(async ({ ExportService }) => {
  const { visitDB } = await import('./src/lib/db.ts');
  const records = await visitDB.list(1000);
  const service = new ExportService();
  const result = await service.export(records, {
    format: 'json',
    includeMedia: true,
    mediaFormat: 'embedded'
  });
  
  // Download
  const blob = new Blob([result.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  a.click();
});
```

### Export to CSV:
```javascript
// Same as above, but format: 'csv'
```

### Export to ZIP:
```javascript
// Same as above, but format: 'zip'
// Includes CSV + JSON + separate media files
```

---

## 🔄 Data Persistence

- ✅ **Survives browser restart** - Data persists
- ✅ **Survives app updates** - IndexedDB is persistent
- ⚠️ **Cleared if:** User clears browser data, uses incognito mode, or uninstalls app

---

## 📊 What Data is Stored?

Each record contains:
- **Metadata:** id, timestamp, field_id, crop, issue, severity, note
- **Location:** lat, lon, accuracy
- **Media:** photo_data (base64), audio_data (base64)
- **AI Index:** photo_caption, audio_transcript, audio_summary
- **Sync Status:** synced (true/false)

---

## 🚨 Clear Data (if needed)

### Via Console:
```javascript
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  if (confirm('Clear all records?')) {
    await visitDB.clear();
    console.log('✅ Cleared');
  }
});
```

### Via Helper:
```javascript
checkDB.clear(); // Will ask for confirmation
```

---

## 💡 Quick Access Commands

**List all records:**
```javascript
checkDB.list()
```

**Get statistics:**
```javascript
checkDB.stats()
```

**Check AI queue:**
```javascript
checkDB.checkQueue()
```

**Check localStorage queues:**
```javascript
checkDB.checkLocalStorage()
```

