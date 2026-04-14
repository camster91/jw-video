"""FastAPI backend for JW Video app."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import videos, categories, stream

app = FastAPI(title="JW Video API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api", tags=["videos"])
app.include_router(categories.router, prefix="/api", tags=["categories"])
app.include_router(stream.router, prefix="/api", tags=["stream"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "JW Video API", "docs": "/docs"}