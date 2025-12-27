# Chat Historical Queries & Real-Time Data

## ✅ Features

### 1. **Real-Time Capture Data**
When cloud connected, the chat interface automatically includes:
- **Current GPS location** (if available)
- **Current photo** (for analysis)
- **Current note** (user's input)
- **Current audio** (if recorded)

This data is **always included** in the system prompt when available.

### 2. **Historical Queries**
The chat can retrieve history of specific paddocks/fields with time filters:

**Examples:**
- "What's the history of paddock 14 in the last month?"
- "Show me all visits to field 7 in the past week"
- "What issues have I seen in field 12 this year?"
- "History of campo 5 in the last 3 months"

---

## 🔍 Query Parsing

The system automatically extracts:

### **Field/Paddock IDs**
- Patterns: "field 14", "paddock 14", "field_14", "F14", "campo 14", "potrero 14"
- Supports English and Spanish

### **Time Ranges**
- "last month" / "past month" / "this month"
- "last week" / "past week" / "this week"
- "last 3 months" / "past 3 months"
- "last year" / "past year"
- "last N days" (e.g., "last 30 days")

### **Crop Types**
- English: corn, maize, wheat, soybean, soy, rice, cotton
- Spanish: maíz, trigo, soja, arroz, algodón

### **Issue Types**
- English: aphid, pest, disease, weed, drought
- Spanish: áfido, plaga, enfermedad, maleza, sequía

---

## 📊 How It Works

### **Flow:**

```
User Query: "history of paddock 14 in the last month"
    ↓
Query Parser extracts:
  - field_id: "14"
  - created_at_min: (now - 30 days)
    ↓
RAG Search with filters:
  - Semantic search for "history of paddock 14"
  - Filter by field_id = "14"
  - Filter by created_at >= (now - 30 days)
    ↓
Results returned:
  - Top 10 relevant visits matching filters
  - Sorted by relevance score
    ↓
System Prompt includes:
  - Current real-time data (if available)
  - Historical visits from RAG
  - Filter context (field, time range)
    ↓
LLM responds with:
  - Analysis of historical data
  - Context from current visit
  - Actionable insights
```

---

## 🧪 Examples

### **Example 1: Historical Query**
```
User: "What's the history of paddock 14 in the last month?"

System extracts:
  - field_id: "14"
  - created_at_min: (30 days ago)

RAG returns:
  - Visit 1: [2024-11-20] Field: 14. Crop: corn. Issue: aphids. Notes: Severe infestation...
  - Visit 2: [2024-11-15] Field: 14. Crop: corn. Issue: disease. Notes: Fungal infection...
  - Visit 3: [2024-11-10] Field: 14. Crop: corn. Notes: Routine inspection...

LLM Response:
  "Based on the last month's visits to paddock 14, I can see:
  1. Aphid infestation on Nov 20 (severe)
  2. Fungal disease on Nov 15
  3. Routine inspection on Nov 10
  
  Recommendations:
  - Monitor aphid levels weekly
  - Apply fungicide if disease persists
  - Consider crop rotation next season"
```

### **Example 2: Real-Time + Historical**
```
User: "What should I do about this?" (while capturing visit)

System includes:
  - Current GPS: (40.7128, -74.0060)
  - Current photo: [analyzed]
  - Current note: "Aphids detected"
  - Historical visits from same field (if available)

LLM Response:
  "Based on your current observation of aphids at this location, and 
  the historical data showing similar issues in this field last month,
  I recommend:
  1. Apply insecticidal soap immediately
  2. Monitor infestation levels
  3. Consider biological controls..."
```

---

## 🔧 Technical Details

### **Query Parser** (`apps/web/src/lib/rag/queryParser.ts`)
- Extracts field IDs, time ranges, crop types, issue types
- Returns structured filters for RAG search

### **RAG Search Endpoint** (`/rag/search`)
- Accepts `filters` parameter:
  ```json
  {
    "query": "history of paddock 14",
    "k": 10,
    "filters": {
      "field_id": "14",
      "created_at_min": 1700000000000
    }
  }
  ```

### **ChromaDB Filtering**
- Field filter: Applied in ChromaDB query
- Time filter: Applied in Python after query (for accuracy)

### **System Prompt Enhancement**
- Always includes current real-time data
- Adds historical context when relevant
- Shows filter context (field, time range)

---

## 📝 Supported Query Patterns

### **Field Queries**
- "field 14", "paddock 14", "campo 5", "potrero 7"
- "F14", "field_14", "paddock_14"

### **Time Queries**
- "last month", "past month", "this month"
- "last week", "past week", "this week"
- "last 3 months", "past 3 months"
- "last year", "past year"
- "last 30 days", "past 7 days"

### **Combined Queries**
- "history of paddock 14 in the last month"
- "show me field 7 visits this week"
- "what happened in campo 5 last year"

---

## ✅ Acceptance Criteria

- [x] Real-time data always included when available
- [x] Historical queries parse field IDs correctly
- [x] Time ranges extracted from natural language
- [x] RAG search filters by field and time
- [x] System prompt includes both real-time and historical context
- [x] Supports English and Spanish field names
- [x] Returns top K relevant results

---

## 🚀 Future Enhancements

- [ ] Support for date ranges ("from Nov 1 to Nov 30")
- [ ] Support for multiple fields ("fields 14 and 15")
- [ ] Support for crop-specific queries ("all corn fields")
- [ ] Support for issue-specific queries ("all aphid reports")
- [ ] Visualization of historical trends in chat

