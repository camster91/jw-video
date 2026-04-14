"""Video endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import get_db
from scraper.models import Video, Category, VideoFile

router = APIRouter()


@router.get("/videos")
def list_videos(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List all videos with pagination."""
    offset = (page - 1) * per_page
    total = db.query(func.count(Video.id)).scalar()
    videos = (
        db.query(Video)
        .order_by(Video.first_published.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "videos": [
            {
                "key": v.key,
                "title": v.title,
                "description": v.description,
                "categoryKey": v.category_key,
                "duration": v.duration,
                "durationFormatted": v.duration_formatted,
                "firstPublished": v.first_published,
                "thumbnailUrl": v.thumbnail_url,
                "posterUrl": v.poster_url,
                "streamUrl": v.stream_url,
                "streamResolution": v.stream_resolution,
                "subtitleUrl": v.subtitle_url,
            }
            for v in videos
        ],
    }


@router.get("/videos/{video_key}")
def get_video(video_key: str, db: Session = Depends(get_db)):
    """Get a single video with all available quality options."""
    video = db.query(Video).filter(Video.key == video_key).first()
    if not video:
        return {"error": "Video not found"}, 404

    files = db.query(VideoFile).filter(VideoFile.video_key == video_key).order_by(VideoFile.frame_height.desc()).all()

    return {
        "key": video.key,
        "title": video.title,
        "description": video.description,
        "categoryKey": video.category_key,
        "duration": video.duration,
        "durationFormatted": video.duration_formatted,
        "firstPublished": video.first_published,
        "thumbnailUrl": video.thumbnail_url,
        "posterUrl": video.poster_url,
        "streamUrl": video.stream_url,
        "streamResolution": video.stream_resolution,
        "subtitleUrl": video.subtitle_url,
        "files": [
            {
                "label": f.label,
                "frameHeight": f.frame_height,
                "subtitled": f.subtitled,
                "progressiveDownloadUrl": f.progressive_download_url,
                "fileSize": f.file_size,
                "bitrate": f.bitrate,
                "width": f.width,
                "height": f.height,
            }
            for f in files
        ],
    }


@router.get("/videos/search")
def search_videos(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search videos by title."""
    offset = (page - 1) * per_page
    query = db.query(Video).filter(Video.title.ilike(f"%{q}%"))
    total = query.count()
    videos = query.order_by(Video.first_published.desc()).offset(offset).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "query": q,
        "videos": [
            {
                "key": v.key,
                "title": v.title,
                "description": v.description,
                "categoryKey": v.category_key,
                "duration": v.duration,
                "durationFormatted": v.duration_formatted,
                "firstPublished": v.first_published,
                "thumbnailUrl": v.thumbnail_url,
                "posterUrl": v.poster_url,
                "streamUrl": v.stream_url,
            }
            for v in videos
        ],
    }


@router.get("/categories/{category_key}/videos")
def get_category_videos(
    category_key: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Get videos for a specific category."""
    offset = (page - 1) * per_page
    query = db.query(Video).filter(Video.category_key == category_key)
    total = query.count()
    videos = query.order_by(Video.first_published.desc()).offset(offset).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "categoryKey": category_key,
        "videos": [
            {
                "key": v.key,
                "title": v.title,
                "description": v.description,
                "categoryKey": v.category_key,
                "duration": v.duration,
                "durationFormatted": v.duration_formatted,
                "firstPublished": v.first_published,
                "thumbnailUrl": v.thumbnail_url,
                "posterUrl": v.poster_url,
                "streamUrl": v.stream_url,
            }
            for v in videos
        ],
    }