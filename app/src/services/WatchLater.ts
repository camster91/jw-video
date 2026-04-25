import type { Video } from "../types";

// ─── Watch Later Queue (localStorage) ───────────────────────────────────────

const WATCH_LATER_KEY = "jw-video-watch-later";
const SYNC_PENDING_KEY = "jw-video-watch-later-pending";

export interface WatchLaterEntry {
	key: string;
	addedAt: number;
	video?: Video;
}

/**
 * Get the watch later queue from localStorage
 */
export function getWatchLater(): WatchLaterEntry[] {
	try {
		return JSON.parse(localStorage.getItem(WATCH_LATER_KEY) || "[]");
	} catch {
		return [];
	}
}

/**
 * Add a video to the watch later queue
 */
export function addToWatchLater(video: Video): void {
	const queue = getWatchLater();

	// Remove if already exists (to move to top)
	const filtered = queue.filter((entry) => entry.key !== video.key);

	// Add to top of queue
	const entry: WatchLaterEntry = {
		key: video.key,
		addedAt: Date.now(),
		video,
	};

	filtered.unshift(entry);
	localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(filtered));

	// Queue for sync when online
	queueSyncOperation("add", video.key);
}

/**
 * Remove a video from the watch later queue
 */
export function removeFromWatchLater(key: string): void {
	const queue = getWatchLater().filter((entry) => entry.key !== key);
	localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(queue));

	// Queue for sync when online
	queueSyncOperation("remove", key);
}

/**
 * Check if a video is in the watch later queue
 */
export function isInWatchLater(key: string): boolean {
	return getWatchLater().some((entry) => entry.key === key);
}

/**
 * Clear the entire watch later queue
 */
export function clearWatchLater(): void {
	localStorage.setItem(WATCH_LATER_KEY, JSON.stringify([]));
	queueSyncOperation("clear", "");
}

/**
 * Get videos from watch later queue with full video data
 */
export async function getWatchLaterVideos(): Promise<Video[]> {
	const { getVideo } = await import("./api");
	const queue = getWatchLater();
	const videos: Video[] = [];

	for (const entry of queue) {
		if (entry.video) {
			videos.push(entry.video);
		} else {
			const video = await getVideo(entry.key);
			if (video) {
				entry.video = video;
				videos.push(video);
			}
		}
	}

	// Persist enriched data
	localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(queue));

	return videos;
}

/**
 * Reorder items in the watch later queue
 */
export function reorderWatchLater(fromIndex: number, toIndex: number): void {
	const queue = getWatchLater();

	if (
		fromIndex < 0 ||
		fromIndex >= queue.length ||
		toIndex < 0 ||
		toIndex >= queue.length
	) {
		return;
	}

	const [moved] = queue.splice(fromIndex, 1);
	queue.splice(toIndex, 0, moved);

	localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(queue));
}

// ─── Sync Operations (for when online) ──────────────────────────────────────

interface SyncOperation {
	type: "add" | "remove" | "clear";
	key: string;
	timestamp: number;
}

function queueSyncOperation(type: SyncOperation["type"], key: string): void {
	const pending: SyncOperation[] = getPendingSyncOperations();
	pending.push({ type, key, timestamp: Date.now() });
	localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(pending));
}

function getPendingSyncOperations(): SyncOperation[] {
	try {
		return JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || "[]");
	} catch {
		return [];
	}
}

/**
 * Sync pending operations when online
 * This would typically sync to a backend server
 */
export async function syncWatchLater(): Promise<boolean> {
	const pending = getPendingSyncOperations();

	if (pending.length === 0) {
		return true;
	}

	// Check if online
	if (!navigator.onLine) {
		return false;
	}

	try {
		// TODO: Implement actual server sync when backend is available
		// For now, just clear pending operations
		console.log("Syncing watch later operations:", pending);

		// Clear pending operations after successful sync
		localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify([]));

		return true;
	} catch (error) {
		console.error("Failed to sync watch later:", error);
		return false;
	}
}

/**
 * Listen for online events and trigger sync
 */
export function setupAutoSync(): () => void {
	const handleOnline = () => {
		syncWatchLater();
	};

	window.addEventListener("online", handleOnline);

	// Also try sync on page load if online
	if (navigator.onLine) {
		syncWatchLater();
	}

	return () => {
		window.removeEventListener("online", handleOnline);
	};
}
