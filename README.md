# Multimodal Agentic Farm Visit System

> A hybrid AI-powered field assistant for agricultural visits, combining offline-first mobile data collection with a multimodal Agentic RAG backend.

## 🌟 Overview

This system is designed to act as an intelligent companion for agronomists and farmers. It operates in two modes:
1.  **Field Mode (Mobile APK):** Offline-capable Android app for capturing data (photos, GPS logs, notes) directly in the field.
2.  **Analysis Mode (Web/Server):** A powerful RAG (Retrieval Augmented Generation) backend that processes collected data using Multimodal AI (Text + Image embeddings).

## 🏗️ Architecture

### 1. The Server (The Brain)
- **RAG Service:** Python/FastAPI backend.
- **Multimodal Engine:** Uses **CLIP** (Contrastive Language-Image Pretraining) to "see" and "read" your farm data.
- **Vector Database:** Dual-collection ChromaDB (Text + Images) for cross-modal search.
- **Data Store:** SQLite + File System for persistent event records.

### 2. The Client (The Body)
- **Framework:** React + Vite + Tailwind CSS.
- **Platform:**
  - **Web:** Accessible via browser for analysis/chat.
  - **Android:** Native APK built with **Capacitor** for on-device hardware access (Camera, GPS, Offline Storage).
- **Communication:** Syncs with the RAG server when connectivity is available.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (PNPM recommended)
- Python 3.11+ (UV recommended)
- Android Studio (for APK building)

### Installation

**1. Backend (RAG Service)**
```powershell
cd server/rag_service
uv venv .venv --python 3.11   # Create environment
.venv\Scripts\activate        # Activate
uv pip install -r requirements.txt
```

**2. Frontend (Web/Mobile)**
```powershell
cd apps/web
pnpm install
```

### 🏃 Running the System

**Option A: Hybrid Development (Recommended)**
Runs the RAG service, Chat API, and Web Client simultaneously:
```powershell
cd apps/web
.\start-all-servers.ps1
```

**Option B: Building for Android**
To generate the APK for field testing:
```powershell
cd apps/web
npm run android:build  # Builds Vite -> Syncs Capacitor -> Opens Android Studio
```
*Then use Android Studio to Run on Device or Build Signed APK.*

## 🧠 Multimodal capabilities
The system now supports **Phase 1 Multimodal RAG**:
- **Image Embeddings:** Photos uploaded are automatically embedded using local CLIP models.
- **Semantic Search:** Search for "corn rust" and find both *notes describing usage* AND *images showing the disease*.
- **GPS Context:** Photos retain EXIF location data for map-based retrieval.

## 📱 Mobile Strategy (Capacitor)
We use the **Capacitor** bridge to compile the React web app into a native Android binary.
- `capacitor.config.ts`: Manages permissions (Camera/Location) and server configuration.
- `start-all-servers.ps1`: Orchestrates the local development environment.

## 🔒 Security Note
This repository is configured for private use. Ensure your `.env` files (containing API keys) are never committed.
