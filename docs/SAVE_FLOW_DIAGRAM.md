# 📊 Save Flow Diagram - What Triggers Processing

## 🔄 Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTIONS                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User captures data:                                         │
│     📍 Get GPS          → Stores in state (gps)                │
│     📷 Take Photo       → Stores in state (photo)              │
│     🎤 Record Audio     → Stores in state (audioUrl)           │
│     📝 Type Note        → Stores in state (note)               │
│                                                                 │
│  2. User clicks "Save Visit" button                             │
│     ↓                                                           │
│     TRIGGERS: openConfirmModal()                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 1: AI Field Extraction                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  openConfirmModal() calls:                                      │
│  └─> swarmTaskRouter.route("extract_fields", ...)              │
│      │                                                          │
│      ├─> Uses AI to extract:                                   │
│      │   • field_id from note/GPS                              │
│      │   • crop type                                           │
│      │   • issue description                                   │
│      │   • severity (if mentioned)                             │
│      │                                                          │
│      └─> Returns: extractedFields                              │
│                                                                 │
│  Creates baseFields with:                                       │
│  • Extracted fields (from AI)                                  │
│  • GPS coordinates                                             │
│  • Timestamp                                                   │
│  • Photo/audio presence flags                                  │
│                                                                 │
│  Opens: ConfirmFieldsModal (user can edit)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: User Confirms/Edits                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ConfirmFieldsModal shows:                                       │
│  • Field ID (editable)                                         │
│  • Crop (editable)                                             │
│  • Issue (editable)                                             │
│  • Severity (editable)                                         │
│  • Note (editable)                                              │
│  • GPS coordinates (editable)                                   │
│                                                                 │
│  User clicks "Save Visit" in modal                              │
│     ↓                                                           │
│     TRIGGERS: handleSave(editedFields)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 3: Save to Database                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  handleSave() executes:                                         │
│                                                                 │
│  1. Builds visit object:                                        │
│     {                                                           │
│       id, ts, field_id, crop, issue, severity,                 │
│       note, lat, lon, acc, photo_present                        │
│     }                                                           │
│                                                                 │
│  2. Saves to IndexedDB:                                         │
│     └─> visitDB.insert({                                       │
│           ...visit,                                             │
│           photo_data: photo (base64),    ← FULL IMAGE          │
│           audio_data: audioUrl (base64), ← FULL AUDIO          │
│           task_type: 'field_visit',                            │
│           synced: false                                         │
│         })                                                      │
│                                                                 │
│     ✅ Record saved locally (works offline)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: Queue AI Processing                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  IF (API key exists AND (photo OR audio)):                     │
│                                                                 │
│     └─> getAIProcessingQueue(apiKey)                            │
│         └─> queueProcessing(savedRecord, apiKey)               │
│             │                                                   │
│             ├─> Creates task:                                  │
│             │   {                                              │
│             │     recordId: 'abc123',                          │
│             │     taskType: 'photo_description' |             │
│             │              'audio_transcription' |             │
│             │              'both',                             │
│             │     photoData: 'data:image/jpeg;base64,...',     │
│             │     audioData: 'data:audio/webm;base64,...',    │
│             │     context: { field_id, crop, issue, ... }      │
│             │   }                                              │
│             │                                                   │
│             └─> Saves to localStorage:                         │
│                 'farm_visit_ai_queue_v1'                       │
│                                                                 │
│     ✅ Task queued (works offline)                             │
│                                                                 │
│  IF (online):                                                   │
│     └─> Processes immediately (background)                     │
│                                                                 │
│  IF (offline):                                                  │
│     └─> Waits for connectivity                                 │
│         └─> Auto-processes when online                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 5: Sync to Server (Optional)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Try to sync to server:                                         │
│     └─> saveVisit(visit) → POST /api/visits                    │
│                                                                 │
│  IF (success):                                                  │
│     └─> visitDB.markSynced(visit.id)                           │
│         ✅ Record marked as synced                              │
│                                                                 │
│  IF (fails - offline/error):                                    │
│     └─> outbox.push({                                           │
│           endpoint: '/visits',                                 │
│           method: 'POST',                                      │
│           payload: visit                                       │
│         })                                                      │
│         ✅ Queued for retry when online                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 6: Update UI                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  • loadRecords() → Refreshes "Recent Records" table            │
│  • Closes modal                                                 │
│  • Clears note field                                            │
│  • Keeps photo/audio in state (for chat analysis)              │
│                                                                 │
│  ✅ User sees new record in list                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Triggers

### **Primary Trigger: "Save Visit" Button**

**Location:** `FieldVisit.tsx` line 419
```tsx
<button onClick={openConfirmModal}>Save Visit</button>
```

**Flow:**
1. `openConfirmModal()` → AI extraction → Opens modal
2. User clicks "Save Visit" in modal → `handleSave()` → Saves everything

---

## 📝 What Gets Saved When

| Action | What Happens | When |
|--------|-------------|------|
| **Click "Save Visit"** | AI extracts fields | Immediately |
| **Click "Save Visit" in modal** | Saves to IndexedDB | Immediately |
| **Save with photo/audio** | Queues AI processing | Immediately (if API key) |
| **AI processing** | Generates captions/transcripts | When online (or immediately if online) |
| **Server sync** | Sends to backend | When online (or queued if offline) |

---

## 🔍 Console Logs to Watch

When you save a visit, you should see:

```
[FieldVisit] Saved visit with photo: Yes (123456 chars)
[FieldVisit] Queued AI processing for offline/online completion
[AIQueue] Queued photo_description processing for record abc123
Queued for offline sync  (if offline)
```

When connectivity is restored:

```
[AIQueue] Connectivity restored, processing queue...
[AIQueue] Processing 1 queued tasks...
[AIQueue] ✅ Processed task xyz789 for record abc123
[AIQueue] Updated record abc123 with AI index
```

---

## ✅ Summary

**What triggers saving:**
- ✅ Clicking "Save Visit" button → Opens modal
- ✅ Clicking "Save Visit" in modal → **TRIGGERS ALL PROCESSING**

**What happens automatically:**
1. ✅ Saves to IndexedDB (always, works offline)
2. ✅ Queues AI processing (if API key + media)
3. ✅ Queues server sync (if offline)
4. ✅ Processes AI queue when online (automatic)
5. ✅ Retries server sync when online (automatic)

**Everything is automatic after clicking "Save Visit" in the modal!** 🎉


