import os
from huggingface_hub import hf_hub_download
from sentence_transformers import SentenceTransformer

def setup_models():
    # 1. Setup Directories
    models_dir = os.path.join(os.getcwd(), "models")
    os.makedirs(models_dir, exist_ok=True)
    
    print(f"Checking models in {models_dir}...")

    # 2. Download Embedding Model (all-MiniLM-L6-v2)
    # We load it once to ensure it's cached in ~/.cache or we can save it locally.
    # To be truly offline-safe, we should save it to our models dir.
    print("Downloading Embedding Model...")
    embedding_model_name = 'sentence-transformers/all-MiniLM-L6-v2'
    model = SentenceTransformer(embedding_model_name)
    model.save(os.path.join(models_dir, "embedding_model"))
    print("Embedding Model saved to models/embedding_model")

    # 3. Download LLM (Phi-3-mini-4k-instruct-GGUF)
    # Repo: bartowski is reliable for GGUFs
    repo_id = "bartowski/Phi-3-mini-4k-instruct-GGUF"
    filename = "Phi-3-mini-4k-instruct-Q4_K_M.gguf"
    
    print(f"Downloading LLM: {filename} from {repo_id}...")
    # This will download to the cache, we want to move/symlink or just download directly.
    # We will download directly to ./models
    model_path = hf_hub_download(
        repo_id=repo_id, 
        filename=filename, 
        local_dir=models_dir, 
        local_dir_use_symlinks=False
    )
    print(f"LLM downloaded to: {model_path}")

if __name__ == "__main__":
    setup_models()
