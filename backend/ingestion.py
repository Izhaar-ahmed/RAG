import os
from typing import List
import pypdf
import docx
from fastapi import UploadFile

class DocumentProcessor:
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_file(self, file: UploadFile) -> str:
        file_path = os.path.join(self.upload_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        return file_path

    def extract_text(self, file_path: str) -> List[dict]:
        """
        Extracts text from file. Returns a list of dicts with 'text' and 'page' (if applicable).
        """
        ext = os.path.splitext(file_path)[1].lower()
        chunks = []

        if ext == ".pdf":
            reader = pypdf.PdfReader(file_path)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    chunks.append({"text": text, "page": i + 1})
        
        elif ext == ".docx":
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            # DOCX doesn't have strict pages, so we treat it as one big page or split roughly
            # For simplicity, we stick to one block, but RAG usually needs chunking.
            # We will handle chunking later, here we just get raw text.
            chunks.append({"text": "\n".join(full_text), "page": 1})
            
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            chunks.append({"text": text, "page": 1})
            
        return chunks

    def chunk_text(self, raw_chunks: List[dict], chunk_size: int = 500, overlap: int = 50) -> List[dict]:
        """
        Splits extracted text into smaller semantic chunks.
        """
        processed_chunks = []
        
        for item in raw_chunks:
            text = item["text"]
            page = item["page"]
            
            # Simple recursive-like splitting by character count for now
            # In a real app, we'd use LangChain's RecursiveCharacterTextSplitter
            start = 0
            while start < len(text):
                end = min(start + chunk_size, len(text))
                chunk_text = text[start:end]
                
                # Check for word boundary/newline to avoid cutting words
                # (Simple fallback)
                
                processed_chunks.append({
                    "text": chunk_text,
                    "page": page,
                    "source": "file" # Placeholder
                })
                start += (chunk_size - overlap)
                
        return processed_chunks
