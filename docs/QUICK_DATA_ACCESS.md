# 🚀 Quick Data Access Guide

## ⚠️ IMPORTANT: Where to Run Commands

The `check-database.js` script runs in the **BROWSER CONSOLE**, not PowerShell!

---

## 🌐 Method 1: Browser Console (Recommended)

### Steps:
1. **Open your app:** http://localhost:5173
2. **Press F12** (opens DevTools)
3. **Click "Console" tab**
4. **Copy and paste** the entire `apps/web/check-database.js` file content
5. **Press Enter**
6. **Wait for:** `✅ Database helpers loaded!`
7. **Then run:** `checkDB.list()`

### Example:
```
Browser Console (F12):
> [paste check-database.js content]
✅ Database helpers loaded!

> checkDB.list()
📊 Found 1 records:
1. 19/12/2025, 08:57:17
   ID: b1e90914-6960-4072-a6ea-501f9787f973
   Field: feedlot | Crop: -
   ...
```

---

## 🔍 Method 2: Direct Browser DevTools (No Script Needed)

### Steps:
1. **Open:** http://localhost:5173
2. **Press F12**
3. **Go to "Application" tab** (Chrome/Edge) or "Storage" tab (Firefox)
4. **Expand:** IndexedDB → FarmVisitDB → visits
5. **Click on a record** to see all data

**This shows everything visually!**

---

## 💻 Method 3: PowerShell (If You Want Terminal Access)

Since IndexedDB is browser-only, you can't access it directly from PowerShell. But you can:

### Option A: Export via Browser, Then Check File
```powershell
# After exporting JSON from browser:
cd C:\Users\Atilio\projects\agents\7_farm_visit
Get-Content farm_records_*.json | ConvertFrom-Json | Select-Object -First 5
```

### Option B: Use Node.js Script (if you want)
I can create a Node.js script that reads IndexedDB, but it's complex. Browser console is easier!

---

## 🎯 Quick Browser Console Commands

**After loading check-database.js in browser:**

```javascript
// List all records
checkDB.list()

// Get statistics
checkDB.stats()

// Get specific record
checkDB.get('b1e90914-6960-4072-a6ea-501f9787f973')

// Check AI queue
checkDB.checkQueue()

// Check localStorage
checkDB.checkLocalStorage()
```

---

## 📋 Step-by-Step: First Time Setup

1. ✅ **Start dev server:**
   ```powershell
   cd apps/web
   pnpm run dev
   ```

2. ✅ **Open browser:** http://localhost:5173

3. ✅ **Open DevTools:** Press `F12`

4. ✅ **Go to Console tab**

5. ✅ **Copy script:** Open `apps/web/check-database.js` in your editor, copy ALL content

6. ✅ **Paste in console:** Right-click in console → Paste (or Ctrl+V)

7. ✅ **Press Enter**

8. ✅ **Wait for:** `✅ Database helpers loaded!`

9. ✅ **Run:** `checkDB.list()`

---

## 🔧 Troubleshooting

### "checkDB is not defined"
- **Fix:** You need to paste the `check-database.js` script first
- Make sure you see: `✅ Database helpers loaded!`

### "Cannot find module"
- **Fix:** Make sure you're on http://localhost:5173
- Make sure dev server is running

### PowerShell Error (what you saw)
- **Fix:** Don't run JavaScript in PowerShell!
- Use browser console instead (F12)

---

## 💡 Visual Guide

```
┌─────────────────────────────────────────┐
│  Browser Window                         │
│  http://localhost:5173                  │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Your App (left side)            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  DevTools (F12)                   │ │
│  │  ┌─────────────────────────────┐  │ │
│  │  │ Console Tab ← CLICK HERE   │  │ │
│  │  └─────────────────────────────┘  │ │
│  │  [Paste check-database.js here]   │ │
│  │  [Press Enter]                    │ │
│  │  [Wait for: ✅ Database helpers]  │ │
│  │  [Type: checkDB.list()]          │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## ✅ Quick Test

**In browser console (F12):**

```javascript
// Quick test without helper script
import('./src/lib/db.ts').then(async ({ visitDB }) => {
  const records = await visitDB.list(5);
  console.log(`Found ${records.length} records`);
  records.forEach(r => {
    console.log(`${new Date(r.ts).toLocaleString()} - ${r.field_id || 'No field'}`);
  });
});
```

This works immediately - no script needed!

