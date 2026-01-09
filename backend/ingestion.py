"""
Multi-modal Document Processor
Extracts text, tables (as Markdown), and images (via OCR) from documents.
"""
import os
import json
from typing import List, Dict, Any

# Document parsing
import fitz  # PyMuPDF - pip install PyMuPDF
import docx

# Table handling  
import pandas as pd

# OCR for images
from rapidocr_onnxruntime import RapidOCR

from fastapi import UploadFile


class DocumentProcessor:
    """
    Multi-modal document processor supporting:
    - PDF: Text, Tables (as Markdown), Images (via OCR)
    - DOCX: Text extraction
    - TXT: Plain text
    """
    
    def __init__(self, upload_dir: str = "uploads", models_dir: str = "models"):
        self.upload_dir = upload_dir
        self.models_dir = models_dir
        self.progress_file = os.path.join(models_dir, "ingestion_status.json")
        
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Initialize OCR engine (lazy load on first use)
        self._ocr_engine = None
    
    @property
    def ocr_engine(self):
        """Lazy-load OCR engine to avoid startup delay if not needed."""
        if self._ocr_engine is None:
            print("Initializing RapidOCR engine...")
            self._ocr_engine = RapidOCR()
        return self._ocr_engine

    async def save_file(self, file: UploadFile) -> str:
        """Save uploaded file to disk."""
        file_path = os.path.join(self.upload_dir, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        return file_path

    def update_progress(self, status: str, current: int, total: int, message: str):
        """
        Write ingestion progress to a JSON file for frontend polling.
        
        Args:
            status: "processing", "complete", or "error"
            current: Current block number being processed
            total: Total number of blocks
            message: Human-readable status message
        """
        progress_data = {
            "status": status,
            "current_block": current,
            "total_blocks": total,
            "message": message,
            "percent": int((current / total) * 100) if total > 0 else 0
        }
        
        with open(self.progress_file, "w") as f:
            json.dump(progress_data, f)
        
        print(f"[Progress] {message} ({current}/{total})")

    def get_progress(self) -> Dict[str, Any]:
        """Read current ingestion progress from file."""
        if os.path.exists(self.progress_file):
            with open(self.progress_file, "r") as f:
                return json.load(f)
        return {"status": "idle", "current_block": 0, "total_blocks": 0, "message": "No ingestion in progress"}

    def extract_structured_content(self, page: fitz.Page) -> List[Dict[str, Any]]:
        """
        Extract structured content from a single PDF page.
        
        Returns a list of content items, each with:
        - type: "text", "table", or "image_text"
        - content: The extracted content
        - source: Description of where this came from
        """
        content_items = []
        page_num = page.number + 1  # fitz uses 0-indexed pages
        
        # 1. TABLE EXTRACTION
        try:
            tables = page.find_tables()
            if tables and tables.tables:
                for i, table in enumerate(tables.tables):
                    # Extract table data
                    table_data = table.extract()
                    
                    if table_data and len(table_data) > 1:  # Has header + at least one row
                        # Convert to DataFrame for Markdown conversion
                        df = pd.DataFrame(table_data[1:], columns=table_data[0])
                        markdown_table = df.to_markdown(index=False)
                        
                        content_items.append({
                            "type": "table",
                            "content": markdown_table,
                            "source": f"Table {i+1} on page {page_num}",
                            "page": page_num
                        })
                        print(f"  [Table] Extracted table {i+1} from page {page_num}")
        except Exception as e:
            print(f"  [Table Warning] Could not extract tables from page {page_num}: {e}")
        
        # 2. IMAGE/OCR EXTRACTION
        try:
            images = page.get_images(full=True)
            for img_idx, img_info in enumerate(images):
                xref = img_info[0]
                
                try:
                    # Extract image bytes
                    base_image = page.parent.extract_image(xref)
                    image_bytes = base_image["image"]
                    
                    # Run OCR
                    result, _ = self.ocr_engine(image_bytes)
                    
                    if result:
                        # Combine all OCR text
                        ocr_text = " ".join([line[1] for line in result])
                        
                        # Only include if meaningful text found (>10 chars)
                        if len(ocr_text.strip()) > 10:
                            content_items.append({
                                "type": "image_text",
                                "content": ocr_text.strip(),
                                "source": f"OCR from image {img_idx+1} on page {page_num}",
                                "page": page_num
                            })
                            print(f"  [OCR] Extracted text from image {img_idx+1} on page {page_num}")
                except Exception as img_e:
                    print(f"  [OCR Warning] Could not process image {img_idx+1} on page {page_num}: {img_e}")
        except Exception as e:
            print(f"  [OCR Warning] Could not get images from page {page_num}: {e}")
        
        # 3. NORMAL TEXT EXTRACTION
        try:
            text = page.get_text("text")
            if text and text.strip():
                content_items.append({
                    "type": "text",
                    "content": text.strip(),
                    "source": f"Text from page {page_num}",
                    "page": page_num
                })
        except Exception as e:
            print(f"  [Text Warning] Could not extract text from page {page_num}: {e}")
        
        return content_items

    def create_smart_chunks(
        self, 
        content_items: List[Dict[str, Any]], 
        chunk_size: int = 500, 
        overlap: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Intelligently chunk content based on type.
        
        Rules:
        - Tables and OCR content: Treat as ATOMIC (no splitting)
        - Normal text: Split by chunk_size with overlap
        """
        processed_chunks = []
        
        for item in content_items:
            content_type = item.get("type", "text")
            content = item.get("content", "")
            page = item.get("page", 1)
            source = item.get("source", "unknown")
            
            if content_type in ("table", "image_text"):
                # ATOMIC CHUNK: Do not split tables or OCR content
                processed_chunks.append({
                    "text": content,
                    "page": page,
                    "source": source,
                    "type": content_type
                })
            else:
                # NORMAL TEXT: Split with overlap
                text = content
                start = 0
                chunk_idx = 0
                
                while start < len(text):
                    end = min(start + chunk_size, len(text))
                    chunk_text = text[start:end]
                    
                    processed_chunks.append({
                        "text": chunk_text,
                        "page": page,
                        "source": f"{source} (chunk {chunk_idx + 1})",
                        "type": "text"
                    })
                    
                    start += (chunk_size - overlap)
                    chunk_idx += 1
        
        return processed_chunks

    def extract_text(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Multi-modal text extraction from file.
        
        For PDFs: Extracts text, tables, and OCR from images.
        For DOCX/TXT: Extracts plain text.
        """
        ext = os.path.splitext(file_path)[1].lower()
        all_content = []

        if ext == ".pdf":
            print(f"[PDF] Processing: {file_path}")
            doc = fitz.open(file_path)
            total_pages = len(doc)
            
            self.update_progress("processing", 0, total_pages, f"Starting PDF extraction ({total_pages} pages)...")
            
            for page_idx, page in enumerate(doc):
                print(f"[PDF] Processing page {page_idx + 1}/{total_pages}")
                page_content = self.extract_structured_content(page)
                all_content.extend(page_content)
                
                # Update progress every 5 pages
                if (page_idx + 1) % 5 == 0 or page_idx == total_pages - 1:
                    self.update_progress(
                        "processing", 
                        page_idx + 1, 
                        total_pages, 
                        f"Extracted page {page_idx + 1}/{total_pages}"
                    )
            
            doc.close()
            self.update_progress("complete", total_pages, total_pages, "PDF extraction complete")
            
        elif ext == ".docx":
            print(f"[DOCX] Processing: {file_path}")
            doc = docx.Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            
            all_content.append({
                "type": "text",
                "content": "\n".join(full_text),
                "page": 1,
                "source": "DOCX document"
            })
            
        elif ext == ".txt":
            print(f"[TXT] Processing: {file_path}")
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
            
            all_content.append({
                "type": "text",
                "content": text,
                "page": 1,
                "source": "TXT file"
            })
        
        return all_content

    def chunk_text(self, raw_content: List[Dict[str, Any]], chunk_size: int = 500, overlap: int = 50) -> List[Dict[str, Any]]:
        """
        Wrapper for smart chunking. Maintains backward compatibility.
        """
        return self.create_smart_chunks(raw_content, chunk_size, overlap)
