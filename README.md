# Multimodal Agentic Farm Visit System

> A hybrid AI-powered field assistant for agricultural visits, combining offline-first mobile data collection with a multimodal Agentic RAG backend.

## 📦 Download the App
 
 [![Download APK](https://img.shields.io/badge/Download_APK-Latest_Release-green?style=for-the-badge&logo=android)](https://github.com/aciuffolini/Multimodal-Agentic-Farm-Visit/releases/latest/download/app-debug.apk)
 [![Open Web App](https://img.shields.io/badge/Open-Web_App-blue?style=for-the-badge&logo=react)](https://aciuffolini.github.io/Multimodal-Agentic-Farm-Visit/)
 
 *For mobile installation, tap the green button, download the APK, and enable "Install from unknown sources" on your Android device.*

## 🏷️ Versioning Model

We follow a streamlined **Semantic Versioning** approach tailored for this hybrid app (`vMAJOR.MINOR.PATCH-MODIFIER`):

*   **`MAJOR`** (`v1.x.x`): Significant architectural changes (e.g., swapping RAG database, entirely new multimodal model).
*   **`MINOR`** (`vX.1.x`): New features or major UI revamps (e.g., adding a new agent type, new mapping integration).
*   **`PATCH`** (`vX.X.1`): Bug fixes, UI tweaks, dependency updates, or prompt engineering improvements.
*   **`-MODIFIER`** (Optional): Pre-release tags like `-beta` (testing) or `-fix` (hotfixes outside the normal cycle).

**Examples:**
*   `v1.0.8`: The 8th stable patch of the 1.0 release.
*   `v1.0.8-fix`: A critical patch deployed immediately via GitHub Actions on a pushed tag.

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

## 🕶️ Offline AI & Meta Ray-Ban Integration

This application supports running **Meta's Llama-3.2-3B-Instruct** completely offline, providing a multimodal field assistant right on your device. It is also designed to interface with the **Meta Ray-Ban Wearables Device Access Toolkit**.

### 1. Downloading and Using Local Llama
1. Open the Chat Interface (bottom right FAB in the Web App).
2. Click the Model Selection dropdown and choose **Llama Small (offline)**.
3. The phone/browser will automatically begin downloading the model weights (~2GB) directly into your indexedDB storage. *Ensure you are on Wi-Fi for the initial download.*
4. Once it says "Llama 3.2 3B loaded and ready", you can disconnect from the internet and chat with the AI natively using WebGPU.

### 2. Connecting Meta Ray-Ban Glasses (Developer Preview)
*Note: Meta Wearables integration requires access to the official Android SDK `.aar` files from the Meta Developer Center.*
1. Have the Meta SDK available in `apps/web/android/app/libs/`.
2. The Capacitor interface is already scaffolded in `RayBanPlugin.java` and `RayBanIntegration.ts`.
3. Enable developer mode on your physical Ray-Ban Meta glasses (tap version 5 times in Meta AI app).
4. Run the app, and the integration layer will pull the 12MP camera feed and 5-mic array directly into the Local Llama agent.

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
