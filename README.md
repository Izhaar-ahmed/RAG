# Offline RAG System

A privacy-first, fully offline Retrieval-Augmented Generation system.

## 🌟 Key Features
- **100% Offline & Private**: Zero internet required. Your data never leaves your device.
- **Smart Document Search**: Hierarchical semantic search using local vector embeddings (FAISS).
- **Multi-Format Support**: Drag & Drop PDF, DOCX, and TXT files.
- **AI-Powered Q&A**: Generates answers using a quantized local LLM (Phi-3 Mini).
- **Transparent Citations**: Every answer links back to the exact source document and page number.
- **Knowledge Graph**: Extracts entities and relationships for enhanced retrieval.
- **Premium UI**: Modern, responsive dark-mode interface built with Next.js and Tailwind CSS.
- **Role-Based Access**: Admin/User authentication for secure document management.
- **Streaming Responses**: Real-time token-by-token answer generation.

## Setup

### 1. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 2. Download Models (One-time, requires Internet)
```bash
python backend/setup_models.py
```
This downloads:
- `sentence-transformers/all-MiniLM-L6-v2` (Embeddings)
- `Phi-3-mini-4k-instruct-Q4_K_M.gguf` (LLM)

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

## Running the System

### 1. Start Backend
```bash
# From project root
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start Frontend
```bash
# From frontend directory
cd frontend
npm run dev
```

### 3. Usage
- Open [http://localhost:3000](http://localhost:3000)
- Click **Login** in the sidebar
  - **Admin**: username `admin`, password `admin` (can upload documents)
  - **User**: username `user`, password `user` (read-only)
- Upload PDF, DOCX, or TXT files (admin only)
- Chat with your documents completely offline!

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Sidebar  │  │  FileUpload  │  │ChatWindow│  │    Login     │ │
│  └──────────┘  └──────────────┘  └──────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  main.py │  │ ingestion.py │  │      rag_engine.py       │   │
│  │   API    │  │ Doc Parser   │  │ Search + LLM Generation  │   │
│  └──────────┘  └──────────────┘  └──────────────────────────┘   │
│                                           │                      │
│                              ┌────────────┴────────────┐        │
│                              ▼                         ▼        │
│                    ┌──────────────┐          ┌──────────────┐   │
│                    │    FAISS     │          │ graph_engine │   │
│                    │ Vector Index │          │  Knowledge   │   │
│                    └──────────────┘          │    Graph     │   │
│                                              └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Local Models                             │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐   │
│  │   all-MiniLM-L6-v2      │  │   Phi-3-mini-4k-instruct    │   │
│  │   (Embeddings - 90MB)   │  │   (LLM - 2.3GB, Q4 GGUF)    │   │
│  └─────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Upload**: Documents are split into 500-char chunks, grouped into 20-page blocks
2. **Index**: Chunks are embedded and stored in hierarchical FAISS indexes
3. **Graph**: Entities and relationships are extracted in background
4. **Search**: Query finds relevant blocks → then relevant chunks within blocks
5. **Generate**: LLM reads context + graph hints → generates sourced answer

## Notes
- Ensure you have ~5-6GB of free RAM
- GGUF models run on CPU (no GPU required)
- First query may be slow as the LLM loads into memory

## Troubleshooting

- **"Admin access required"**: Login as admin to upload documents
- **Models not found**: Run `python backend/setup_models.py`
- **Slow responses**: Normal for CPU inference; streaming provides faster perceived response
