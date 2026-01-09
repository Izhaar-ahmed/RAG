from pydantic import BaseModel
from typing import List, Optional

class User(BaseModel):
    username: str
    role: str # 'admin' or 'user'

class LoginRequest(BaseModel):
    username: str
    password: str

class DocumentResponse(BaseModel):
    id: str
    name: str
    page_count: int
    upload_date: str

class ChatRequest(BaseModel):
    message: str

class Citation(BaseModel):
    document_name: str
    page_number: int
    text_snippet: str
    score: float

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    error: Optional[str] = None
