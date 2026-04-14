"""
JW.org Video Scraper — Recursively fetches all video categories and media items
using the JW.org Mediator API.

Scheduled to run daily via GitHub Actions or cron.
"""

import json
import logging
import re
import sqlite3
from datetime import datetime

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models import Base, Category, Video, VideoFile

# ─── Configuration ──────────────────────────────────────────────────────────

MEDIATOR_BASE = "https://data.jw-api.org/mediator/v1"
PUB_MEDIA_BASE = "https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS"

LANG = "E"  # English
CLIENT_TYPE = "www"
DETAILED = "1"

# Starting category keys to crawl
ROOT_CATEGORIES = ["VideoOnDemand"]

# Categories to skip (meeting workbooks etc.)
EXCLUDE_CATEGORIES = {"VODSJJMeetings", "VODSJJMeetings-PT", "VODSJJMeetings-AT"}

DB_PATH = "jw_video.db"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# ─── API Helpers ─────────────────────────────────────────────────────────────

def get_categories(client: httpx.Client, lang: str, key: str, offset: int = 0, limit: int = 40) -> dict:
    """Fetch a category and its media items from the mediator API."""
    url = f"{MEDIATOR_BASE}/categories/{lang}/{key}"
    params = {
        "clientType": CLIENT_TYPE,
        "detailed": DETAILED,
        "offset": str(offset),
        "limit": str(limit),
        "mediaLimit": str(limit),
    }
    resp = client.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def get_media_items(client: httpx.Client, lang: str, key: str, offset: int = 0, limit: int = 40) -> dict:
    """Fetch media items for a category with pagination."""
    url = f"{MEDIATOR_BASE}/categories/{lang}/{key}"
    params = {
        "clientType": CLIENT_TYPE,
        "detailed": DETAILED,
        "offset": str(offset),
        "limit": str(limit),
        "mediaLimit": str(limit),
    }
    resp = client.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text[:80]


def format_duration(seconds: float) -> str:
    """Format duration in seconds to HH:MM:SS or MM:SS."""
    if seconds <= 0:
        return "0:00"
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"


def get_best_image(images: dict | list | None, preferred_ratio: str = "wss", preferred_size: str = "lg") -> str | None:
    """Extract the best image URL from media images.
    
    Images can be:
    - A dict of dicts: {"lss": {"lg": "url"}, "wss": {"lg": "url"}, ...}
    - A list: [{"ratio": "16:9", "size": "lg", "url": "..."}]
    """
    if not images:
        return None
    
    if isinstance(images, dict):
        # Dict of dicts format: {"lss": {"lg": "url"}, ...}
        # Try preferred ratio first, then fallbacks
        # Ratio keys: wss (wide), lss (landscape), lsr, pnr, sqr (square)
        ratio_order = [preferred_ratio, "wss", "lss", "lsr", "pnr", "sqr"]
        size_order = [preferred_size, "lg", "xl", "md", "sm"]
        for ratio in ratio_order:
            group = images.get(ratio, {})
            if isinstance(group, dict):
                for size in size_order:
                    url = group.get(size)
                    if url and isinstance(url, str):
                        return url
        # Last resort: first URL found
        for group in images.values():
            if isinstance(group, dict):
                for url in group.values():
                    if url and isinstance(url, str):
                        return url
        return None
    
    if isinstance(images, list):
        # Legacy list format
        for img in images:
            if img.get("ratio") == preferred_ratio and img.get("size") == preferred_size:
                return img.get("url") or img.get("src")
        for img in images:
            if img.get("ratio") == preferred_ratio:
                return img.get("url") or img.get("src")
        return (images[0].get("url") or images[0].get("src")) if images else None
    
    return None


def get_square_image(images: dict | list | None) -> str | None:
    """Extract a square thumbnail image."""
    if not images:
        return None
    
    if isinstance(images, dict):
        # Try sqr (square) ratio first, then others
        for ratio in ["sqr", "pnr", "lss", "wss"]:
            group = images.get(ratio, {})
            if isinstance(group, dict):
                for size in ["lg", "xl", "md"]:
                    url = group.get(size)
                    if url and isinstance(url, str):
                        return url
        return None
    
    if isinstance(images, list):
        for img in images:
            if img.get("ratio") == "1:1" and img.get("size") in ("md", "lg"):
                return img.get("url") or img.get("src")
        return None
    
    return None


# ─── Category Crawler ────────────────────────────────────────────────────────

seen_categories: set[str] = set()
seen_media: set[str] = set()


