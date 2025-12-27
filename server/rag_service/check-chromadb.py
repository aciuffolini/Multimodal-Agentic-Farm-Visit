"""
Quick script to check ChromaDB status
Run: python check-chromadb.py
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    import chromadb
    from chromadb.config import Settings
    
    # Configuration
    DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
    CHROMA_DIR = DATA_DIR / "chroma"
    
    print("Checking ChromaDB Status...\n")
    
    # Check if directory exists
    if not CHROMA_DIR.exists():
        print(f"[X] ChromaDB directory not found: {CHROMA_DIR}")
        print("   This is OK if no records have been synced yet.")
        sys.exit(0)
    
    print(f"[OK] ChromaDB directory exists: {CHROMA_DIR}")
    
    # Initialize ChromaDB client
    try:
        chroma_client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=Settings(anonymized_telemetry=False)
        )
        print("[OK] ChromaDB client initialized")
    except Exception as e:
        print(f"[ERROR] Failed to initialize ChromaDB client: {e}")
        sys.exit(1)
    
    # Check if collection exists
    try:
        collection = chroma_client.get_collection("farm_visits")
        print("[OK] Collection 'farm_visits' exists")
        
        # Get count
        count = collection.count()
        print(f"Records in ChromaDB: {count}")
        
        if count > 0:
            # Get a sample record
            results = collection.get(limit=1)
            if results['ids']:
                print(f"\nSample record ID: {results['ids'][0]}")
                if results['metadatas']:
                    print(f"   Metadata: {results['metadatas'][0]}")
                if results['documents']:
                    doc = results['documents'][0]
                    print(f"   Document preview: {doc[:100]}...")
        else:
            print("\n[WARNING] No records in ChromaDB yet")
            print("   Records will be added when:")
            print("   1. Visits are synced to RAG service")
            print("   2. Embeddings are generated via /rag/upsert")
            
    except Exception as e:
        if "does not exist" in str(e).lower():
            print("[WARNING] Collection 'farm_visits' does not exist yet")
            print("   This is OK - it will be created when first record is synced")
        else:
            print(f"[ERROR] Error accessing collection: {e}")
            sys.exit(1)
    
    # Check SQLite for comparison
    DB_PATH = DATA_DIR / "visits.db"
    if DB_PATH.exists():
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM visits")
        sqlite_count = cursor.fetchone()[0]
        conn.close()
        print(f"\nSQLite records: {sqlite_count}")
        print(f"   (ChromaDB should have embeddings for synced records)")
    
    print("\n[OK] ChromaDB check complete!")
    
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("   Install with: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

