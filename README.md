# Enterprise Offline RAG

A privacy-first, verified "Enterprise-Grade" Retrieval-Augmented Generation system that runs **100% offline**.

This platform allows users to ingest documents (PDFs, DOCX, TXT, Images, Excel), build a local Vector Index, and chat with their data using a secure, air-gapped LLM (Phi-3). It features industry-standard security including **MongoDB** persistence and **JWT Authentication**.

![Status](https://img.shields.io/badge/Status-Production_Ready-success)
![Security](https://img.shields.io/badge/Security-Air_Gapped-blue)
![Stack](https://img.shields.io/badge/Stack-FastAPI_React_MongoDB-purple)

## 🚀 Key Features

### 🔐 Enterprise Security
- **Air-Gapped Privacy**: No data ever leaves the local machine. All processing (OCR, Embeddings, LLM Inference) is local.
- **JWT Authentication**: Secure, stateless authentication (`access_token`) using **Argon2** password hashing.
- **Role-Based Access**: separate flows for Admin (Uploaders) and Standard Users (Readers).
- **Persistent Storage**: **MongoDB** integration for robust user and document metadata management.

### 🧠 Advanced RAG Engine
- **Temporal Reasoning**: The model understands time and version history (e.g., *"What changed in the Q3 report vs Q2?"*).
- **Multimodal Ingestion**:
  - **OCR**: Extracts text from scanned PDFs and Images using `Tesseract` & `img2table`.
  - **Spreadsheets**: Native support for `.xlsx` and `.csv` with row-wise context preservation.

- **Hybrid Search**: Combines Dense Vector Retrieval (FAISS) with Keyword Search (BM25) and Freshness Re-ranking.

### 💻 Modern Frontend
- **Premium UI**: Dark-mode interface built with **Next.js** and **Tailwind CSS**.
- **Real-time Streaming**: Chat responses stream token-by-token for a natural conversational feel.
- **Interactive Dashboard**:
  - Drag-and-drop file upload with progress tracking.
  - Visualization of System Status (Neural Engine, Vector Store).
  - Citation transparency (Page numbers, Source files).

---

## 🛠️ Architecture

```mermaid
graph TD
    User[User] -->|HTTPS/JWT| NextJS[Frontend (Next.js)]
    NextJS -->|API Requests| FastAPI[Backend API (FastAPI)]
    
    subgraph "Secure Backend (Offline)"
        FastAPI -->|Auth| Auth[Auth Handler (Argon2)]
        FastAPI -->|Query| RAG[RAG Engine]
        RAG -->|Retrieval| FAISS[Vector Store]

        RAG -->|Inference| LLM[Local LLM (Phi-3)]
        
        FastAPI -->|Persistence| Mongo[(MongoDB)]
    end
```

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **MongoDB** (running locally or via Docker)
- **Tesseract OCR** (for image/scanned PDF support)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the Secure API Server
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Dashboard available at http://localhost:3000
```

---

## 📖 Usage Guide

### 1. Authentication
1. **Initial Setup**: Run the seeder script to create default accounts:
   ```bash
   python seed_users.py
   ```
2. **Login**:
   - **Admin** (`admin@company.com` / `admin`): Access to Chat + **Knowledge Base (Uploads)**.
   - **User** (`user@company.com` / `user`): Access to **Chat Only**.
3. **Manual Promotion**: To make any new user an admin, run `python create_admin.py`.

### 2. Ingestion
1. Navigate to the **Control Panel**.
2. Drag & Drop documents (PDF, Excel, Images).
3. Watch the **Processing Status**:
   - *Chunking* -> *Embedding* -> *Indexing*

### 3. Chat
1. Ask questions in the **Intelligence Hub**.
2. View **Citations** to verify answers against source documents.
3. The system ensures answers are grounded strictly in your data.

---

## 🛡️ License
Private Enterprise License. unauthorized distribution prohibited.
