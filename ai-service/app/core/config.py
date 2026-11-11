import os
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    # Internal auth key shared between Express and FastAPI
    INTERNAL_SERVICE_KEY: str = Field(
        default="deepread_internal_secure_api_key_89234719",
        description="Pre-shared authentication key for Express-to-FastAPI requests"
    )
    
    # Vector Database (Pinecone)
    PINECONE_API_KEY: str = Field(default="", description="Pinecone API Key")
    PINECONE_INDEX_NAME: str = "deepread-academic"
    PINECONE_CLOUD: str = "aws"
    PINECONE_REGION: str = "us-east-1"
    
    # LLM Provider Configuration ('gemini', 'ollama', 'openai', 'mock')
    LLM_PROVIDER: str = "gemini"
    
    # Google Gemini Configuration (Primary LLM & Online Embeddings)
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_MODEL_NAME: str = "text-embedding-004"
    
    # Embedding Configuration ('gemini', 'huggingface', 'local')
    EMBEDDING_PROVIDER: str = "gemini"
    EMBEDDING_DIMENSION: int = 768
    
    # Online HuggingFace Inference API (Optional alternative online embeddings)
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    
    # Legacy / Alternative Local Provider Options
    OLLAMA_BASE_URL: str = "http://127.0.0.1:11434"
    OLLAMA_MODEL: str = "qwen3:4b"
    
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Text Ingestion & Chunking
    CHUNK_TARGET_TOKENS: int = 500
    CHUNK_OVERLAP_TOKENS: int = 75
    
    # Answerability Threshold
    ANSWERABILITY_SIMILARITY_THRESHOLD: float = 0.58

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
