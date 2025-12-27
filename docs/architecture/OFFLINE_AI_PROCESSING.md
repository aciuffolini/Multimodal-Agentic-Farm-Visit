# 🔄 Offline AI Processing System

## Overview

When users capture field visits **offline**, the app automatically queues AI processing tasks (photo descriptions, audio transcriptions). When connectivity is restored, these tasks are processed automatically in the background.

---

## 🎯 How It Works

### 1. **Offline Capture Flow**

```
User captures visit (offline)
    ↓
Save to IndexedDB (raw media preserved)
    ↓
Queue AI processing task (if API key available)
    ↓
Task stored in localStorage queue
    ↓
[User goes online]
    ↓
Auto-process queue (background)
    ↓
Update record with AI index
```

### 2. **Queue System**

Similar to the existing `outbox` pattern for API sync:

- **Storage**: `localStorage` (persists across app restarts)
- **Retry Logic**: Exponential backoff (2s, 4s, 8s, max 30s)
- **Max Retries**: 3 attempts per task
- **Auto-Processing**: Triggers on `online` event and `focus` event

### 3. **What Gets Processed**

When a record is saved with media:

- **Photo** → Queues photo description task
- **Audio** → Queues audio transcription task
- **Both** → Queues combined task

### 4. **Processing Results**

After processing, the record is updated with:

```typescript
{
  photo_caption: "Corn field with visible pest damage",
  audio_transcript: "I'm at field 7 now, the corn is showing...",
  audio_summary: "Field observation noting pest damage...",
  ai_indexed: true
}
```

---

## 📊 Data Flow

### Offline Capture
```typescript
// User saves visit offline
await visitDB.insert({
  id: 'abc123',
  photo_data: 'data:image/jpeg;base64,...',
  audio_data: 'data:audio/webm;base64,...',
  // ... other fields
});

// Queue AI processing
const aiQueue = getAIProcessingQueue(apiKey);
aiQueue.queueProcessing(record, apiKey);
// → Task stored in localStorage
```

### Online Processing
```typescript
// Connectivity restored
window.addEventListener('online', () => {
  const queue = getAIProcessingQueue();
  queue.processQueue(); // Auto-processes all queued tasks
});

// For each task:
// 1. Get record from IndexedDB
// 2. Call OpenAI Vision API (photo)
// 3. Call OpenAI Whisper API (audio)
// 4. Update record with index
// 5. Remove task from queue
```

---

## 🔧 Integration Points

### 1. **FieldVisit Component**

```typescript
// When saving a visit
await visitDB.insert(savedRecord);

// Queue AI processing
const apiKey = localStorage.getItem('user_api_key') || '';
if (apiKey && (photo || audioUrl)) {
  const aiQueue = getAIProcessingQueue(apiKey);
  aiQueue.queueProcessing(savedRecord, apiKey);
}
```

### 2. **Database Schema**

```typescript
interface VisitRecord {
  // ... existing fields
  
  // AI-generated index (added by processing)
  photo_caption?: string;
  audio_transcript?: string;
  audio_summary?: string;
  ai_indexed?: boolean;
}
```

### 3. **Export System**

The export system automatically uses the AI index if available:

```typescript
// Export includes index if present
{
  index: {
    photo_caption: record.photo_caption,
    audio_transcript: record.audio_transcript,
    // ...
  }
}
```

---

## 🚀 Benefits

1. **Offline-First**: Users can capture without internet
2. **Automatic**: Processing happens in background when online
3. **Resilient**: Retry logic handles temporary failures
4. **Non-Blocking**: Doesn't slow down capture flow
5. **RAG-Ready**: Index available for semantic search

---

## 📝 Queue Status

You can check queue status:

```typescript
const queue = getAIProcessingQueue();
const status = queue.getStatus();
// { queued: 5, processing: false }
```

---

## 🔍 Monitoring

Console logs show queue activity:

```
[AIQueue] Queued photo_description processing for record abc123
[AIQueue] Connectivity restored, processing queue...
[AIQueue] ✅ Processed task xyz789 for record abc123
[AIQueue] Updated record abc123 with AI index
```

---

## ⚠️ Important Notes

1. **API Key Required**: Processing only happens if user has set API key
2. **Costs**: Each photo/audio uses OpenAI API (one-time cost)
3. **Privacy**: All processing happens client-side, data sent to OpenAI
4. **Optional**: If no API key, records are saved without index (still functional)

---

## 🔜 Future Enhancements

1. **Progress Indicator**: Show queue status in UI
2. **Batch Processing**: Process multiple tasks efficiently
3. **Local Fallback**: Use on-device models when available
4. **Selective Processing**: User can choose which records to process

