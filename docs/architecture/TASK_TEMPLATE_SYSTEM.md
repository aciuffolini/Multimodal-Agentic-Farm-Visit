# 🏗️ Task Template System Architecture

## Overview

Scalable, template-based architecture for multiple farm management tasks:
- ✅ **Field Visits** (crop issues, pest management) - Current
- ✅ **Pasture Rotation** (rotational grazing) - Ready
- ✅ **Bunk Management** (feed inventory) - Ready
- 🔮 **Future tasks** - Easy to add

---

## 🎯 Core Design Principles

### 1. **Template-Based System**
Each farm task type has a template defining:
- Schema (Zod validation)
- UI fields (form definitions)
- Export configuration
- RAG indexing rules

### 2. **Base Record + Task-Specific Fields**
```typescript
BaseRecord {
  id, ts, task_type
  lat, lon, acc          // Location (always available)
  photo_data, audio_data // Media (always available)
  note                   // Notes (always available)
}

+ Task-Specific Fields (from template)
= Complete FarmRecord
```

### 3. **Hybrid Media Storage**
- **Raw media preserved** (base64 in JSON, files in ZIP)
- **Lightweight index** (captions, transcripts for RAG)
- **On-demand analysis** (send actual photo to Vision API when needed)

---

## 📁 File Structure

```
packages/shared/src/
├── schemas/
│   └── task.ts              # BaseRecord, TaskTemplate, TaskField
├── templates/
│   ├── index.ts             # Template registry
│   ├── fieldVisit.ts        # Field visit template
│   ├── pastureRotation.ts   # Pasture rotation template
│   └── bunkManagement.ts    # Bunk management template

apps/web/src/lib/
├── export/
│   ├── types.ts             # Export types
│   ├── ExportService.ts     # Generic export (template-aware)
│   ├── MediaProcessor.ts    # AI media analysis
│   └── formats/
│       ├── CSVExporter.ts   # CSV with media references
│       ├── JSONExporter.ts  # JSON with embedded/referenced media
│       └── ZipExporter.ts   # ZIP bundle (CSV + JSON + media files)
```

---

## 🔄 Data Flow

```
User Creates Record
    ↓
Template Validates (Zod schema)
    ↓
Save to IndexedDB (BaseRecord + task fields)
    ↓
Export Time:
    ├─ Generate lightweight index (captions, transcripts)
    ├─ Preserve raw media
    └─ Export in chosen format (CSV/JSON/ZIP)
    ↓
RAG Query Time:
    ├─ Search embeddings of index text
    ├─ Retrieve records
    └─ On-demand: Send actual photo to Vision API if needed
```

---

## 📊 Export Formats

### CSV (Metadata + References)
```csv
id,timestamp,task_type,field_id,crop,issue,photo_filename,photo_caption,audio_filename,audio_transcript
abc123,2025-12-18,field_visit,field_7,corn,pest,visit_abc123_photo.jpg,"Corn with pest damage",visit_abc123_audio.webm,"I'm at field 7..."
```
- ✅ Human-readable in Excel
- ✅ Small file size
- ✅ Media files referenced (not embedded)

### JSON (Full Data + Hybrid Media)
```json
{
  "id": "abc123",
  "task_type": "field_visit",
  "field_id": "field_7",
  "crop": "corn",
  "raw_media": {
    "photo_data": "data:image/jpeg;base64,...",  // Full image preserved
    "audio_data": "data:audio/webm;base64,..."   // Full audio preserved
  },
  "index": {
    "photo_caption": "Corn with pest damage",     // Lightweight for RAG
    "audio_transcript": "I'm at field 7...",     // Lightweight for RAG
    "embedding_text": "Field: field_7. Crop: corn. Issue: pest..."
  }
}
```
- ✅ Full fidelity preserved
- ✅ RAG-ready index included
- ✅ On-demand analysis possible

### ZIP (Complete Package)
```
farm_records_2025-12-18.zip
├── records.csv          # Metadata spreadsheet
├── records.json         # Full structured data
├── media/
│   ├── visit_abc123_photo.jpg
│   ├── visit_abc123_audio.webm
│   └── ...
└── README.txt          # Export summary
```
- ✅ Complete archival
- ✅ Easy distribution
- ✅ Media files separate

---

## 🧠 RAG Integration (Future)

### Phase 2: Basic Embeddings
```typescript
// Generate embedding from index text
const embedding = await textEncoder.encode(record.index.embedding_text);
// Store in simple JSON vector format
```

### Phase 3: Multimodal Embeddings
```typescript
// Combine text + image embeddings
const multimodal = fuseEmbeddings([
  textEmbedding,
  imageEmbedding,  // CLIP
  audioEmbedding   // Transcript embedding
]);
```

### Phase 4: Vector Database
```typescript
// Semantic search
const results = await vectorDB.search(query, {
  filter: { task_type: 'field_visit' },
  topK: 5
});

// On-demand deep analysis
if (needsMoreDetail) {
  const analysis = await visionAPI.analyze(record.raw_media.photo_data);
}
```

---

## 🚀 Adding New Task Types

### Step 1: Define Template
```typescript
// templates/healthManagement.ts
export const HealthManagementTemplate: TaskTemplate = {
  id: 'health_management',
  name: 'Animal Health',
  schema: HealthSchema,
  fields: [...],
  exportConfig: {...},
  ragConfig: {...}
};
```

### Step 2: Register Template
```typescript
// templates/index.ts
import { HealthManagementTemplate } from './healthManagement';
registerTemplate(HealthManagementTemplate);
```

### Step 3: Done! ✅
- Export system automatically supports it
- RAG indexing works automatically
- UI can use template.fields for forms

---

## 📈 Benefits

1. **Scalable** - Add new tasks without changing core code
2. **Type-Safe** - Zod schemas ensure data integrity
3. **RAG-Ready** - Index generation built-in
4. **Future-Proof** - Raw media preserved for better AI models
5. **Flexible** - Multiple export formats for different use cases

---

## 🔜 Next Steps

1. **Refactor existing FieldVisit component** to use template system
2. **Update database** to use BaseRecord structure
3. **Build UI** for template selection and task-specific forms
4. **Implement Phase 2** (basic embeddings)
5. **Add pasture rotation UI** (already has template!)

---

## 📝 Notes

- **Media Storage**: Raw media always preserved, index is optional
- **API Costs**: Index generation is one-time at export, on-demand analysis is per-query
- **Offline Support**: Export works offline, AI processing requires API key
- **Backward Compatible**: Existing field visit records can be migrated


