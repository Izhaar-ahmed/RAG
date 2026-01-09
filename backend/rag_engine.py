import os
import faiss
import numpy as np
import threading
import concurrent.futures
import logging
from typing import List, Optional, Dict
from sentence_transformers import SentenceTransformer
from llama_cpp import Llama
from backend.models import Citation
from backend.graph_engine import LocalGraphStore, BlockGraphBuilder

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
        self.graph_path = os.path.join(models_dir, "knowledge_graph.json")
        
        self.lock = threading.Lock() # Lock for thread-safe writes because FAISS/Graph are not thread-safe for writes
        
        os.makedirs(self.indexes_dir, exist_ok=True)
        
        self.load_models()
        
        # Initialize Graph Engine
        self.graph_store = LocalGraphStore(self.graph_path)
        self.graph_builder = BlockGraphBuilder(self.llm)

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
                # OPTIMIZATION: Reduce n_threads since we use concurrent workers for graph
                self.llm = Llama(
                    model_path=model_path, 
                    n_ctx=4096,
                    n_gpu_layers=-1, 
                    n_threads=2, # Reduced from 6 to avoid CPU thrashing with 4 workers
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
            
        # Save Graph
        self.graph_store.save()
            
        print("Indexes and Graph saved.")

    def clear(self):
        """Clears all indexes and metadata from memory and disk."""
        print("Clearing all indexes...")
        self.block_index = faiss.IndexFlatL2(self.dimension)
        self.block_metadata = []
        self.chunk_indexes = {}
        self.chunk_metadata = {}
        self.graph_store.graph.clear() # Clear networkx graph
        
        # Delete files
        import shutil
        if os.path.exists(self.indexes_dir):
            shutil.rmtree(self.indexes_dir)
            os.makedirs(self.indexes_dir)
            
        if os.path.exists(self.block_index_path):
            os.remove(self.block_index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)
        if os.path.exists(self.graph_path):
            os.remove(self.graph_path)
            
        print("System Reset Complete.")

    def add_document(self, doc_id: str, doc_name: str, chunks: List[dict]):
        if not chunks:
            return
            
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
            # page 1..20 -> block 0
            # page 21..40 -> block 1
            block_idx = (page - 1) // BLOCK_SIZE_PAGES
            
            if block_idx not in blocks:
                blocks[block_idx] = []
            blocks[block_idx].append(chunk)

        # 2. PROCESS EACH BLOCK (FAISS ONLY - FAST)
        block_items = []
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
                "chunk_count": len(block_chunks)
            })
            
            print(f"Index: Added Block {b_idx} for {doc_name}")
            
            # Prepare for Background Graph Building
            block_items.append({
                "b_idx": b_idx,
                "block_chunks": block_chunks,
                "doc_id": doc_id,
                "doc_name": doc_name,
                "block_id": block_id,
                "page_range": f"{start_page}-{end_page}"
            })

        self.save_index() # Save FAISS index immediately
        
        # 3. TRIGGER BACKGROUND GRAPH BUILDING
        # Fire and forget (or rather, run in background thread pool)
        threading.Thread(target=self._build_graph_background, args=(block_items,), daemon=True).start()
        print("Background: Started Graph Building task...")
        
    def _build_graph_background(self, block_items: List[dict]):
        """Runs graph extraction in background without blocking upload"""
        print(f"Graph Background: Processing {len(block_items)} blocks...")
        
        # We can still use ThreadPool for concurrency within the background task
        # But limited workers to avoid lagging the UI query
        max_workers = 2 
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(self._process_graph_for_block, item) for item in block_items]
            concurrent.futures.wait(futures)
            
        self.save_index() # Save graph
        print("Graph Background: Completed and Saved.")

    def _process_graph_for_block(self, item: dict):
        """Worker for specific graph extraction logic"""
        if not self.llm:
            return

        block_id = item["block_id"]
        block_chunks = item["block_chunks"]
        doc_id = item["doc_id"]
        
        current_thread = threading.current_thread().name
        chunk_texts = [c["text"] for c in block_chunks]
        block_text = "\n".join(chunk_texts)
        
        try:
            # Note: locking LLM is safer if instance is shared
            with self.lock: 
                 triplets = self.graph_builder.process_block(block_id, block_text)
            
            with self.lock:
                self.graph_store.add_block_node(block_id, metadata={"doc_id": doc_id, "page_range": item["page_range"]})
                for head, rel, tail in triplets:
                    self.graph_store.add_entity_node(head)
                    self.graph_store.add_entity_node(tail)
                    self.graph_store.add_relationship(head, tail, rel)
                    self.graph_store.add_relationship(block_id, head, "contains")
                    self.graph_store.add_relationship(block_id, tail, "contains")
            
            print(f"[{current_thread}] Graph: Processed {block_id}")
            
        except Exception as e:
            print(f"[{current_thread}] Graph Error {block_id}: {e}")

    def search(self, query: str, top_k_blocks: int = 3, top_k_chunks: int = 5, score_threshold: float = 1.35):
        query_vector = self.embedding_model.encode([query]).astype('float32')
        
        # STAGE 1: Block Search
        if self.block_index.ntotal == 0:
            return [], ""
            
        k_blocks = min(top_k_blocks, self.block_index.ntotal)
        block_dists, block_indices = self.block_index.search(query_vector, k_blocks)
        
        relevant_block_ids = []
        for i, idx in enumerate(block_indices[0]):
            if idx != -1 and idx < len(self.block_metadata):
                relevant_block_ids.append(self.block_metadata[idx]["block_id"])
        
        # STAGE 2: Graph Enrichment
        graph_context = self.graph_store.get_contextual_subgraph(relevant_block_ids)
        if graph_context:
            print(f"Graph Enrichment:\n{graph_context}")
                
        # STAGE 3: Chunk Search within relevant BLOCKS
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
                        
                        # STRICT THRESHOLD CHECK
                        # L2 Distance 1.35 approx equates to Cosine Sim ~0.32
                        if distance > score_threshold:
                            continue
                            
                        item = meta[match_idx]
                        all_candidates.append({
                            "text": item["text"],
                            "page": item.get("page", 1),
                            "score": distance,
                            "document_name": item.get("source", "unknown")
                        })
        
        # Sort by score (L2 distance ascending) and take top K global
        all_candidates.sort(key=lambda x: x["score"])
        
        # Adaptive Filtering: Limit citations to those close to the best match
        # Helps avoid providing 5 citations when only 1 is relevant
        final_results = []
        if all_candidates:
            best_score = all_candidates[0]["score"]
            # Allow a small margin (e.g. 10-15% worse than best is okay)
            # Since L2 score: Lower is better. 
            # If best is 0.5, allow up to 0.55. If best is 1.0, allow 1.1.
            score_margin = 1.1 
            
            for c in all_candidates:
                if c["score"] <= best_score * score_margin:
                    final_results.append(c)
                else:
                    break # Since sorted, we can stop early
        
        return final_results[:top_k_chunks], graph_context

    def generate_answer(self, query: str) -> dict:
        # Retrieve with threshold
        context_items, graph_context = self.search(query)
        
        if not context_items:
            print(f"Refusal: No context items passed threshold for query '{query}'")
            return {
                "answer": "The requested information is not available in the uploaded documents. (Low relevance)",
                "citations": []
            }

        # Build Context
        context_str = "\n\n".join([f"Document: {c['document_name']} (Page {c['page']})\nContent: {c['text']}" for c in context_items])
        
        if graph_context:
            context_str += f"\n\n[Keep in mind the following Knowledge Graph connections]:\n{graph_context}"
        
        # ChatML Formatting for Phi-3
        system_instruction = """You are a precise and honest assistant. Your task is to answer the user's question using ONLY the provided context.
Instructions:
1. The User Question may contain typos. Match distinct words in the context (e.g. "Marigin" matches "Margin").
2. Answer the question using ONLY the provided context.
3. If the context does not contain the answer, output the exact phrase: "The requested information is not available in the uploaded documents."
4. CRITICAL: Do NOT use outside knowledge. Do NOT explain concepts (like "Softmax") not found in the context."""

        user_content = f"Context:\n{context_str}\n\nUser Question: {query}"
        
        prompt = f"<|user|>\n{system_instruction}\n\n{user_content}<|end|>\n<|assistant|>"

        answer = ""
        if self.llm:
            output = self.llm(
                prompt, 
                max_tokens=512, 
                stop=["User Question:", "\n\n"], 
                echo=False
            )
            answer = output['choices'][0]['text'].strip()
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
                score=c['score']
            ) for c in context_items
        ]

        return {
            "answer": answer,
            "citations": citations
        }

    def generate_answer_stream(self, query: str):
        # Retrieve
        context_items, graph_context = self.search(query, top_k_chunks=3)
        
        # 1. Handle No Context (Refusal)
        if not context_items:
            yield "data: " + str({"answer": "The requested information is not available in the uploaded documents.", "citations": []}).replace("'", '"') + "\n\n"
            return

        # 2. Prepare Prompt
        context_str = "\n\n".join([f"Document: {c['document_name']} (Page {c['page']})\nContent: {c['text']}" for c in context_items])
        
        if graph_context:
            context_str += f"\n\n[Keep in mind the following Knowledge Graph connections]:\n{graph_context}"
        
        # ChatML Formatting for Phi-3
        system_instruction = """You are a precise and honest assistant. Your task is to answer the user's question using ONLY the provided context.
Instructions:
1. The User Question may contain typos. Match distinct words in the context (e.g. "Marigin" matches "Margin").
2. Answer the question using ONLY the provided context.
3. If the context does not contain the answer, output the exact phrase: "The requested information is not available in the uploaded documents."
4. CRITICAL: Do NOT use outside knowledge. Do NOT explain concepts (like "Softmax") not found in the context."""

        user_content = f"Context:\n{context_str}\n\nUser Question: {query}"
        
        prompt = f"<|user|>\n{system_instruction}\n\n{user_content}<|end|>\n<|assistant|>"

        import json
        
        # 3. Stream Tokens with Buffering
        if self.llm:
            stream = self.llm(
                prompt,
                max_tokens=512,
                stop=["User Question:", "\n\n"],
                stream=True,
                echo=False
            )
            
            # Buffer only first 30 chars to detect refusal (smaller for smoother streaming)
            buffer = ""
            citations_sent = False
            
            citations_payload = [
                {
                    "document_name": c['document_name'],
                    "page_number": c['page'],
                    "text_snippet": c['text'][:150] + "...",
                    "score": float(c['score'])
                } for c in context_items
            ]
            
            for output in stream:
                token = output['choices'][0]['text']
                
                if not citations_sent:
                    buffer += token
                    # Smaller buffer (30 chars) for faster initial response
                    if len(buffer) > 30: 
                        # Check for refusal
                        refusal_phrases = ["information is not available", "context does not contain", "not available"]
                        is_refusal = any(phrase in buffer.lower() for phrase in refusal_phrases)
                        
                        if is_refusal:
                            yield f"event: citations\ndata: {json.dumps([])}\n\n"
                        else:
                            yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
                            
                        citations_sent = True
                        
                        # Stream buffer WORD BY WORD for smoother typewriter effect
                        words = buffer.split(' ')
                        for i, word in enumerate(words):
                            # Add space back except for first word
                            word_with_space = word if i == 0 else ' ' + word
                            yield f"data: {json.dumps({'token': word_with_space})}\n\n"
                        buffer = ""
                        
                else:
                    # Stream tokens immediately for real-time feel
                    yield f"data: {json.dumps({'token': token})}\n\n"
            
            # Flush remaining buffer if loop ends and we never sent citations (short answer)
            if not citations_sent:
                # Check for refusal in short answer
                refusal_phrases = ["information is not available", "context does not contain"]
                is_refusal = any(phrase in buffer.lower() for phrase in refusal_phrases)
                
                if is_refusal:
                     yield f"event: citations\ndata: {json.dumps([])}\n\n"
                else:
                     yield f"event: citations\ndata: {json.dumps(citations_payload)}\n\n"
                
                yield f"data: {json.dumps({'token': buffer})}\n\n"

        else:
            yield f"data: {json.dumps({'token': '⚠️ LLM not loaded.'})}\n\n"
