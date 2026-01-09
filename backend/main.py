from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import os
import uvicorn
import uuid
from contextlib import asynccontextmanager

# Import local modules
from backend.ingestion import DocumentProcessor
from backend.rag_engine import RAGEngine
from backend.models import ChatRequest, ChatResponse, DocumentResponse, LoginRequest, User

# Global RAG Engine instance
rag_engine = None
doc_processor = DocumentProcessor()

# Mock Users DB
USERS_DB = {
    "admin": "admin", # password
    "user": "user"
}
USER_ROLES = {
    "admin": "admin",
    "user": "user"
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models and index
    global rag_engine
    print("Startup: Loading RAG Engine...")
    rag_engine = RAGEngine()
    yield
    # Shutdown
    print("Shutdown: Saving index...")
    if rag_engine:
        rag_engine.save_index()

app = FastAPI(title="Offline RAG API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth ---
def get_current_user(token: str = None):
    # For this offline demo, we accept a simple username as the "token"
    # In a real app, this would be a JWT bearer token
    if not token:
        return None
    
    if token in USERS_DB:
        return User(username=token, role=USER_ROLES[token])
    return None

def require_admin(user: User = Depends(get_current_user)):
    if not user or user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user

@app.post("/auth/login")
def login(creds: LoginRequest):
    if creds.username in USERS_DB and USERS_DB[creds.username] == creds.password:
        return {"token": creds.username, "role": USER_ROLES[creds.username]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- Routes ---

@app.get("/")
def health_check():
    global rag_engine
    model_loaded = (rag_engine is not None and rag_engine.llm is not None)
    return {
        "status": "ok", 
        "offline_mode": True,
        "model_loaded": model_loaded
    }

@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...), 
    user_token: Optional[str] = None # Expecting token in query or header in real app
):
    # Manual check for demo simplicity if dependency is tricky with File upload
    # But let's try to verify user if token provided
    current_user = get_current_user(user_token)
    if not current_user or current_user.role != "admin":
         raise HTTPException(status_code=403, detail="Admin access required")

    global rag_engine
    try:
        file_path = await doc_processor.save_file(file)
        chunks = doc_processor.extract_text(file_path)
        
        # Process chunks
        processed_chunks = doc_processor.chunk_text(chunks)
        
        # Add source info & Generate ID
        doc_id = str(uuid.uuid4())
        doc_name = file.filename
        
        for c in processed_chunks:
            c["source"] = doc_name
            
        # Add to index
        if rag_engine:
            rag_engine.add_document(doc_id, doc_name, processed_chunks)
            
        return {
            "filename": doc_name, 
            "id": doc_id, 
            "status": "uploaded_and_indexed", 
            "chunks": len(processed_chunks),
            "estimated_blocks": (len(processed_chunks) > 0)
        }
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    global rag_engine
    if not rag_engine:
         raise HTTPException(status_code=503, detail="RAG Engine not initialized")
    
    response = rag_engine.generate_answer(request.message)
    return response

@app.get("/documents")
def list_documents():
    # Return unique documents from RAG engine metadata
    global rag_engine
    if rag_engine:
        # block_metadata contains one entry per block. 
        # We need to group by doc_id to show unique documents in frontend.
        unique_docs = {}
        for block in rag_engine.block_metadata:
            doc_id = block.get("doc_id")
            if doc_id and doc_id not in unique_docs:
                unique_docs[doc_id] = {
                    "id": doc_id,
                    "name": block.get("name"),
                    "page_range": block.get("page_range") # Just show first block range or omit
                }
        return list(unique_docs.values())
    return []

@app.delete("/documents")
def delete_all_documents(user: User = Depends(require_admin)):
    global rag_engine
    if rag_engine:
        rag_engine.clear()
        return {"status": "cleared", "message": "All documents and indexes have been reset."}
    raise HTTPException(status_code=503, detail="RAG Engine not ready")

@app.get("/ingestion/status")
def get_ingestion_status():
    """
    Get real-time ingestion progress.
    Frontend can poll this endpoint during file upload.
    """
    return doc_processor.get_progress()

@app.post("/chat/stream")
def chat_stream_endpoint(request: ChatRequest):
    global rag_engine
    if not rag_engine:
        # If engine not ready, yield a basic error stream
        def error_gen():
            yield "data: {\"token\": \"System is starting...\"}\n\n"
        return StreamingResponse(error_gen(), media_type="text/event-stream")
    
    return StreamingResponse(
        rag_engine.generate_answer_stream(request.message),
        media_type="text/event-stream"
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
