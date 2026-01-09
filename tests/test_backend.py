"""
Unit tests for Offline RAG Backend.
Note: API tests require compatible httpx version. Core RAG logic tests run independently.
"""
import os
import shutil
import pytest
import numpy as np

from backend.rag_engine import RAGEngine

TEST_MODELS_DIR = "test_models_pytest"

# Cleanup function
def cleanup():
    if os.path.exists(TEST_MODELS_DIR):
        shutil.rmtree(TEST_MODELS_DIR)
    # Also clean up any indexes subdirectory
    indexes_dir = os.path.join(TEST_MODELS_DIR, "indexes")
    if os.path.exists(indexes_dir):
        shutil.rmtree(indexes_dir)

@pytest.fixture(scope="function")
def mock_engine():
    """Create a fresh RAGEngine with mocked embedding model for each test"""
    cleanup()
    
    class MockEmbedding:
        def encode(self, texts):
            return np.random.rand(len(texts), 384).astype("float32")
    
    engine = RAGEngine(models_dir=TEST_MODELS_DIR)
    engine.embedding_model = MockEmbedding()
    
    yield engine
    
    cleanup()


def test_rag_engine_initialization(mock_engine):
    """Test RAGEngine initializes correctly"""
    assert mock_engine.block_index is not None
    assert mock_engine.dimension == 384
    assert mock_engine.block_metadata == []
    print("✅ RAG Engine Initialization Test Passed")


def test_rag_hierarchical_indexing(mock_engine):
    """Test that documents are indexed into block and chunk levels"""
    # Add dummy document with 10 chunks
    chunks = [{"text": f"chunk {i}", "page": 1} for i in range(10)]
    mock_engine.add_document("doc1", "test_doc.pdf", chunks)
    
    # Verify block was created
    assert mock_engine.block_index.ntotal == 1
    
    # Verify chunk index was created with correct block_id format
    block_id = "doc1_block_0"
    assert block_id in mock_engine.chunk_indexes
    assert mock_engine.chunk_indexes[block_id].ntotal == 10
    
    print("✅ RAG Hierarchical Indexing Test Passed")


def test_rag_multi_page_blocks(mock_engine):
    """Test that pages are correctly grouped into 20-page blocks"""
    # Create chunks spanning multiple pages (simulating a 50-page document)
    chunks = []
    for page in range(1, 51):  # Pages 1-50
        chunks.append({"text": f"Content from page {page}", "page": page})
    
    mock_engine.add_document("doc2", "multi_page.pdf", chunks)
    
    # Should create 3 blocks: pages 1-20, 21-40, 41-60
    block_ids = [m["block_id"] for m in mock_engine.block_metadata if m["doc_id"] == "doc2"]
    assert len(block_ids) == 3
    
    # Verify block IDs
    assert "doc2_block_0" in block_ids  # Pages 1-20
    assert "doc2_block_1" in block_ids  # Pages 21-40
    assert "doc2_block_2" in block_ids  # Pages 41-50
    
    print("✅ Multi-page Block Test Passed")


def test_rag_search_returns_results(mock_engine):
    """Test that search returns properly formatted results"""
    chunks = [{"text": f"This is chunk number {i} about machine learning", "page": 1} for i in range(5)]
    mock_engine.add_document("doc3", "ml_doc.pdf", chunks)
    
    results, graph_context = mock_engine.search("machine learning")
    
    assert isinstance(results, list)
    assert isinstance(graph_context, str)
    
    # Results should have required fields if not empty
    if results:
        assert "text" in results[0]
        assert "page" in results[0]
        assert "score" in results[0]
        assert "document_name" in results[0]
    
    print("✅ RAG Search Test Passed")


def test_rag_clear_resets_indexes(mock_engine):
    """Test that clear() properly resets all indexes"""
    # Add a document
    chunks = [{"text": "test content", "page": 1}]
    mock_engine.add_document("doc4", "test.pdf", chunks)
    
    assert mock_engine.block_index.ntotal > 0
    
    # Clear
    mock_engine.clear()
    
    # Verify everything is reset
    assert mock_engine.block_index.ntotal == 0
    assert mock_engine.block_metadata == []
    assert mock_engine.chunk_indexes == {}
    assert mock_engine.chunk_metadata == {}
    
    print("✅ RAG Clear Test Passed")
