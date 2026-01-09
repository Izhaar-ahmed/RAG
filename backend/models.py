from pydantic import BaseModel
from typing import List, Optional

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str = "user" # 'admin' or 'user'

class User(UserBase):
    role: str
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
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
    upload_date: Optional[str] = None  # ISO 8601 format for freshness display

class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    error: Optional[str] = None
