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

# Database
SUPABASE_URL = os.environ.get("SUPABASE_URL", None)
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", os.environ.get("SUPABASE_SECRET_KEY", None))
SUPABASE_SECRET_KEY = SUPABASE_KEY

# Redis context cache
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
CONTEXT_TTL_SECONDS = int(os.environ.get("CONTEXT_TTL_SECONDS", "1800"))
IDEMPOTENCY_TTL_SECONDS = int(os.environ.get("IDEMPOTENCY_TTL_SECONDS", "86400"))

# Server
API_HOST = os.environ.get("API_HOST", "0.0.0.0")
API_PORT = int(os.environ.get("API_PORT", "8000"))

