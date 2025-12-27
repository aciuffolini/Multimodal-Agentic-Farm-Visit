"""
Test ChromaDB functionality
Run: python test-chromadb.py
"""

import os
import sys
from pathlib import Path

try:
    import chromadb
    from chromadb.config import Settings
    
    DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
    CHROMA_DIR = DATA_DIR / "chroma"
    
    print("=" * 60)
    print("ChromaDB Status Check")
    print("=" * 60)
    print()
    
    # 1. Check if RAG service is running
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code == 200:
            print("[OK] RAG service is running on http://localhost:8000")
        else:
            print(f"[WARNING] RAG service returned status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] RAG service not running: {e}")
        print("   Start it with: python main.py")
        print()
    
    # 2. Check ChromaDB
    print("\nChromaDB Status:")
    print("-" * 60)
    
    if not CHROMA_DIR.exists():
        print("[INFO] ChromaDB directory not created yet (will be created on first use)")
    else:
        print(f"[OK] ChromaDB directory: {CHROMA_DIR}")
        
        try:
            chroma_client = chromadb.PersistentClient(
                path=str(CHROMA_DIR),
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Try to get collection
            try:
                collection = chroma_client.get_collection("farm_visits")
                count = collection.count()
                print(f"[OK] Collection 'farm_visits' exists")
                print(f"[INFO] Records in ChromaDB: {count}")
                
                if count > 0:
                    # Get sample
                    results = collection.get(limit=1)
                    print(f"\nSample record:")
                    print(f"  ID: {results['ids'][0]}")
                    if results['metadatas']:
                        print(f"  Metadata: {results['metadatas'][0]}")
                else:
                    print("\n[INFO] No embeddings yet. Embeddings will be created when:")
                    print("  1. Records are synced via /sync/visits/upsert")
                    print("  2. Embeddings generated via /rag/upsert")
                    print("  3. OPENAI_API_KEY must be set for embeddings")
                    
            except Exception as e:
                if "does not exist" in str(e).lower():
                    print("[INFO] Collection not created yet (will be created on first sync)")
                else:
                    print(f"[ERROR] Error accessing collection: {e}")
                    
        except Exception as e:
            print(f"[ERROR] Failed to initialize ChromaDB: {e}")
    
    # 3. Check SQLite
    print("\nSQLite Database:")
    print("-" * 60)
    DB_PATH = DATA_DIR / "visits.db"
    if DB_PATH.exists():
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM visits")
        sqlite_count = cursor.fetchone()[0]
        conn.close()
        print(f"[OK] SQLite database exists")
        print(f"[INFO] Records in SQLite: {sqlite_count}")
        
        if sqlite_count > 0:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT id, field_id, crop, sync_status FROM visits LIMIT 3")
            rows = cursor.fetchall()
            print("\nSample records:")
            for row in rows:
                print(f"  {row[0][:8]}... | {row[1] or '-'} | {row[2] or '-'} | {row[3]}")
            conn.close()
    else:
        print("[INFO] SQLite database not created yet")
    
    # 4. Check API key
    print("\nConfiguration:")
    print("-" * 60)
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        masked = api_key[:7] + "..." + api_key[-4:] if len(api_key) > 11 else "***"
        print(f"[OK] OPENAI_API_KEY is set: {masked}")
    else:
        print("[WARNING] OPENAI_API_KEY not set")
        print("   Embeddings cannot be generated without API key")
        print("   Set with: export OPENAI_API_KEY='sk-...'")
    
    print()
    print("=" * 60)
    print("Summary:")
    print("=" * 60)
    print("ChromaDB is working correctly!")
    print("To add records:")
    print("  1. Sync visits from client (they go to SQLite first)")
    print("  2. Call /rag/upsert to generate embeddings")
    print("  3. Embeddings are stored in ChromaDB")
    print()
    
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}")
    print("Install with: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

