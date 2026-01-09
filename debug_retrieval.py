
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from backend.rag_engine import RAGEngine

def test_retrieval(query):
    print(f"\n--- Testing Query: '{query}' ---")
    rag = RAGEngine()
    
    # 1. Test Search Retrieval directly
    print("Searching...")
    
    # Debug: Print available docs
    docs = set()
    for b in rag.block_metadata:
        docs.add(b.get("name") or b.get("document_name", "unknown"))
    print(f"Available Documents in Index: {docs}")
    
    # Test Generation
    print("Generating Answer...")
    response = rag.generate_answer(query)
    print("\n--- Final Answer ---")
    print(response["answer"])
    if response["citations"]:
        print("\nCitations:")
        for c in response["citations"]:
            print(f"- {c.document_name} (Page {c.page_number})")
        
if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "explain the proposed solution"
    
    test_retrieval(query)
