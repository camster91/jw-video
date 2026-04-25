# VideoFeed Component - YouTube-style Home Feed

## Overview
The `VideoFeed.tsx` component provides a modern, YouTube-style video browsing experience with horizontal scrolling sections, infinite scroll, and intelligent recommendations.

## Features Implemented

### 1. Horizontal Scrolling Video Cards
- Smooth horizontal carousels for each section
- Navigation arrows (left/right) that appear based on scroll position
- Responsive card sizing (240px desktop → 150px mobile)
- Hover effects with scale transform and shadow
- Touch-friendly with proper tap feedback

### 2. Categories/Sections
Five distinct sections with different content strategies:

1. **For You** - Personalized recommendations based on watch history
2. **New & Trending** - Recently published videos
3. **Popular Now** - All videos sorted by popularity
4. **Continue Watching** - User's watch history with progress tracking
5. **Series & Episodes** - Videos with series-like patterns (Part, Episode, Season, etc.)

### 3. Infinite Scroll with Pagination
- Intersection Observer API for automatic loading
- Sentinel elements at end of each section
- 200px root margin for preloading
- Loading indicators while fetching more content
- Automatic page increment (20 videos per page)

### 4. Video Thumbnails with Duration Badges
- Duration displayed in bottom-right corner
- Format: `MM:SS` or `H:MM:SS` for longer videos
- Semi-transparent black background for readability
- Lazy loading images for performance
- Fallback placeholder for missing thumbnails

### 5. Hover Previews on Mobile (Long Press)
- **Desktop**: 800ms hover triggers preview overlay
- **Mobile**: 500ms long press triggers preview
- Full-screen overlay with:
  - Large thumbnail image
  - Video title and description
  - Play button for immediate playback
- Tap/click anywhere to dismiss

### 6. Watch History Tracking
Enhanced watch history system in `api.ts`:

- **Simple history**: Array of video keys (most recent first)
- **Progress tracking**: Stores watch percentage and last position
- **Auto-update**: Progress saved every 5 seconds during playback
- **Completion tracking**: Marks 100% when video ends
- **Limit**: Stores up to 100 videos

```typescript
interface WatchHistoryEntry {
  key: string;
  watchedAt: number;
  progress?: number; // percentage watched
  lastPosition?: number; // seconds
}
```

## Recommendation Algorithm

The enhanced recommendation algorithm (`getRecommendedVideos`) uses multiple factors:

### Scoring Factors:

1. **Recent Watch Exclusion** (-1000 points)
   - Videos watched in last 5 positions are deprioritized
   - Prevents immediate re-recommendation

2. **Category Affinity** (+8 points per category match)
   - Tracks which categories user watches most
   - Boosts videos from preferred categories
   - Builds map from watch history

3. **Recency Boost**
   - +20 points: Published < 3 days ago
   - +15 points: Published < 7 days ago
   - +10 points: Published < 14 days ago
   - +5 points: Published < 30 days ago

4. **Duration Preference** (+12/6/3 points)
   - Calculates average duration from watch history
   - Boosts videos similar to user's preference
   - Tiers: within 2min/5min/10min of average

5. **Diversity Bonus** (+5 points)
   - Boosts unwatched content
   - Encourages content discovery

### Series Detection (`getSeriesVideos`)

Identifies series content using regex pattern:
```typescript
/(?:Part|Episode|Season|Vol\.|Chapter)\s*\d+/i
```

Sorts by:
- Whether already in watch history
- Category matches with watched videos

## Progress Tracking Integration

### Video Player Hook (`useVideoPlayer.ts`)
- Tracks progress every 5 seconds
- Updates both percentage and timestamp
- Marks 100% on video completion
- Uses `updateWatchProgress` from API

### Continue Watching Section
- Displays progress bar on thumbnails
- Shows percentage text ("75% watched")
- Sorted by most recently watched
- No infinite scroll (limited to 10 videos)

## CSS Enhancements

### Progress Indicators
```css
.feed-video-progress {
  position: absolute;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
}

.feed-video-progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}
```

### Mobile Optimizations
- Disabled hover effects on touch devices
- Added `-webkit-tap-highlight-color: transparent`
- Active state transform (scale 0.98) for touch feedback
- Responsive card widths

## File Structure

```
app/src/
├── components/
│   ├── VideoFeed.tsx        # Main feed component
│   └── VideoCard.tsx        # Individual card component
├── services/
│   └── api.ts               # History tracking functions
├── hooks/
│   └── useVideoPlayer.ts    # Progress tracking
└── styles/
    └── index.css            # Feed styles
```

## API Functions

### Watch History
```typescript
// Get simple history (array of keys)
getWatchHistory(): string[]

// Get detailed history with progress
getWatchHistoryWithProgress(): WatchHistoryEntry[]

// Add to history (auto-called on video load)
addToHistory(key: string, progress?: number, lastPosition?: number): void

// Update progress (called every 5s during playback)
updateWatchProgress(key: string, progress: number, lastPosition: number): void

// Remove from history
removeFromHistory(key: string): void
```

### Recommendations
```typescript
// Get personalized recommendations
getRecommendedVideos(allVideos: Video[], limit?: number): Video[]

// Get series videos
getSeriesVideos(allVideos: Video[], limit?: number): Video[]
```

## Usage Example

```tsx
import { VideoFeed } from './components/VideoFeed';

function HomePage() {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  return (
    <div className="page home-page">
      <VideoFeed onVideoSelect={setPlayingVideo} />
    </div>
  );
}
```

## Performance Optimizations

1. **Lazy Loading**: Images use `loading="lazy"`
2. **Intersection Observer**: Efficient scroll detection
3. **Debounced Progress Updates**: Every 5 seconds, not every frame
4. **Memoized Sections**: State updates only when needed
5. **Skeleton Loading**: Shows placeholders during load

## Future Enhancements

- [ ] A/B testing for recommendation weights
- [ ] User preference settings (duration, categories)
- [ ] Download progress for offline videos
- [ ] Social features (trending by region)
- [ ] Machine learning integration for better recommendations
