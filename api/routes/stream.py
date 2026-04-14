"""Stream proxy — redirects to JW.org CDN URLs to avoid CORS issues."""

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import get_db
from scraper.models import Video

router = APIRouter()


@router.get("/stream/{video_key}")
def stream_video(video_key: str, db: Session = Depends(get_db)):
    """Redirect to the best available video stream URL."""
    video = db.query(Video).filter(Video.key == video_key).first()
    if not video:
        return {"error": "Video not found"}, 404

    if not video.stream_url:
        return {"error": "No stream URL available"}, 404

    return RedirectResponse(url=video.stream_url, status_code=302)