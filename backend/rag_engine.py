import os
import json
import faiss
import numpy as np
import threading
import logging
from datetime import datetime
from typing import List, Optional, Dict
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from backend.models import Citation

class RAGEngine:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.indexes_dir = os.path.join(models_dir, "indexes")
        self.embedding_model = None
        self.llm = None
        
        # Hierarchical Indexing
        self.block_index = None # Global index for document blocks
        
        # Map block_id -> Index (Chunk level). block_id = "{doc_id}_block_{i}"
        self.chunk_indexes: Dict[str, faiss.Index] = {} 
        
        # List of dicts matching block_index. Each item has: {block_id, doc_id, page_range, ...}
        self.block_metadata = [] 

        # Map block_id -> List of chunks (chunk metadata)
        self.chunk_metadata: Dict[str, List[dict]] = {} 
        
        self.dimension = 384 

        # Paths
        self.block_index_path = os.path.join(models_dir, "block_index.bin")
        self.metadata_path = os.path.join(models_dir, "block_metadata.npy")
        self.status_path = os.path.join(models_dir, "processing_status.json")
        
        self.lock = threading.Lock() # Lock for thread-safe writes
        
        os.makedirs(self.indexes_dir, exist_ok=True)
        
        self.load_models()
        
        # Initialize status as ready
        self.update_status("ready", "System ready", 100)

    def update_status(self, stage: str, message: str, progress: int):
        """
        Write processing status for frontend polling.
        
        Args:
            stage: "uploading", "chunking", "indexing", "ready", "error"
            message: Human-readable status message
            progress: 0-100 percentage
        """
        try:
            with open(self.status_path, "w") as f:
                json.dump({"status": stage, "message": message, "progress": progress}, f)
        except Exception as e:
            print(f"Error writing status: {e}")

    def load_models(self):
        print("Loading Embedding Model...")
        embed_path = os.path.join(self.models_dir, "embedding_model")
        if os.path.exists(embed_path):
            self.embedding_model = SentenceTransformer(embed_path)
        else:
            print("Local embedding model not found, using default.")
            self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

        print("Loading LLM...")
        if os.path.exists(self.models_dir):
            gguf_files = [f for f in os.listdir(self.models_dir) if f.endswith(".gguf")]
            
            # Prefer Phi-3 if available
            phi_files = [f for f in gguf_files if "phi-3" in f.lower()]
            if phi_files:
                model_file = phi_files[0]
                print(f"Found Phi-3 Model: {model_file}")
            elif gguf_files:
                model_file = gguf_files[0]
                print(f"Found GGUF Model: {model_file}")
            else:
                model_file = None
                
            if model_file:
                model_path = os.path.join(self.models_dir, model_file)
                self.llm = Llama(
                    model_path=model_path, 
                    n_ctx=4096,
                    n_gpu_layers=-1, # GPU ENABLED for speed
                    n_threads=2, 
                    verbose=False     
                )
            else:
                print("WARNING: No GGUF model found.")
                self.llm = None
        else:
            self.llm = None

        # Initialize Block Index
        if os.path.exists(self.block_index_path) and os.path.exists(self.metadata_path):
            print("Loading Block FAISS index...")
            self.block_index = faiss.read_index(self.block_index_path)
            self.block_metadata = np.load(self.metadata_path, allow_pickle=True).tolist()
            
            print("Loading Chunk indexes...")
            # Load ALL chunk indexes. 
            # In a real heavy production system, you might lazy load these or use a disk-based index.
            for meta in self.block_metadata:
                block_id = meta.get("block_id")
                if block_id:
                    self._load_chunk_index(block_id)
        else:
            print("Creating new Block FAISS index...")
            self.block_index = faiss.IndexFlatL2(self.dimension)
            self.block_metadata = []

    def _load_chunk_index(self, block_id: str):
        index_path = os.path.join(self.indexes_dir, f"{block_id}.bin")
        meta_path = os.path.join(self.indexes_dir, f"{block_id}_meta.npy")
        
        if os.path.exists(index_path) and os.path.exists(meta_path):
            self.chunk_indexes[block_id] = faiss.read_index(index_path)
            self.chunk_metadata[block_id] = np.load(meta_path, allow_pickle=True).tolist()

    def save_index(self):
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
            
        # Save Global Block Index
        faiss.write_index(self.block_index, self.block_index_path)
        np.save(self.metadata_path, self.block_metadata)
        
        # Save Local Chunk Indexes (for each block)
        for block_id, index in self.chunk_indexes.items():
            index_path = os.path.join(self.indexes_dir, f"{block_id}.bin")
            meta_path = os.path.join(self.indexes_dir, f"{block_id}_meta.npy")
            faiss.write_index(index, index_path)
            np.save(meta_path, self.chunk_metadata[block_id])
            
        print("Indexes saved.")

    def clear(self):
        """Clears all indexes and metadata from memory and disk."""
        print("Clearing all indexes...")
        self.block_index = faiss.IndexFlatL2(self.dimension)
        self.block_metadata = []
        self.chunk_indexes = {}
        self.chunk_metadata = {}
        
        # Delete files
        import shutil
        if os.path.exists(self.indexes_dir):
            shutil.rmtree(self.indexes_dir)
            os.makedirs(self.indexes_dir)
            
        if os.path.exists(self.block_index_path):
            os.remove(self.block_index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)
            
        print("System Reset Complete.")

    def delete_document(self, doc_id: str) -> dict:
        """
        Delete a single document from all indexes and storage.
        
        This performs a full cleanup:
        1. FAISS: Rebuild indexes without the deleted doc's blocks
        2. Disk: Delete chunk index files and uploaded file
        
        Returns:
            dict with status and message
        """
        print(f"Deleting document: {doc_id}")
        
        # Find all blocks belonging to this document
        blocks_to_delete = [m["block_id"] for m in self.block_metadata if m["doc_id"] == doc_id]
        
        if not blocks_to_delete:
            return {"status": "error", "message": f"Document {doc_id} not found"}
        
        # Get doc name for file deletion
        doc_name = None
        for m in self.block_metadata:
            if m["doc_id"] == doc_id:
                doc_name = m.get("name")
                break
        
        # --- FAISS Index Rebuild ---
        print("  Rebuilding FAISS indexes...")
        
        # Filter metadata to keep only non-deleted docs
        remaining_metadata = [m for m in self.block_metadata if m["doc_id"] != doc_id]
        
        # Delete old chunk index files for deleted blocks
        for block_id in blocks_to_delete:
            index_path = os.path.join(self.indexes_dir, f"{block_id}.bin")
            meta_path = os.path.join(self.indexes_dir, f"{block_id}_meta.npy")
            
            if os.path.exists(index_path):
                os.remove(index_path)
            if os.path.exists(meta_path):
                os.remove(meta_path)
                
            # Remove from memory
            if block_id in self.chunk_indexes:
                del self.chunk_indexes[block_id]
            if block_id in self.chunk_metadata:
                del self.chunk_metadata[block_id]
        
        # Rebuild block index from remaining blocks
        new_block_index = faiss.IndexFlatL2(self.dimension)
        
        for meta in remaining_metadata:
            block_id = meta["block_id"]
            if block_id in self.chunk_metadata:
                # Re-compute block embedding from chunks
                chunk_texts = [c["text"] for c in self.chunk_metadata[block_id]]
                chunk_embeddings = self.embedding_model.encode(chunk_texts)
                block_embedding = np.mean(chunk_embeddings, axis=0).reshape(1, -1)
                new_block_index.add(np.array(block_embedding).astype('float32'))
        
        self.block_index = new_block_index
        self.block_metadata = remaining_metadata
        
        # --- Step 3: File Deletion ---
        if doc_name:
            file_path = os.path.join("uploads", doc_name)
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"  Deleted file: {file_path}")
        
        # Save changes
        self.save_index()
        
        return {"status": "success", "message": f"Document '{doc_name}' deleted successfully"}

    def add_document(self, doc_id: str, doc_name: str, chunks: List[dict]):
        if not chunks:
            return
        
        # Generate timestamp for all chunks in this document
        created_at = datetime.now().isoformat()
            
        # 1. GROUP CHUNKS INTO 20-PAGE BLOCKS
        # Sort chunks first by page
        chunks.sort(key=lambda x: x["page"])
        
        blocks = {} # key: block_index, value: list of chunks
        
        # Block 0: Pages 1-20
        # Block 1: Pages 21-40
        # ...
        BLOCK_SIZE_PAGES = 20
        
        for chunk in chunks:
            page = chunk.get("page", 1)
            
            # VERSION CONTROL: Use file modification time if available, else current time
            # This ensures we respect the actual version of the file
            if "metadata" in chunk and "last_modified" in chunk["metadata"]:
                chunk["created_at"] = chunk["metadata"]["last_modified"]
            else:
                chunk["created_at"] = created_at
            
            # page 1..20 -> block 0
            # page 21..40 -> block 1
            block_idx = (page - 1) // BLOCK_SIZE_PAGES
            
            if block_idx not in blocks:
                blocks[block_idx] = []
            blocks[block_idx].append(chunk)

        # 2. PROCESS EACH BLOCK (FAISS ONLY - FAST)
        for b_idx, block_chunks in blocks.items():
            block_id = f"{doc_id}_block_{b_idx}"
            start_page = (b_idx * BLOCK_SIZE_PAGES) + 1
            end_page = (b_idx + 1) * BLOCK_SIZE_PAGES
            
            # --- Chunk Level (Local Index) ---
            chunk_texts = [c["text"] for c in block_chunks]
            chunk_embeddings = self.embedding_model.encode(chunk_texts)
            
            local_index = faiss.IndexFlatL2(self.dimension)
            local_index.add(np.array(chunk_embeddings).astype('float32'))
            
            self.chunk_indexes[block_id] = local_index
            self.chunk_metadata[block_id] = block_chunks
            
            # --- Block Level (Global Index) ---
            block_embedding = np.mean(chunk_embeddings, axis=0).reshape(1, -1)
            
            self.block_index.add(np.array(block_embedding).astype('float32'))
            self.block_metadata.append({
                "block_id": block_id,
                "doc_id": doc_id,
                "name": doc_name,
                "page_range": f"{start_page}-{end_page}",
                "chunk_count": len(block_chunks),
                "created_at": created_at  # Timestamp for freshness ranking
            })
            
            print(f"Index: Added Block {b_idx} for {doc_name}")

        self.save_index()
        self.update_status("ready", "Document indexed. System ready.", 100)
        print(f"Document '{doc_name}' indexed successfully.")

    def rerank_by_freshness(self, results: list, top_k: int = 5) -> list:
        """
        Re-rank results by document freshness (newest first).
        
        This ensures that if two chunks are similar in meaning, 
        the one from the more recently uploaded document appears first.
        
        Args:
            results: List of chunk dictionaries with 'created_at' field
            top_k: Maximum number of results to return
            
        Returns:
            Top k results sorted by created_at (descending)
        """
        sorted_results = sorted(
            results, 
            key=lambda x: x.get("created_at", "1970-01-01"), 
            reverse=True  # Newest first
        )
        return sorted_results[:top_k]

    def search(self, query: str, top_k_blocks: int = 15, top_k_chunks: int = 5, score_threshold: float = 1.35):
        import re
        target_doc = None
        # Use word boundary \b to avoid matching "explain" -> "in"
        # greedy match for filename: capture until the last .pdf/.docx/.txt
        match = re.search(r'\b(?:in|from)\s+([a-zA-Z0-9_\-\.\s]+\.(?:pdf|docx|txt))', query, re.IGNORECASE)
        if match:
            target_doc = match.group(1).strip()
            print(f"Targeted Search: '{target_doc}'")

        query_vector = self.embedding_model.encode([query]).astype('float32')
        
        # STAGE 1: Block Search
        if self.block_index.ntotal == 0:
            return [], ""
            
        if self.block_index.ntotal == 0:
            return [], ""
            
        relevant_block_ids = []
        
        # --- PATH A: Deterministic Targeted Search ---
        if target_doc:
            # If user specifies a doc, we MUST search only that doc.
            # Standard FAISS search might miss it if other docs dominate the top K.
            # So we scan metadata, find matching blocks, and compute scores manually.
            print(f"Executing deterministic search within: {target_doc}")
            
            candidates = []
            
            for idx, meta in enumerate(self.block_metadata):
                # Check name (handle both keys)
                doc_name = meta.get("name") or meta.get("document_name")
                
                # Case-insensitive comparison for user friendliness
                if doc_name and doc_name.lower() == target_doc.lower():
                    # Reconstruct vector from FAISS (IndexFlatL2 supports this)
                    if idx < self.block_index.ntotal:
                        vec = self.block_index.reconstruct(idx)
                        # Compute L2 distance manually: sum((v1-v2)^2)
                        # query_vector is (1, dim), vec is (dim,)
                        dist = np.sum((vec - query_vector[0])**2)
                        
                        candidates.append({
                            "idx": idx,
                            "dist": dist,
                            "block": meta
                        })
            
            # Sort by distance (asc)
            candidates.sort(key=lambda x: x["dist"])
            
            # Take top K
            for c in candidates[:top_k_blocks]:
                relevant_block_ids.append(c["block"]["block_id"])
                
        # --- PATH B: Standard Semantic Search ---
        else:
            k_blocks = min(top_k_blocks, self.block_index.ntotal)
            block_dists, block_indices = self.block_index.search(query_vector, k_blocks)
            
            candidates_all = []
            for i, idx in enumerate(block_indices[0]):
                if i >= len(block_dists[0]): break
                dist = block_dists[0][i]
                
                if idx != -1 and idx < len(self.block_metadata):
                    # add to candidates first, judge later
                    candidates_all.append({
                        "id": self.block_metadata[idx]["block_id"],
                        "score": dist
                    })

            # Filter with threshold
            good_candidates = [c for c in candidates_all if c["score"] <= score_threshold]
            
            # Fallback Strategy: If no "good" candidates, take the top 3 best-effort ones
            # This prevents "Information not available" when the answer exists but has a weak score
            if not good_candidates and candidates_all:
                print(f"Warning: Low retrieval scores (Best: {candidates_all[0]['score']:.2f}). Using fallback.")
                relevant_block_ids = [c["id"] for c in candidates_all[:top_k_blocks]]
            else:
                 relevant_block_ids = [c["id"] for c in good_candidates[:top_k_blocks]]
                
        # STAGE 2: Chunk Search within relevant BLOCKS
        all_candidates = []
        
        for block_id in relevant_block_ids:
            if block_id in self.chunk_indexes:
                idx = self.chunk_indexes[block_id]
                meta = self.chunk_metadata[block_id]
                
                k_chunks = min(top_k_chunks, idx.ntotal)
                dists, indices = idx.search(query_vector, k_chunks)
                
                for j, match_idx in enumerate(indices[0]):
                    if match_idx != -1 and match_idx < len(meta):
                        distance = float(dists[0][j])
                        
                        # No threshold filtering at chunk level - trust block selection
                        # The Adaptive Filtering at the end handles relevance trimming
                            
                        item = meta[match_idx]
                        all_candidates.append({
                            "text": item["text"],
                            "page": item.get("page", 1),
                            "score": distance,
                            "document_name": item.get("source", "unknown"),
                            "created_at": item.get("created_at", "1970-01-01")  # For freshness ranking
                        })
        
        # Sort by score (L2 distance ascending) and take top K global
        all_candidates.sort(key=lambda x: x["score"])
        
        # Adaptive Filtering: Limit citations to those close to the best match
        # Helps avoid providing 5 citations when only 1 is relevant
        final_results = []
        
        # KEYWORD BOOST: Force-include chunks that contain query words exactly
        # This helps with structured data like tables where semantic search fails
        query_words = [w.lower() for w in query.split() if len(w) > 2]
        keyword_matches = []
        other_candidates = []
        
        for c in all_candidates:
            text_lower = c["text"].lower()
            # If most query words appear in the chunk, it's a keyword match
            matches = sum(1 for w in query_words if w in text_lower)
            if matches >= len(query_words) * 0.6:  # 60% of words match
                keyword_matches.append(c)
            else:
                other_candidates.append(c)
        
        # Always include keyword matches first
        final_results.extend(keyword_matches)
        
        # Then add semantic matches with Adaptive Filtering
        if other_candidates:
            best_score = other_candidates[0]["score"]
            score_margin = 1.1 
            
            for c in other_candidates:
                if c["score"] <= best_score * score_margin:
                    final_results.append(c)
                else:
                    break
        
        # STAGE 3: Freshness Re-ranking (newest documents first)
        final_results = self.rerank_by_freshness(final_results, top_k_chunks)
        
        return final_results

    def generate_answer(self, query: str) -> dict:
        # Retrieve with freshness-ranked results - Top 10 to capture history
        context_items = self.search(query, top_k_chunks=10)
        
        if not context_items:
            print(f"Refusal: No context items passed threshold for query '{query}'")
            return {
                "answer": "The requested information is not available in the uploaded documents. (Low relevance)",
                "citations": []
            }

        # Build Context with upload dates for freshness awareness
        context_str = "\n\n".join([
            f"Document: {c['document_name']} (Page {c['page']}, Uploaded: {c.get('created_at', 'unknown')[:10]})\nContent: {c['text']}" 
            for c in context_items
        ])
        
        # System prompt with TEMPORAL RESOLUTION instruction
        system_instruction = """You are a precise and honest assistant. Your task is to answer the user's question using ONLY the provided context.
Instructions:
1. The User Question may contain typos. Match distinct words in the context (e.g. "Marigin" matches "Margin").
2. Answer the question using ONLY the provided context.
3. If the context does not contain the answer, output the exact phrase: "The requested information is not available in the uploaded documents."
4. CRITICAL: Do NOT use outside knowledge. Do NOT explain concepts (like "Softmax") not found in the context.
5. TEMPORAL RESOLUTION:
   - If the user asks for the CURRENT state (e.g., "Who is X?"), prioritize the document with the LATEST upload date.
   - If the user asks for HISTORY (e.g., "Who was X before?", "How has X changed?"), use ALL documents to construct a timeline.
   - Explicitly mention dates when information changed (e.g., "According to the 2024 report, X was Y, but the 2026 report states X is Z")."""

        # BASIC PROMPT
        prompt = (
            f"{system_instruction}\n\n"
            f"Context:\n{context_str}\n\n"
            f"Question: {query}\n\n"
            f"Answer:"
        )

        answer = ""
        if self.llm:
            try:
                # Strict sampling params to prevent gibberish
                output = self.llm(
                    prompt, 
                    max_tokens=256,        # Reduced for speed
                    temperature=0.1,       # Very deterministic
                    top_p=0.9,             # Nucleus sampling
                    repeat_penalty=1.1,    # Prevent repetition/garbage loops
                    stop=["Question:", "\n\nUser", "\n\n\n"],
                    echo=False
                )
                answer = output['choices'][0]['text'].strip()
            except Exception as e:
                print(f"LLM Error: {e}")
                answer = "Error generating response."
        else:
            answer = "⚠️ **System Notice**: LLM not loaded. Displaying retrieved context only."


        # Double check model refusal
        if "information is not available" in answer.lower() or "context does not contain" in answer.lower():
            return {
                "answer": "The requested information is not available in the uploaded documents.",
                "citations": []
            }

        citations = [
            Citation(
                document_name=c['document_name'],
                page_number=c['page'],
                text_snippet=c['text'][:150] + "...",
                score=c['score'],
                upload_date=c.get('created_at', None)
            ) for c in context_items
        ]

        return {
            "answer": answer,
            "citations": citations
        }

    def generate_answer_stream(self, query: str):
        # Retrieve with freshness-ranked results - Top 10 to capture history
        context_items = self.search(query, top_k_chunks=10)
        
        # 1. Handle No Context (Refusal)
        if not context_items:
            yield "data: " + str({"answer": "The requested information is not available in the uploaded documents.", "citations": []}).replace("'", '"') + "\n\n"
            return

        # 2. Prepare Prompt with freshness awareness
        context_str = "\n\n".join([
            f"Document: {c['document_name']} (Page {c['page']}, Uploaded: {c.get('created_at', 'unknown')[:10]})\nContent: {c['text']}" 
            for c in context_items
        ])
        
        # System prompt with TEMPORAL RESOLUTION instruction
        system_instruction = """You are a precise and honest assistant. Your task is to answer the user's question using ONLY the provided context.
Instructions:
1. The User Question may contain typos. Match distinct words in the context (e.g. "Marigin" matches "Margin").
2. Answer the question using ONLY the provided context.
3. If the context does not contain the answer, output the exact phrase: "The requested information is not available in the uploaded documents."
4. CRITICAL: Do NOT use outside knowledge. Do NOT explain concepts (like "Softmax") not found in the context.
5. TEMPORAL RESOLUTION:
   - If the user asks for the CURRENT state (e.g., "Who is X?"), prioritize the document with the LATEST upload date.
   - If the user asks for HISTORY (e.g., "Who was X before?", "How has X changed?"), use ALL documents to construct a timeline.
   - Explicitly mention dates when information changed (e.g., "According to the 2024 report, X was Y, but the 2026 report states X is Z")."""

        prompt = (
            f"{system_instruction}\n\n"
            f"Context:\n{context_str}\n\n"
            f"Question: {query}\n\n"
            f"Answer:"
        )

        import json
        
        # 3. Stream Tokens with Buffering
        if self.llm:
            with self.lock:
                stream = self.llm(
                    prompt,
                    max_tokens=256,
                    temperature=0.1,
                    top_p=0.9,
                    repeat_penalty=1.1,
                    stop=["Question:", "\n\n\n"],
                    stream=True,
                    echo=False
                )
                
                # Buffer to detect refusal
                buffer = ""
                citations_sent = False
                
                citations_payload = [
                    {
                        "document_name": c['document_name'],
                        "page_number": c['page'],
                        "text_snippet": c['text'][:150] + "...",
                        "score": float(c['score']),
                        "upload_date": c.get('created_at', None)
                    } for c in context_items
                ]
                
                for output in stream:
                    token = output['choices'][0]['text']
                    
                    if not citations_sent:
                        buffer += token
                        # Buffer ~50 chars (compromise between speed and refusal detection)
                        if len(buffer) > 50: 
                            # Check for refusal
                            refusal_phrases = [
                                "information is not available", 
                                "not available in the uploaded documents",
                                "context does not contain"
                            ]
                            is_refusal = any(phrase in buffer.lower() for phrase in refusal_phrases)
                            
                            if is_refusal:
                                yield f"event: citations\ndata: {json.dumps([])}\n\n"
                            else:
                                yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
                                
                            citations_sent = True
                            
                            # Stream buffer WORD BY WORD for smoother typewriter effect
                            words = buffer.split(' ')
                            for i, word in enumerate(words):
                                word_with_space = word if i == 0 else ' ' + word
                                yield f"data: {json.dumps({'token': word_with_space})}\n\n"
                            buffer = ""
                            
                    else:
                        # Stream tokens immediately for real-time feel
                        yield f"data: {json.dumps({'token': token})}\n\n"
                
                # Flush remaining buffer if loop ends and we never sent citations
                if not citations_sent:
                    refusal_phrases = ["information is not available", "not available in the uploaded documents", "context does not contain"]
                    is_refusal = any(phrase in buffer.lower() for phrase in refusal_phrases)
                    
                    if is_refusal:
                         yield f"event: citations\ndata: {json.dumps([])}\n\n"
                    else:
                         yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
                    
                    yield f"data: {json.dumps({'token': buffer})}\n\n"

        else:
            yield f"data: {json.dumps({'token': '⚠️ LLM not loaded.'})}\n\n"
