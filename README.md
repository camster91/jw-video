# JW Video — Netflix-Style Video App for JW.org

A Netflix-inspired streaming app for watching all videos from [JW.org](https://www.jw.org/en/library/videos/). Built with a Python scraper, FastAPI backend, and React + TypeScript frontend with a dark Netflix-style UI.

> **Note**: This project is for personal use and educational purposes. All video content is served directly from JW.org's CDN. Please respect JW.org's Terms of Use.

## Features

- 🎬 **Netflix-style UI** — Dark theme, hero banners, horizontal carousels, smooth animations
- 🔍 **Search** — Instant search across all video titles and descriptions
- 📂 **Category Browsing** — Browse by JW.org video categories (Movies, The Bible, Children, etc.)
- ❤️ **My List** — Save favorite videos locally for quick access
- 🔁 **Daily Auto-Scrape** — GitHub Actions fetches new videos every day at 6 AM UTC
- 📱 **PWA + Mobile** — Install as a Progressive Web App; Capacitor-ready for Android/iOS
- 🎥 **Video Player** — Full-featured player with progress bar, volume, fullscreen, keyboard shortcuts
- 🖼️ **MediaSession API** — Lock screen and notification controls on mobile
- 📶 **Offline Caching** — Workbox caches JW.org CDN assets for 7 days
- ⬇️ **Quality Selection** — Download videos in multiple resolutions (360p, 480p, 720p)

## Architecture

```
┌──────────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  Python Scraper  │────▶│   SQLite DB  │◀────│  FastAPI Backend     │
│  (Mediator API)  │     │  jw_video.db │     │  /api/videos         │
│  Runs daily      │     │              │     │  /api/categories     │
└──────────────────┘     └──────┬───────┘     │  /api/stream/{id}    │
                                │             └──────────┬───────────┘
                                │                        │
                         export_videos.py                │
                                │                        │
                                ▼                        │
                        ┌───────────────┐                │
                        │ videos.json   │                │
                        │ (embedded)    │                │
                        └───────┬───────┘                │
                                │                        │
                                ▼                        ▼
                        ┌────────────────────────────────────┐
                        │       React + TypeScript PWA       │
                        │  ┌──────────┐  ┌───────────────┐  │
                        │  │ Homepage  │  │  Video Player │  │
                        │  │ Browse    │  │  Search       │  │
                        │  │ My List   │  │  Categories   │  │
                        │  └──────────┘  └───────────────┘  │
                        └────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Scraper | Python 3.12, httpx (HTTP/2), SQLAlchemy |
| API | FastAPI, uvicorn, SQLite |
| Frontend | React 19, TypeScript, Vite 6, React Router 7 |
| PWA | vite-plugin-pwa, Workbox |
| Mobile | Capacitor 8 (Android/iOS) |
| Styling | Custom CSS — Netflix-inspired dark theme |
| Icons | Lucide React |
| CI/CD | GitHub Actions (daily cron) |
| Containers | Docker Compose |

## Quick Start

### 1. Scrape Videos

```bash
cd scraper
pip install -r requirements.txt
python scraper.py
```

### 2. Export to JSON (for frontend embedding)

```bash
cd scraper
python ../export_videos.py
```

### 3. Start the API

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Start the Frontend

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Docker Compose (all services)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/videos` | List all videos (paginated) |
| GET | `/api/videos/{key}` | Get video with quality options |
| GET | `/api/videos/search?q=` | Search videos by title |
| GET | `/api/categories/{key}/videos` | Videos in a category |
| GET | `/api/categories` | All categories as tree |
| GET | `/api/categories/{key}` | Category with subcategories |
| GET | `/api/stream/{key}` | Stream proxy (302 → CDN) |
| GET | `/api/health` | Health check |

## Scraping Details

The scraper uses the **JW.org Mediator API** (`data.jw-api.org/mediator/v1`):

1. Starts from `VideoOnDemand` root category
2. Recursively walks all subcategories
3. Extracts video metadata: title, description, duration, thumbnails, poster images
4. Fetches all available quality variants per video (360p, 480p, 720p)
5. Handles paginated media lists automatically
6. Stores everything in SQLite with upsert logic (safe for daily re-runs)
7. Excludes meeting-workbook categories (`VODSJJMeetings`)

## Related Projects

- [JW-Newsfeed](https://github.com/camster91/JW-Newsfeed) — RSS feeds from JW.org
- [JW-Music](https://github.com/camster91/jw-music) — Music streaming app (same architecture)
- [JW-Download](https://github.com/camster91/JW-Download) — Bulk video downloader

## License

This project is for personal, non-commercial use only. All video content is the property of Watch Tower Bible and Tract Society of Pennsylvania. Please review [JW.org's Terms of Use](https://www.jw.org/en/terms-of-use/) before using this software.