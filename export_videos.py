"""
Export videos from SQLite to JSON for the frontend to embed at build time.
"""

import json
import os
import sqlite3
import sys

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scraper", "jw_video.db")
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "public", "videos.json")


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Export categories
    categories = []
    cat_rows = conn.execute(
        "SELECT key, name, slug, parent_key, type, description, image_url, square_image_url, sort_order "
        "FROM categories ORDER BY sort_order, name"
    ).fetchall()
    for row in cat_rows:
        categories.append({
            "key": row["key"],
            "name": row["name"],
            "slug": row["slug"],
            "parentKey": row["parent_key"],
            "type": row["type"],
            "description": row["description"],
            "imageUrl": row["image_url"],
            "squareImageUrl": row["square_image_url"],
        })

    # Export videos
    videos = []
    vid_rows = conn.execute(
        "SELECT key, title, description, category_key, duration, duration_formatted, "
        "first_published, media_type, thumbnail_url, poster_url, stream_url, "
        "stream_resolution, stream_width, stream_height, subtitle_url "
        "FROM videos ORDER BY first_published DESC"
    ).fetchall()
    for row in vid_rows:
        video = {
            "key": row["key"],
            "title": row["title"],
            "description": row["description"],
            "categoryKey": row["category_key"],
            "duration": row["duration"],
            "durationFormatted": row["duration_formatted"],
            "firstPublished": row["first_published"],
            "mediaType": row["media_type"],
            "thumbnailUrl": row["thumbnail_url"],
            "posterUrl": row["poster_url"],
            "streamUrl": row["stream_url"],
            "streamResolution": row["stream_resolution"],
            "subtitleUrl": row["subtitle_url"],
        }
        videos.append(video)

    # Export video files (for quality selection)
    video_files = []
    vf_rows = conn.execute(
        "SELECT video_key, label, frame_height, subtitled, progressive_download_url, "
        "file_size, checksum, bitrate, frame_rate, width, height "
        "FROM video_files ORDER BY video_key, frame_height DESC"
    ).fetchall()
    for row in vf_rows:
        video_files.append({
            "videoKey": row["video_key"],
            "label": row["label"],
            "frameHeight": row["frame_height"],
            "subtitled": bool(row["subtitled"]),
            "progressiveDownloadUrl": row["progressive_download_url"],
            "fileSize": row["file_size"],
            "checksum": row["checksum"],
            "bitrate": row["bitrate"],
            "frameRate": row["frame_rate"],
            "width": row["width"],
            "height": row["height"],
        })

    # Group video files by video key
    files_by_video = {}
    for vf in video_files:
        key = vf["videoKey"]
        if key not in files_by_video:
            files_by_video[key] = []
        files_by_video[key].append(vf)

    # Attach files to videos
    for video in videos:
        video["files"] = files_by_video.get(video["key"], [])

    output = {
        "categories": categories,
        "videos": videos,
        "exportedAt": __import__("datetime").datetime.now().isoformat(),
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"Exported {len(categories)} categories, {len(videos)} videos to {OUTPUT_PATH}")
    conn.close()


if __name__ == "__main__":
    main()