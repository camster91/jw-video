# Parental Controls Component

A comprehensive parental control system for JW Video that allows parents to manage and restrict content access for children.

## Features

### 1. **Content Rating Filters**
- Filter videos by rating (G, PG, PG-13, TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA, R, NC-17)
- Select which ratings are allowed for viewing
- Kids Mode automatically restricts to kid-friendly ratings (G, TV-Y, TV-Y7, TV-G)

### 2. **Kids Mode**
- One-click activation for kid-friendly content only
- Automatically sets appropriate rating filters
- Enables content approval requirements
- Visual indicator when active

### 3. **Watch Time Limits**
- Set daily watch time limits (in minutes)
- Track time used per day
- Automatic daily reset at midnight
- Visual warnings when approaching/exceeding limits

### 4. **PIN Protection**
- 4+ digit PIN for settings access
- Secure hash storage (not plain text)
- Optional PIN requirement to access settings
- Change/remove PIN functionality

### 5. **Viewing History for Parents**
- Complete viewing history with timestamps
- Identifies whether content was watched by parent or child
- Grouped by date for easy review
- Individual entry removal or clear all option

### 6. **Approved Content List**
- Manually approve specific videos
- Option to block all unapproved content
- Approved content bypasses rating filters
- Add/remove videos by video key

## Storage

All settings are securely persisted in `localStorage`:
- Key: `jw-video-parental-controls`
- Data is JSON-encoded
- PIN is hashed (not stored in plain text)
- Automatic daily reset of watch time counters

## Usage

### Basic Integration

```tsx
import { ParentalControls } from "./components/ParentalControls";

// Add to your app routes
<Route path="/parental-controls" element={<ParentalControls />} />
```

### Filter Videos Based on Settings

```tsx
import { 
  filterVideosByParentalControls, 
  isWatchTimeExceeded,
  shouldFilterVideo 
} from "./components/ParentalControls";

// Load settings
const settings = JSON.parse(
  localStorage.getItem("jw-video-parental-controls") || "{}"
);

// Filter video list
const filteredVideos = filterVideosByParentalControls(videos, settings);

// Check individual video
if (shouldFilterVideo(video, settings)) {
  // Don't show this video
}

// Check time limit
if (isWatchTimeExceeded(settings)) {
  // Show time limit message
}
```

### Track Watch Time

```tsx
// In your video player component
useEffect(() => {
  const settings = JSON.parse(
    localStorage.getItem("jw-video-parental-controls") || "{}"
  );
  
  const today = new Date().toISOString().split("T")[0];
  const minutesWatched = Math.floor(currentTime / 60);
  
  if (minutesWatched > 0) {
    const currentUsed = settings.watchTimeUsed[today] || 0;
    settings.watchTimeUsed[today] = currentUsed + minutesWatched;
    localStorage.setItem("jw-video-parental-controls", JSON.stringify(settings));
  }
}, [currentTime]);
```

### Add to Viewing History

```tsx
const settings = JSON.parse(
  localStorage.getItem("jw-video-parental-controls") || "{}"
);

settings.viewingHistory.unshift({
  videoKey: video.key,
  videoTitle: video.title,
  watchedAt: Date.now(),
  duration: durationInSeconds,
  watchedBy: settings.kidsMode ? "child" : "parent",
});

// Keep only last 100 entries
settings.viewingHistory = settings.viewingHistory.slice(0, 100);
localStorage.setItem("jw-video-parental-controls", JSON.stringify(settings));
```

### Approve Specific Content

```tsx
const settings = JSON.parse(
  localStorage.getItem("jw-video-parental-controls") || "{}"
);

if (!settings.approvedContent.includes(videoKey)) {
  settings.approvedContent.push(videoKey);
  localStorage.setItem("jw-video-parental-controls", JSON.stringify(settings));
}
```

### Backup and Restore Settings

```tsx
import { 
  exportParentalSettings, 
  importParentalSettings,
  resetParentalSettings 
} from "./components/ParentalControls";

// Export/backup
const backupJson = exportParentalSettings();

// Import/restore
const success = importParentalSettings(backupJson);

// Reset to defaults
resetParentalSettings();
```

## Component Props

```tsx
interface ParentalControlsProps {
  onSettingsChange?: (settings: ParentalSettings) => void;
}
```

- `onSettingsChange`: Callback fired whenever settings are updated

## Settings Structure

```tsx
interface ParentalSettings {
  pinHash: string | null;           // Hashed PIN
  isEnabled: boolean;               // Parental controls active
  kidsMode: boolean;                // Kids mode active
  allowedRatings: ContentRating[];  // Allowed content ratings
  watchTimeLimit: number;           // Daily limit in minutes
  watchTimeUsed: Record<string, number>; // Minutes used per date
  approvedContent: string[];        // Approved video keys
  blockUnapproved: boolean;         // Block non-approved content
  viewingHistory: ViewingHistoryEntry[]; // Watch history
  lastReset: string;                // Last daily reset date
}
```

## CSS Integration

The component styles are included in `src/styles/index.css`. The styling follows the existing dark theme with:
- Consistent color variables
- Responsive design for mobile/tablet
- Smooth transitions and animations
- Badge indicators for active modes

## UI Tabs

The component has three main tabs:

1. **Settings** - Configure all parental control options
2. **Viewing History** - Review what has been watched
3. **Approved Content** - Manage the approved content list

## Security Notes

- PIN is hashed before storage (simple hash for demo - use crypto in production)
- Settings stored in localStorage (accessible via browser dev tools)
- For production, consider:
  - Server-side storage of settings
  - Proper cryptographic hashing (bcrypt, argon2)
  - Encrypted storage
  - Session-based PIN verification

## Example Screenshots

### Settings Tab
- Enable/disable parental controls toggle
- Kids Mode toggle
- PIN setup/change/remove
- Rating filter selection grid
- Watch time limit controls with +/- buttons
- Block unapproved content toggle

### Viewing History Tab
- Date-grouped history entries
- Video thumbnails and titles
- Watcher badge (parent/child indicator)
- Timestamp and duration
- Remove individual entries or clear all

### Approved Content Tab
- Add videos by key
- List of approved videos with thumbnails
- Remove from approved list

## Tips

1. **Enable PIN protection** before enabling other restrictions
2. **Start with Kids Mode** for young children - it auto-configures safe settings
3. **Review viewing history** regularly to monitor content consumption
4. **Set reasonable time limits** - default is 2 hours per day
5. **Use approved content list** for complete control over what can be watched
