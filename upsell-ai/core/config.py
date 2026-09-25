import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Directory Aliases
DATASET_DIR = Path("data")
PROMPT_DIR = Path("agents") / "prompts"

LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "embeddinggemma")
LLM_API_KEY = os.environ.get("LLM_API_KEY", "ollama")


# RAG
CHROMA_DIR = Path(__file__).parent.parent / ".chroma"
CHROMA_COLLECTION_NAME = "rag-demo"

LLM_EMBED_MODEL = os.environ.get("LLM_EMBED_MODEL", "embeddinggemma")
LLM_EMBED_API_KEY = os.environ.get("LLM_EMBED_API_KEY", "ollama")

# Supported docs
SUPPORTED_EXTENSIONS = (
    "*.md",
    "*.csv",
)
