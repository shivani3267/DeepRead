import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("deepread.ai")

app = FastAPI(
    title="DeepRead AI Service",
    description="Dedicated microservice for Academic PDF RAG, Embeddings, Pinecone Vector Storage, and Grounded Generation.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def on_startup():
    logger.info("==================================================")
    logger.info("   DeepRead AI Service Initialized Successfully   ")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Embedding Provider: {settings.EMBEDDING_PROVIDER} ({settings.GEMINI_EMBEDDING_MODEL})")
    logger.info(f"   LLM Provider: {settings.LLM_PROVIDER} ({settings.GEMINI_MODEL})")
    logger.info("==================================================")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
