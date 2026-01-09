from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional
import os
import json
import uvicorn
import uuid
from contextlib import asynccontextmanager

from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

# Import local modules
from backend.ingestion import DocumentProcessor
from backend.rag_engine import RAGEngine
from backend.models import ChatRequest, ChatResponse, DocumentResponse, LoginRequest, User, UserCreate, Token
from backend.database import db
from backend import auth

# Global RAG Engine instance
rag_engine = None
doc_processor = DocumentProcessor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models and index
    global rag_engine
    print("Startup: Connecting to Database...")
    db.connect()
    
    print("Startup: Loading RAG Engine...")
    rag_engine = RAGEngine()
    yield
    # Shutdown
    print("Shutdown: Saving index...")
    if rag_engine:
        rag_engine.save_index()
    print("Shutdown: Closing Database...")
    db.close()

app = FastAPI(title="Offline RAG API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Auth Routes ---

@app.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = auth.get_password_hash(user.password)
    
    # Save to DB
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"]
    
    result = await db.users.insert_one(user_dict)
    
    return User(**user_dict)

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # Authenticate (form_data.username will be the email)
    user = await db.users.find_one({"email": form_data.username})
    if not user or not auth.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create Token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(auth.get_current_user)):
    return current_user

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
    current_user: User = Depends(require_admin) # CHANGED: Now requires Admin
):
    # Enterprise Access Control: Enforced via require_admin dependency


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
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(auth.get_current_user)):
    global rag_engine
    if not rag_engine:
         raise HTTPException(status_code=503, detail="RAG Engine not initialized")
    
    response = rag_engine.generate_answer(request.message)
    return response

def require_admin(current_user: User = Depends(auth.get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@app.get("/documents")
def list_documents(current_user: User = Depends(auth.get_current_user)):
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
def delete_all_documents(current_user: User = Depends(require_admin)):
    global rag_engine
    if rag_engine:
        rag_engine.clear()
        return {"status": "cleared", "message": "All documents and indexes have been reset."}
    raise HTTPException(status_code=503, detail="RAG Engine not ready")

@app.delete("/api/documents/{doc_id}")
def delete_single_document(doc_id: str, current_user: User = Depends(require_admin)):
    """
    Delete a specific document and all its associated data.
    Removes from: FAISS index and uploads folder.
    """
    global rag_engine
    if not rag_engine:
        raise HTTPException(status_code=503, detail="RAG Engine not ready")
    
    result = rag_engine.delete_document(doc_id)
    
    if result["status"] == "error":
        raise HTTPException(status_code=404, detail=result["message"])
    
    return result

@app.get("/ingestion/status")
def get_ingestion_status():
    """
    Get real-time ingestion progress.
    Checks both document processor and RAG engine status files.
    """
    global rag_engine
    
    # Check RAG engine's processing status
    if rag_engine:
        status_path = os.path.join("models", "processing_status.json")
        if os.path.exists(status_path):
            try:
                with open(status_path, "r") as f:
                    rag_status = json.load(f)
                # Return current status
                if rag_status.get("status") in ["indexing", "ready"]:
                    return rag_status
            except:
                pass
    
    # Fall back to document processor status
    return doc_processor.get_progress()


@app.post("/chat/stream")
def chat_stream_endpoint(request: ChatRequest, current_user: User = Depends(auth.get_current_user)):
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
