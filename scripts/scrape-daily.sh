#!/bin/bash
set -e
JW_VIDEO_DIR="/home/camst/jw-video"
echo "[$(date)] Starting scrape..."
cd "$JW_VIDEO_DIR"
# Activate venv if exists
if [ -f .venv/bin/activate ]; then source .venv/bin/activate; fi

# Scrape
python3 scraper/scraper.py 2>&1 | tail -3
python3 export_videos.py

# Push to GitHub
git add app/public/videos.json
if ! git diff --staged --quiet; then
    git config user.name "JW Video Scraper" 2>/dev/null
    git config user.email "scraper@jw-video.local" 2>/dev/null
    git commit -m "chore: daily video scrape $(date +%Y-%m-%d)"
    git push
    echo "[$(date)] Pushed to GitHub"
else
    echo "[$(date)] No changes"
fi
echo "[$(date)] Done"
