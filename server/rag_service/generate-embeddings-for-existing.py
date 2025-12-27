"""
Generate embeddings for existing records in SQLite that don't have embeddings yet
Run: python generate-embeddings-for-existing.py
"""

import os
import sqlite3
import json
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    from pathlib import Path
    env_path = Path(__file__).parent / '.env'
    load_dotenv(dotenv_path=env_path)
    # Also try loading from current directory
    load_dotenv()
except ImportError:
    pass

import chromadb
from chromadb.config import Settings

# Configuration
DB_PATH = Path("data/visits.db")
CHROMA_DIR = Path("data/chroma")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    # Try reading directly from .env file
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('OPENAI_API_KEY='):
                    OPENAI_API_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                    break
    
    if not OPENAI_API_KEY:
        print("[ERROR] OPENAI_API_KEY not set")
        print("Set it in server/rag_service/.env:")
        print("OPENAI_API_KEY=sk-...")
        print("\nOr set environment variable:")
        print("export OPENAI_API_KEY='sk-...'")
        exit(1)

# Initialize ChromaDB
chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_DIR),
    settings=Settings(anonymized_telemetry=False)
)
collection = chroma_client.get_or_create_collection(
    name="farm_visits",
    metadata={"hnsw:space": "cosine"}
)

def get_embedding(text: str) -> list:
    """Get embedding for text"""
    try:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"[ERROR] Embedding generation failed: {e}")
        return None

def generate_embedding_text(visit: dict) -> str:
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

# Connect to SQLite
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all records
cursor.execute("SELECT * FROM visits")
rows = cursor.fetchall()
columns = [description[0] for description in cursor.description]

print("=" * 60)
print("Generating Embeddings for Existing Records")
print("=" * 60)
print(f"Total records in SQLite: {len(rows)}")
print()

# Check which records already have embeddings
existing_ids = set(collection.get()['ids']) if collection.count() > 0 else set()
print(f"Records already in ChromaDB: {len(existing_ids)}")
print()

# Process each record
generated = 0
skipped = 0
failed = 0

for row in rows:
    visit = dict(zip(columns, row))
    visit_id = visit['id']
    
    # Skip if already has embedding
    if visit_id in existing_ids:
        print(f"[SKIP] {visit_id[:8]}... already has embedding")
        skipped += 1
        continue
    
    # Generate embedding text
    embedding_text = generate_embedding_text(visit)
    
    if not embedding_text or embedding_text.strip() == "":
        print(f"[SKIP] {visit_id[:8]}... no content for embedding")
        skipped += 1
        continue
    
    # Generate embedding
    print(f"[PROCESSING] {visit_id[:8]}...")
    print(f"  Text: {embedding_text[:100]}...")
    
    embedding = get_embedding(embedding_text)
    
    if not embedding:
        print(f"[FAILED] {visit_id[:8]}... embedding generation failed")
        failed += 1
        continue
    
    # Prepare metadata
    metadata = {
        "id": visit_id,
        "created_at": int(visit.get('created_at', 0)),
        "task_type": visit.get('task_type', 'field_visit'),
        "field_id": visit.get('field_id') or "",
        "crop": visit.get('crop') or "",
        "issue": visit.get('issue') or "",
        "note": visit.get('note') or "",
    }
    
    # Upsert into ChromaDB
    collection.upsert(
        ids=[visit_id],
        embeddings=[embedding],
        documents=[embedding_text],
        metadatas=[metadata]
    )
    
    print(f"[OK] {visit_id[:8]}... embedding generated and stored")
    generated += 1
    print()

conn.close()

print("=" * 60)
print("Summary:")
print("=" * 60)
print(f"  Generated: {generated}")
print(f"  Skipped:   {skipped}")
print(f"  Failed:    {failed}")
print(f"  Total:     {len(rows)}")
print()

if generated > 0:
    print(f"[OK] {generated} embeddings generated successfully!")
    print("Chat agent can now access the database.")
else:
    print("[INFO] No new embeddings generated.")
    if failed > 0:
        print(f"[WARNING] {failed} embeddings failed to generate.")