def parse_media_item(media_data: dict) -> dict | None:
    """Parse a media item from API response into our Video model fields."""
    media_type = media_data.get("type", "")
    if media_type != "video":
        return None  # Skip audio items

    key = media_data.get("languageAgnosticNaturalKey") or media_data.get("naturalKey", "")
    if not key:
        return None

    title = media_data.get("title", "Untitled")
    description = media_data.get("description", "")
    first_published = media_data.get("firstPublished", "")
    primary_category = media_data.get("primaryCategory", "")
    images = media_data.get("images", [])

    files_data = media_data.get("files", [])
    if not files_data:
        return None

    # Parse available video files/resolutions
    video_files = []
    best_stream_url = None
    best_resolution = None
    best_height = 0
    best_width = 0
    subtitle_url = None
    duration = 0

    for file_group in files_data:
        # Each file group can have multiple versions (e.g. subtitled/non-subtitled)
        if not isinstance(file_group, dict):
            continue

        # Check for progressive download URL
        prog_url = file_group.get("progressiveDownloadURL") or file_group.get("url", "")
        label = file_group.get("label", "")
        frame_height = file_group.get("frameHeight", 0)
        subtitled = file_group.get("subtitled", False)
        file_size = file_group.get("filesize", 0)
        checksum = file_group.get("checksum", "")
        bitrate = file_group.get("bitrate", 0)
        frame_rate = file_group.get("frameRate", 0)
        width = file_group.get("frameWidth", 0)
        height = file_group.get("frameHeight", 0)

        # Duration
        if file_group.get("duration") and duration == 0:
            duration = float(file_group["duration"])

        # Subtitles
        subtitles = file_group.get("subtitles")
        if subtitles and isinstance(subtitles, list) and not subtitle_url:
            for sub in subtitles:
                if isinstance(sub, dict) and sub.get("url"):
                    subtitle_url = sub["url"]
                    break
                elif isinstance(sub, str):
                    subtitle_url = sub
                    break

        if prog_url:
            video_files.append({
                "label": label,
                "frame_height": frame_height,
                "subtitled": subtitled,
                "progressive_download_url": prog_url,
                "file_size": file_size,
                "checksum": checksum,
                "bitrate": bitrate,
                "frame_rate": frame_rate,
                "width": width,
                "height": height,
            })

            # Pick best resolution for streaming (prefer 720p as good balance)
            if frame_height and frame_height > best_height and frame_height <= 720:
                best_stream_url = prog_url
                best_resolution = label
                best_height = frame_height
                best_width = width or 0
            elif frame_height == 720 and best_height != 720:
                best_stream_url = prog_url
                best_resolution = label
                best_height = 720
                best_width = width or 0

    # If no 720p found, pick the best available
    if not best_stream_url and video_files:
        # Sort by resolution descending and pick highest under 1080p
        sorted_files = sorted(video_files, key=lambda f: f.get("frame_height") or 0, reverse=True)
        # Prefer 720p or lower for streaming, then fallback
        for f in sorted_files:
            h = f.get("frame_height") or 0
            if h <= 720:
                best_stream_url = f["progressive_download_url"]
                best_resolution = f["label"]
                best_height = h
                best_width = f.get("width") or 0
                break
        if not best_stream_url:
            best_stream_url = sorted_files[0]["progressive_download_url"]
            best_resolution = sorted_files[0]["label"]
            best_height = sorted_files[0].get("frame_height") or 0
            best_width = sorted_files[0].get("width") or 0

    return {
        "key": key,
        "title": title,
        "description": description,
        "category_key": primary_category,
        "duration": duration,
        "duration_formatted": format_duration(duration),
        "first_published": first_published,
        "media_type": "video",
        "thumbnail_url": get_square_image(images),
        "poster_url": get_best_image(images, "wss", "lg"),
        "stream_url": best_stream_url,
        "stream_resolution": best_resolution,
        "stream_width": best_width,
        "stream_height": best_height,
        "subtitle_url": subtitle_url,
        "files": video_files,
    }


