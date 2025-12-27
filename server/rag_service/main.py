"""
Farm Visit RAG Service
FastAPI service for semantic search and record management
"""

import os
import sqlite3
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

# Load environment variables from .env file
# Use absolute path to ensure .env is found regardless of working directory
ENV_PATH = Path(__file__).resolve().parent / ".env"
try:
    from dotenv import load_dotenv
    if ENV_PATH.exists():
        # Load with override=True to ensure .env values take precedence
        load_dotenv(dotenv_path=ENV_PATH, override=True)
        print(f"[INFO] Loaded .env from: {ENV_PATH}")
    else:
        load_dotenv(override=True)  # Try current directory as fallback
except ImportError:
    # python-dotenv not installed, try reading .env manually
    if ENV_PATH.exists():
        with open(ENV_PATH, 'r', encoding='utf-8-sig') as f:  # utf-8-sig strips BOM
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Strip BOM from key if present
                    key = key.strip().lstrip('\ufeff')
                    os.environ[key] = value.strip().strip('"').strip("'")
        print(f"[INFO] Loaded .env manually from: {ENV_PATH}")
except Exception as e:
    print(f"[WARNING] Failed to load .env file: {e}")
    print(f"[INFO] .env path attempted: {ENV_PATH}")
    print("[INFO] Using system environment variables only")

# Sanity check: log whether OPENAI_API_KEY was loaded (never print full key)
_openai_key_loaded = bool(os.getenv("OPENAI_API_KEY"))
print(f"[INFO] OPENAI_API_KEY loaded: {'set' if _openai_key_loaded else 'not set'}")

import chromadb
from chromadb.config import Settings
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configuration
DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
MEDIA_DIR = DATA_DIR / "media"
DB_PATH = DATA_DIR / "visits.db"
CHROMA_DIR = DATA_DIR / "chroma"

# Create directories
DATA_DIR.mkdir(exist_ok=True)
MEDIA_DIR.mkdir(exist_ok=True, parents=True)
CHROMA_DIR.mkdir(exist_ok=True, parents=True)

# Initialize FastAPI
app = FastAPI(title="Farm Visit RAG Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_DIR),
    settings=Settings(anonymized_telemetry=False)
)

# Get or create collections - dual collection architecture for multimodal
# Text collection (backward compatible with existing 'farm_visits')
text_collection = chroma_client.get_or_create_collection(
    name="farm_visits",
    metadata={"hnsw:space": "cosine", "embedding_type": "text"}
)

# Image collection for CLIP embeddings (512 dimensions)
image_collection = chroma_client.get_or_create_collection(
    name="farm_visits_images",
    metadata={"hnsw:space": "cosine", "embedding_type": "clip", "dimensions": 512}
)

# Alias for backward compatibility
collection = text_collection


