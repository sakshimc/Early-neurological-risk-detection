from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

from .api.typing import router as typing_router
from .api.video import router as video_router
from .api.voice import router as voice_router
from .api.cognitive import router as cognitive_router


# Load environment variables
load_dotenv()

# API prefix
api_prefix = os.getenv("API_PREFIX", "/api")


# Create FastAPI application
app = FastAPI(
    title="Parkinson Risk AI Backend",
    description="Backend API for typing-based behavioral screening research.",
    version="0.1.0",
)


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register typing router
app.include_router(
    typing_router,
    prefix=f"{api_prefix}/typing",
)
app.include_router(
    video_router,
    prefix=f"{api_prefix}/video",
)
app.include_router(
    voice_router,
    prefix=f"{api_prefix}/voice",
)
app.include_router(
    cognitive_router,
    prefix=f"{api_prefix}/cognitive",
)


# Root endpoint
@app.get("/")
def root():
    return {
        "status": "running",
        "message": "Parkinson Risk AI backend is online.",
    }