def crawl_category(client: httpx.Client, session: Session, key: str, parent_key: str | None = None, depth: int = 0):
    """Recursively crawl a category and all its subcategories and media."""
    if key in seen_categories or key in EXCLUDE_CATEGORIES:
        logger.info(f"{'  ' * depth}Skipping (already seen/excluded): {key}")
        return

    seen_categories.add(key)
    logger.info(f"{'  ' * depth}Crawling category: {key}")

    try:
        data = get_categories(client, LANG, key)
    except httpx.HTTPError as e:
        logger.error(f"{'  ' * depth}Error fetching category {key}: {e}")
        return

    cat_data = data.get("category", {})
    cat_name = cat_data.get("name", key)
    cat_type = cat_data.get("type", "ondemand")
    cat_description = cat_data.get("description", "")
    cat_images = cat_data.get("images", {})

    # Upsert category
    existing = session.query(Category).filter_by(key=key).first()
    if existing:
        category = existing
        category.name = cat_name
        category.slug = slugify(cat_name)
        category.parent_key = parent_key
        category.type = cat_type
        category.description = cat_description
        category.image_url = get_best_image(cat_images, "wss", "lg")
        category.square_image_url = get_square_image(cat_images)
    else:
        category = Category(
            key=key,
            name=cat_name,
            slug=slugify(cat_name),
            parent_key=parent_key,
            type=cat_type,
            description=cat_description,
            image_url=get_best_image(cat_images, "wss", "lg"),
            square_image_url=get_square_image(cat_images),
        )
        session.add(category)
        session.flush()

    # Process media items
    media_list = cat_data.get("media", [])
    total_media = cat_data.get("paginationTotalCount", len(media_list))
    media_limit = cat_data.get("paginationLimit", 40)
    pagination_offset = cat_data.get("paginationOffset", 0)

    # Handle pagination for media items
    all_media_data = list(media_list)
    current_offset = pagination_offset + len(media_list)
    while current_offset < total_media:
        try:
            more_data = get_media_items(client, LANG, key, offset=current_offset, limit=40)
            more_media = more_data.get("category", {}).get("media", [])
            if not more_media:
                break
            all_media_data.extend(more_media)
            current_offset += len(more_media)
        except httpx.HTTPError as e:
            logger.error(f"{'  ' * depth}Error paginating media in {key}: {e}")
            break

    video_count = 0
    for media_item in all_media_data:
        parsed = parse_media_item(media_item)
        if not parsed:
            continue

        media_key = parsed["key"]
        if media_key in seen_media:
            continue
        seen_media.add(media_key)

        # Upsert video
        existing_video = session.query(Video).filter_by(key=media_key).first()
        if existing_video:
            video = existing_video
            video.title = parsed["title"]
            video.description = parsed["description"]
            video.category_key = parsed["category_key"] or key
            video.duration = parsed["duration"]
            video.duration_formatted = parsed["duration_formatted"]
            video.first_published = parsed["first_published"]
            video.media_type = parsed["media_type"]
            video.thumbnail_url = parsed["thumbnail_url"]
            video.poster_url = parsed["poster_url"]
            video.stream_url = parsed["stream_url"]
            video.stream_resolution = parsed["stream_resolution"]
            video.stream_width = parsed["stream_width"]
            video.stream_height = parsed["stream_height"]
            video.subtitle_url = parsed["subtitle_url"]
            # Delete old files and re-add
            session.query(VideoFile).filter_by(video_key=media_key).delete()
        else:
            video = Video(
                key=media_key,
                title=parsed["title"],
                description=parsed["description"],
                category_key=parsed["category_key"] or key,
                duration=parsed["duration"],
                duration_formatted=parsed["duration_formatted"],
                first_published=parsed["first_published"],
                media_type=parsed["media_type"],
                thumbnail_url=parsed["thumbnail_url"],
                poster_url=parsed["poster_url"],
                stream_url=parsed["stream_url"],
                stream_resolution=parsed["stream_resolution"],
                stream_width=parsed["stream_width"],
                stream_height=parsed["stream_height"],
                subtitle_url=parsed["subtitle_url"],
            )
            session.add(video)
            session.flush()

        # Add video files
        for file_data in parsed["files"]:
            vf = VideoFile(
                video_key=media_key,
                label=file_data.get("label"),
                frame_height=file_data.get("frame_height"),
                subtitled=file_data.get("subtitled", False),
                progressive_download_url=file_data.get("progressive_download_url"),
                file_size=file_data.get("file_size"),
                checksum=file_data.get("checksum"),
                bitrate=file_data.get("bitrate"),
                frame_rate=file_data.get("frame_rate"),
                width=file_data.get("width"),
                height=file_data.get("height"),
            )
            session.add(vf)

        video_count += 1

    logger.info(f"{'  ' * depth}  → {video_count} videos in '{cat_name}'")

    # Recursively crawl subcategories
    subcategories = cat_data.get("subcategories", [])
    for subcat in subcategories:
        subcat_key = subcat.get("key", "")
        if subcat_key and subcat_key not in EXCLUDE_CATEGORIES:
            crawl_category(client, session, subcat_key, parent_key=key, depth=depth + 1)

    session.commit()


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    logger.info("Starting JW.org video scrape...")
    start = datetime.now()

    engine = create_engine(f"sqlite:///{DB_PATH}")
    Base.metadata.create_all(engine)

    with Session(engine) as session, httpx.Client(http2=True, follow_redirects=True) as client:
        for root_key in ROOT_CATEGORIES:
            crawl_category(client, session, root_key)

    elapsed = (datetime.now() - start).total_seconds()
    total_videos = len(seen_media)
    total_categories = len(seen_categories)
    logger.info(f"Done! Scraped {total_categories} categories, {total_videos} videos in {elapsed:.1f}s")


if __name__ == "__main__":
    main()