# Initialize SQLite
def init_db():
    """Initialize SQLite database with visits and photos tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Visits table (existing)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS visits (
            id TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            task_type TEXT NOT NULL,
            lat REAL,
            lon REAL,
            acc INTEGER,
            note TEXT,
            photo_present INTEGER DEFAULT 0,
            audio_present INTEGER DEFAULT 0,
            photo_caption TEXT,
            audio_transcript TEXT,
            audio_summary TEXT,
            ai_status TEXT,
            sync_status TEXT DEFAULT 'pending',
            synced_at INTEGER,
            field_id TEXT,
            crop TEXT,
            issue TEXT,
            severity INTEGER,
            data TEXT,
            created_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_created_at ON visits(created_at)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_sync_status ON visits(sync_status)
    """)
    
    # Photos table (new - multimodal support)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS photos (
            id TEXT PRIMARY KEY,
            visit_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            mime_type TEXT,
            width INTEGER,
            height INTEGER,
            
            -- Embedding metadata
            embedding_id TEXT,
            embedding_model TEXT,
            embedding_dims INTEGER,
            embedding_generated_at INTEGER,
            
            -- GPS from EXIF (if available)
            exif_lat REAL,
            exif_lon REAL,
            exif_timestamp INTEGER,
            
            created_at INTEGER NOT NULL,
            FOREIGN KEY (visit_id) REFERENCES visits(id)
        )
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_photos_visit_id ON photos(visit_id)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_photos_embedding_id ON photos(embedding_id)
    """)
    
    conn.commit()
    conn.close()

init_db()

# Pydantic models
class VisitUpsert(BaseModel):
    id: str
    createdAt: int
    updatedAt: int
    task_type: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    acc: Optional[int] = None
    note: Optional[str] = None
    photo_present: bool = False
    audio_present: bool = False
    photo_caption: Optional[str] = None
    audio_transcript: Optional[str] = None
    audio_summary: Optional[str] = None
    aiStatus: Optional[Dict[str, Any]] = None
    field_id: Optional[str] = None
    crop: Optional[str] = None
    issue: Optional[str] = None
    severity: Optional[int] = None

class SearchRequest(BaseModel):
    query: str
    k: int = 10
    filters: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    id: str
    score: float
    snippet: str
    metadata: Dict[str, Any]

# Embedding provider configuration
EMBEDDING_PROVIDER_CONFIG = os.getenv("EMBEDDING_PROVIDER", "auto").lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Determine actual provider (auto mode: prefer openai if key exists, else local)
if EMBEDDING_PROVIDER_CONFIG == "auto":
    if OPENAI_API_KEY:
        EMBEDDING_PROVIDER = "openai"
    else:
        EMBEDDING_PROVIDER = "local"
elif EMBEDDING_PROVIDER_CONFIG in ["openai", "local"]:
    EMBEDDING_PROVIDER = EMBEDDING_PROVIDER_CONFIG
else:
    EMBEDDING_PROVIDER = "local"  # Default fallback

# Initialize local embedding model (lazy load)
_local_embedder = None

def _get_local_embedder():
    """Lazy load sentence-transformers model"""
    global _local_embedder
    if _local_embedder is None:
        try:
            from sentence_transformers import SentenceTransformer
            _local_embedder = SentenceTransformer('all-MiniLM-L6-v2')
            print("[INFO] Loaded local embedding model: all-MiniLM-L6-v2")
        except ImportError:
            print("[WARNING] sentence-transformers not installed. Install with: pip install sentence-transformers")
            return None
        except Exception as e:
            print(f"[WARNING] Failed to load local embedding model: {e}")
            return None
    return _local_embedder

# Startup diagnostics
def _redact_key(key):
    """Redact API key for display (never print full key)"""
    if not key:
        return "not set"
    if len(key) <= 8:
        return "***"
    return f"{key[:4]}...{key[-4:]}"

print("=" * 60)
print("[INFO] RAG Service Startup Diagnostics")
print("=" * 60)
print(f"[INFO] Embedding provider config: {EMBEDDING_PROVIDER_CONFIG}")
print(f"[INFO] Embedding provider active: {EMBEDDING_PROVIDER}")
print(f"[INFO] OPENAI_API_KEY loaded: {_redact_key(OPENAI_API_KEY)}")
print(f"[INFO] DATA_DIR: {DATA_DIR.resolve()}")
print(f"[INFO] DB_PATH: {DB_PATH.resolve()}")
print(f"[INFO] CHROMA_DIR: {CHROMA_DIR.resolve()}")
if EMBEDDING_PROVIDER == "openai" and not OPENAI_API_KEY:
    print("[WARNING] OPENAI_API_KEY not set but provider is 'openai' - will fail!")
elif EMBEDDING_PROVIDER == "local":
    # Test local embedder
    embedder = _get_local_embedder()
    if embedder:
        print("[INFO] Local embedding model ready")
    else:
        print("[WARNING] Local embedding model not available - embeddings will fail!")
print("=" * 60)

def get_embedding(text: str) -> Optional[List[float]]:
    """Get embedding for text using configured provider"""
    if not text or not text.strip():
        return None
    
    # Try OpenAI if configured
    if EMBEDDING_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            print("[ERROR] OpenAI provider selected but API key not set")
            return None
        try:
            import openai
            client = openai.OpenAI(api_key=OPENAI_API_KEY)
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"[ERROR] OpenAI embedding error: {e}")
            # Fallback to local if OpenAI fails
            if EMBEDDING_PROVIDER_CONFIG == "auto":
                print("[INFO] Falling back to local embedding model")
                return _get_local_embedding(text)
            return None
    
    # Use local sentence-transformers
    elif EMBEDDING_PROVIDER == "local":
        return _get_local_embedding(text)
    
    else:
        print(f"[ERROR] Unknown embedding provider: {EMBEDDING_PROVIDER}")
        return None

def _get_local_embedding(text: str) -> Optional[List[float]]:
    """Get embedding using local sentence-transformers model"""
    embedder = _get_local_embedder()
    if embedder is None:
        return None
    try:
        embedding = embedder.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        print(f"[ERROR] Local embedding error: {e}")
        return None

def generate_embedding_text(visit: Dict[str, Any]) -> str:
    """Generate text for embedding from visit record"""
    parts = []
    
    if visit.get("field_id"):
        parts.append(f"Field: {visit['field_id']}")
    if visit.get("crop"):
        parts.append(f"Crop: {visit['crop']}")
    if visit.get("issue"):
        parts.append(f"Issue: {visit['issue']}")
    if visit.get("note"):
        parts.append(f"Notes: {visit['note']}")
    if visit.get("photo_caption"):
        parts.append(f"Photo: {visit['photo_caption']}")
    if visit.get("audio_transcript"):
        parts.append(f"Audio: {visit['audio_transcript']}")
    if visit.get("severity") is not None:
        parts.append(f"Severity: {visit['severity']}/5")
    
    return ". ".join(parts)

# API Endpoints

@app.get("/health")
async def health():
    """Health check with embedding provider status (text + CLIP)"""
    # Text embedding status
    text_embedder_available = False
    if EMBEDDING_PROVIDER == "openai":
        text_embedder_available = bool(OPENAI_API_KEY)
    elif EMBEDDING_PROVIDER == "local":
        text_embedder_available = _get_local_embedder() is not None
    
    # CLIP embedding status
    clip_status = {"available": False, "device": None, "model": None}
    try:
        from embeddings.clip_embedder import check_clip_availability
        clip_status = check_clip_availability()
    except ImportError:
        clip_status["error"] = "CLIP module not installed"
    except Exception as e:
        clip_status["error"] = str(e)
    
    # Collection stats
    text_count = text_collection.count()
    image_count = image_collection.count()
    
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "text_embedding": {
            "provider_config": EMBEDDING_PROVIDER_CONFIG,
            "provider_active": EMBEDDING_PROVIDER,
            "available": text_embedder_available,
            "collection_count": text_count
        },
        "clip_embedding": {
            "available": clip_status.get("available", False),
            "device": clip_status.get("device"),
            "model": clip_status.get("model_name"),
            "collection_count": image_count,
            "error": clip_status.get("error")
        },
        "openai_key_set": bool(OPENAI_API_KEY),
        "chroma_dir": str(CHROMA_DIR.resolve()),
        "db_path": str(DB_PATH.resolve())
    }

@app.post("/sync/visits/upsert")
async def upsert_visit(visit: VisitUpsert):
    """Upsert visit record and automatically generate embedding"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Store full record as JSON
    data_json = json.dumps(visit.model_dump())
    
    cursor.execute("""
        INSERT OR REPLACE INTO visits (
            id, created_at, updated_at, task_type, lat, lon, acc,
            note, photo_present, audio_present, photo_caption,
            audio_transcript, audio_summary, ai_status, sync_status,
            field_id, crop, issue, severity, data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        visit.id, visit.createdAt, visit.updatedAt, visit.task_type,
        visit.lat, visit.lon, visit.acc, visit.note,
        1 if visit.photo_present else 0,
        1 if visit.audio_present else 0,
        visit.photo_caption, visit.audio_transcript, visit.audio_summary,
        json.dumps(visit.aiStatus) if visit.aiStatus else None,
        "synced",
        visit.field_id, visit.crop, visit.issue, visit.severity,
        data_json
    ))
    
    conn.commit()
    conn.close()
    
    # Automatically generate embedding after sync
    try:
        visit_dict = visit.model_dump()
        embedding_text = generate_embedding_text(visit_dict)
        if embedding_text:
            embedding = get_embedding(embedding_text)
            if embedding:
                metadata = {
                    "id": visit.id,
                    "created_at": int(visit.createdAt),  # Store as int (epoch ms) for filtering
                    "task_type": visit.task_type,
                    "field_id": visit.field_id or "",
                    "crop": visit.crop or "",
                    "issue": visit.issue or "",
                    "note": visit.note or "",
                }
                collection.upsert(
                    ids=[visit.id],
                    embeddings=[embedding],
                    documents=[embedding_text],
                    metadatas=[metadata]
                )
                print(f"[Auto-embed] Generated embedding for visit {visit.id}")
            else:
                print(f"[Auto-embed] Failed to generate embedding (provider unavailable)")
        else:
            print(f"[Auto-embed] No embedding text generated for visit {visit.id}")
    except Exception as e:
        print(f"[Auto-embed] Failed to generate embedding: {e}")
        import traceback
        traceback.print_exc()
        # Non-critical, continue
    
    return {"status": "ok", "id": visit.id}

@app.post("/sync/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    visit_id: str = Form(...),
    type: str = Form(...)
):
    """Upload media file"""
    # Create visit directory
    visit_dir = MEDIA_DIR / visit_id
    visit_dir.mkdir(exist_ok=True, parents=True)
    
    # Save file
    file_path = visit_dir / f"{type}_{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Return URI
    uri = f"/media/{visit_id}/{type}_{file.filename}"
    
    return {"uri": uri, "path": str(file_path)}

@app.get("/media/{visit_id}/{filename}")
async def get_media(visit_id: str, filename: str):
    """Get media file"""
    from fastapi.responses import FileResponse
    
    file_path = MEDIA_DIR / visit_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@app.post("/rag/upsert")
async def upsert_embedding(visit: VisitUpsert):
    """Generate embedding and upsert into ChromaDB"""
    # Generate embedding text
    visit_dict = visit.model_dump()
    embedding_text = generate_embedding_text(visit_dict)
    
    if not embedding_text:
        return {"status": "skipped", "reason": "No embedding text generated"}
    
    # Get embedding
    embedding = get_embedding(embedding_text)
    
    if not embedding:
        return {"status": "pending", "reason": "Embedding provider unavailable"}
    
    # Prepare metadata
    metadata = {
        "id": visit.id,
        "created_at": int(visit.createdAt),  # Store as int (epoch ms) for filtering
        "task_type": visit.task_type,
        "field_id": visit.field_id or "",
        "crop": visit.crop or "",
        "issue": visit.issue or "",
        "note": visit.note or "",
    }
    
    # Upsert into ChromaDB
    collection.upsert(
        ids=[visit.id],
        embeddings=[embedding],
        documents=[embedding_text],
        metadatas=[metadata]
    )
    
    return {"status": "ok", "id": visit.id}

@app.post("/rag/search", response_model=List[SearchResult])
async def search_visits(request: SearchRequest):
    """Semantic search with time and field filtering"""
    # Get query embedding
    query_embedding = get_embedding(request.query)
    
    if not query_embedding:
        # Provide clear error message based on provider configuration
        if EMBEDDING_PROVIDER == "openai" and not OPENAI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Embedding provider unavailable",
                    "reason": "OPENAI_API_KEY not set but provider is 'openai'",
                    "provider_config": EMBEDDING_PROVIDER_CONFIG,
                    "provider_active": EMBEDDING_PROVIDER,
                    "suggestion": "Set OPENAI_API_KEY environment variable or use EMBEDDING_PROVIDER=auto to fallback to local embeddings"
                }
            )
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Embedding provider unavailable",
                    "reason": "Failed to generate embedding",
                    "provider_config": EMBEDDING_PROVIDER_CONFIG,
                    "provider_active": EMBEDDING_PROVIDER
                }
            )
    
    # Build ChromaDB where clause from filters
    where_clause = {}
    if request.filters:
        # Field filter
        if "field_id" in request.filters:
            where_clause["field_id"] = request.filters["field_id"]
        
        # Time filter (created_at >= timestamp)
        if "created_at_min" in request.filters:
            # ChromaDB metadata filtering - we'll filter in Python after query
            pass
    
    # Search in ChromaDB
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=request.k * 2 if request.filters and "created_at_min" in request.filters else request.k,  # Get more results if time filtering
        where=where_clause if where_clause else None,
        include=['documents', 'metadatas', 'distances']
    )
    
    # Format results with time filtering
    search_results = []
    if results["ids"] and len(results["ids"][0]) > 0:
        created_at_min = request.filters.get("created_at_min") if request.filters else None
        
        for i, visit_id in enumerate(results["ids"][0]):
            metadata = results["metadatas"][0][i]
            
            # Apply time filter if specified
            if created_at_min:
                visit_created_at = metadata.get("created_at", 0)
                # Handle both int and string timestamps
                if isinstance(visit_created_at, str):
                    visit_created_at = int(visit_created_at)
                if visit_created_at < created_at_min:
                    continue  # Skip visits before the time threshold
            
            score = 1 - results["distances"][0][i]  # Convert distance to similarity
            doc = results["documents"][0][i]
            
            search_results.append({
                "id": visit_id,
                "score": float(score),
                "snippet": doc[:200] + "..." if len(doc) > 200 else doc,
                "metadata": metadata
            })
        
        # Limit to requested k after filtering
        search_results = search_results[:request.k]
    
    return search_results

@app.get("/visits/{visit_id}")
async def get_visit(visit_id: str):
    """Get full visit record"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT data FROM visits WHERE id = ?", (visit_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit_data = json.loads(row[0])
    
    # Add media URIs if present
    if visit_data.get("photo_present"):
        visit_data["photo_uri"] = f"/media/{visit_id}/photo_*.jpg"
    if visit_data.get("audio_present"):
        visit_data["audio_uri"] = f"/media/{visit_id}/audio_*.webm"
    
    return visit_data

# ============================================
# CLIP Image Embedding Endpoints (Multimodal)
# ============================================

class ImageSearchRequest(BaseModel):
    """Request model for cross-modal image search"""
    query: str
    k: int = 10
    visit_id: Optional[str] = None  # Filter by specific visit

class ImageEmbeddingResponse(BaseModel):
    """Response for image embedding"""
    photo_id: str
    embedding_id: str
    dimensions: int
    model: str
    device: str

@app.post("/rag/embed-image")
async def embed_image(
    file: UploadFile = File(...),
    visit_id: str = Form(...),
    generate_embedding: bool = Form(True)
):
    """
    Upload image and generate CLIP embedding.
    Stores photo metadata in SQLite and embedding in ChromaDB.
    """
    import uuid
    
    # Generate photo ID
    photo_id = str(uuid.uuid4())
    
    # Create visit directory
    visit_dir = MEDIA_DIR / visit_id
    visit_dir.mkdir(exist_ok=True, parents=True)
    
    # Save file
    filename = f"photo_{photo_id}_{file.filename}"
    file_path = visit_dir / filename
    content = await file.read()
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    file_size = len(content)
    
    result = {
        "photo_id": photo_id,
        "visit_id": visit_id,
        "filename": filename,
        "file_path": str(file_path),
        "file_size": file_size,
        "embedding_generated": False
    }
    
    # Extract image metadata
    try:
        from embeddings.clip_embedder import get_image_metadata
        metadata = get_image_metadata(str(file_path))
        result.update(metadata)
    except Exception as e:
        print(f"[CLIP] Metadata extraction failed: {e}")
    
    # Generate CLIP embedding if requested
    embedding_id = None
    if generate_embedding:
        try:
            from embeddings.clip_embedder import get_image_embedding, _get_device
            
            embedding = get_image_embedding(str(file_path))
            if embedding:
                embedding_id = f"img_{photo_id}"
                
                # Store in image collection
                image_collection.upsert(
                    ids=[embedding_id],
                    embeddings=[embedding],
                    documents=[f"Photo from visit {visit_id}: {file.filename}"],
                    metadatas=[{
                        "photo_id": photo_id,
                        "visit_id": visit_id,
                        "filename": filename,
                        "width": result.get("width"),
                        "height": result.get("height"),
                        "created_at": int(datetime.now().timestamp() * 1000)
                    }]
                )
                
                result["embedding_generated"] = True
                result["embedding_id"] = embedding_id
                result["embedding_dims"] = len(embedding)
                result["embedding_model"] = "clip-vit-base-patch32"
                result["embedding_device"] = _get_device()
                
                print(f"[CLIP] Generated embedding for {filename}: {len(embedding)} dims")
        except Exception as e:
            print(f"[CLIP] Embedding generation failed: {e}")
            import traceback
            traceback.print_exc()
            result["embedding_error"] = str(e)
    
    # Store photo metadata in SQLite
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO photos (
                id, visit_id, filename, file_path, file_size, mime_type,
                width, height, embedding_id, embedding_model, embedding_dims,
                embedding_generated_at, exif_lat, exif_lon, exif_timestamp, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            photo_id, visit_id, filename, str(file_path), file_size,
            file.content_type,
            result.get("width"), result.get("height"),
            embedding_id,
            "clip-vit-base-patch32" if embedding_id else None,
            result.get("embedding_dims"),
            int(datetime.now().timestamp() * 1000) if embedding_id else None,
            result.get("exif_lat"), result.get("exif_lon"), result.get("exif_timestamp"),
            int(datetime.now().timestamp() * 1000)
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[CLIP] Failed to store photo metadata: {e}")
        result["db_error"] = str(e)
    
    return result

@app.post("/rag/search-images")
async def search_images(request: ImageSearchRequest):
    """
    Cross-modal search: Text query → Similar images.
    Uses CLIP text encoder to embed query, then searches image collection.
    """
    try:
        from embeddings.clip_embedder import get_text_embedding_clip
        
        # Get CLIP text embedding for the query
        query_embedding = get_text_embedding_clip(request.query)
        
        if not query_embedding:
            raise HTTPException(
                status_code=503,
                detail="CLIP embedding unavailable. Ensure PyTorch and transformers are installed."
            )
        
        # Build where clause
        where_clause = None
        if request.visit_id:
            where_clause = {"visit_id": request.visit_id}
        
        # Search in image collection
        results = image_collection.query(
            query_embeddings=[query_embedding],
            n_results=request.k,
            where=where_clause,
            include=['documents', 'metadatas', 'distances']
        )
        
        # Format results
        search_results = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i, img_id in enumerate(results["ids"][0]):
                metadata = results["metadatas"][0][i]
                score = 1 - results["distances"][0][i]  # Convert distance to similarity
                
                # Get photo URI
                photo_uri = f"/media/{metadata.get('visit_id')}/{metadata.get('filename')}"
                
                search_results.append({
                    "embedding_id": img_id,
                    "photo_id": metadata.get("photo_id"),
                    "visit_id": metadata.get("visit_id"),
                    "filename": metadata.get("filename"),
                    "photo_uri": photo_uri,
                    "score": float(score),
                    "width": metadata.get("width"),
                    "height": metadata.get("height")
                })
        
        return {
            "query": request.query,
            "results": search_results,
            "total": len(search_results)
        }
        
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="CLIP module not available. Install with: pip install transformers torch"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/photos/{visit_id}")
async def get_photos(visit_id: str):
    """
    Get all photos for a visit with embedding status.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, filename, file_path, file_size, width, height,
               embedding_id, embedding_model, embedding_dims,
               exif_lat, exif_lon, created_at
        FROM photos WHERE visit_id = ?
        ORDER BY created_at DESC
    """, (visit_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    photos = []
    for row in rows:
        photos.append({
            "id": row[0],
            "filename": row[1],
            "file_path": row[2],
            "file_size": row[3],
            "width": row[4],
            "height": row[5],
            "has_embedding": row[6] is not None,
            "embedding_id": row[6],
            "embedding_model": row[7],
            "embedding_dims": row[8],
            "exif_lat": row[9],
            "exif_lon": row[10],
            "created_at": row[11],
            "uri": f"/media/{visit_id}/{row[1]}"
        })
    
    return {
        "visit_id": visit_id,
        "photos": photos,
        "total": len(photos),
        "with_embeddings": sum(1 for p in photos if p["has_embedding"])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


