# Live Streaming Feature Documentation

## Overview
Comprehensive live streaming capability for JW Video app using HLS.js, featuring DVR controls, live chat, event calendar, notifications, and multi-quality support.

## Files Created

### Types
- **`src/types/live.ts`** - Type definitions for live streaming:
  - `LiveStreamQuality` - Quality levels (resolution, bitrate)
  - `LiveChatMessage` - Chat message structure
  - `LiveEvent` - Live event metadata
  - `LiveStreamState` - Player state
  - `LiveNotification` - Notification structure
  - `DVRState` - DVR playback state

### Services
- **`src/services/liveStream.ts`** - Live streaming service:
  - `getLiveEvents()` - Fetch all live events
  - `getFeaturedLiveEvent()` - Get featured live event
  - `getUpcomingLiveEvents()` - Get upcoming events
  - `sendChatMessage()` - Send chat message
  - `simulateLiveChat()` - Simulate incoming chat messages
  - `registerForLiveNotifications()` - Register for event notifications
  - `checkUpcomingEvents()` - Check for events starting soon
  - `sendBrowserNotification()` - Send browser push notifications

### Hooks
- **`src/hooks/useLivePlayer.ts`** - Live player hook:
  - HLS.js integration with low-latency mode
  - DVR buffer management (90-second back buffer)
  - Quality level switching
  - Live edge synchronization
  - Auto-recovery from errors

### Components

#### LivePlayer (`src/components/LivePlayer.tsx`)
Main live video player with:
- **DVR Controls**: Rewind/Forward 10s, Go to Live button
- **Progress Bar**: Shows DVR buffer with live edge marker
- **Multi-Quality**: Quality selector menu (Auto, 1080p, 720p, 480p, 360p)
- **Live Badge**: Animated "LIVE" indicator with viewer count
- **DVR Indicator**: Shows when not at live edge
- **Standard Controls**: Play/Pause, Volume, Fullscreen

#### LiveChat (`src/components/LiveChat.tsx`)
Live chat overlay with:
- Real-time message display
- User avatars and badges (Moderator, Verified)
- Auto-scroll to latest messages
- "New messages" indicator when scrolled up
- Message input with send button
- Simulated chat messages for demo

#### LiveEventsCalendar (`src/components/LiveEventsCalendar.tsx`)
Event calendar showing:
- **Live Now Section**: Currently streaming events
- **Coming Soon Section**: Upcoming events with countdown
- **Recent Replays Section**: Past events with replay availability
- **Notification Registration**: "Remind Me" button for upcoming events
- Event metadata (date, time, category, viewer count)

#### LiveNotifications (`src/components/LiveNotifications.tsx`)
Notification system with:
- Unread notification badge
- Dropdown list of notifications
- Notification types: "Now Live", "Starting Soon", "Replay Available"
- Mark as read functionality
- Browser push notifications
- Click to navigate to event

### Pages
- **`src/pages/LivePage.tsx`** - Main live streaming page:
  - Hero section with feature description
  - Featured live event card
  - Live events calendar integration
  - Live player with chat overlay
  - Notification integration

### Styles
- `src/components/LivePlayer.css` - Player styles
- `src/components/LiveChat.css` - Chat overlay styles
- `src/components/LiveEventsCalendar.css` - Calendar styles
- `src/components/LiveNotifications.css` - Notification styles
- `src/pages/LivePage.css` - Page layout styles

## Features Implemented

### 1. Live Video Player with DVR Controls ✅
- HLS.js integration for adaptive streaming
- 90-second DVR back buffer
- Seek within buffer window
- Rewind/Forward 10 seconds
- "Return to Live" button
- Visual DVR progress bar with live edge marker
- DVR active indicator overlay

### 2. Live Chat Integration (Mock) ✅
- Real-time chat message display
- Simulated incoming messages (3-8 second intervals)
- User badges (Moderator, Verified)
- Auto-scroll to latest messages
- Manual scroll with "New messages" button
- Message input with send functionality
- Chat overlay toggle

### 3. Upcoming Live Events Calendar ✅
- Three sections: Live Now, Coming Soon, Recent Replays
- Countdown timer for upcoming events
- Event thumbnails and metadata
- Category badges
- Viewer count display
- "Remind Me" notification registration
- Click to watch live or replay

### 4. Notifications for Live Streams ✅
- Browser notification permission request
- "Starting Soon" notifications (15 min before)
- "Now Live" notifications
- "Replay Available" notifications
- Notification badge in navbar
- Dropdown notification list
- Mark as read/Clear all functionality
- Click to navigate to event

### 5. Replay After Live Ends ✅
- Automatic replay availability detection
- Replay badge on past events
- "Watch Replay" button
- Integration with existing video player
- Viewed status tracking

### 6. Multi-Quality for Live ✅
- Quality selector menu
- Auto quality switching
- Manual quality selection (1080p, 720p, 480p, 360p)
- Bitrate display for each quality
- Quality change indicator
- HLS.js level switching

## Usage

### Navigate to Live Page
```
/live - Main live streaming page
```

### Watch Live Event
1. Go to `/live`
2. Click on a "Live Now" event card
3. Player opens with live stream
4. Chat opens automatically (toggle with button)

### Register for Notifications
1. Go to `/live`
2. Find upcoming event
3. Click "Remind Me" button
4. Grant browser notification permission if prompted

### Watch Replay
1. Go to `/live`
2. Scroll to "Recent Replays" section
3. Click "Watch Replay" button
4. Opens in standard video player

## Technical Details

### HLS.js Configuration
```javascript
{
  enableWorker: true,
  lowLatencyMode: true,
  backBufferLength: 90,
  maxBufferLength: 30,
  maxMaxBufferLength: 60,
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 5,
  startPosition: -1
}
```

### Error Recovery
- Network errors: Auto-retry with `hls.startLoad()`
- Media errors: Auto-recover with `hls.recoverMediaError()`
- Fatal errors: Display error overlay with retry option

### Storage
- Notifications: `localStorage` (jw_live_notifications)
- Viewed events: `localStorage` (jw_viewed_live_events)

## Future Enhancements
- Real chat backend integration
- Actual live stream sources
- Push notification service workers
- Live stream recording/DVR cloud storage
- Viewer count real-time updates
- Chat moderation tools
- Emoji reactions
- Closed captions for live streams
