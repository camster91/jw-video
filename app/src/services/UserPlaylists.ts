import type { Video } from "../types";

// ─── Playlist Types ─────────────────────────────────────────────────────────

export interface Playlist {
	id: string;
	name: string;
	description?: string;
	thumbnailUrl?: string;
	videoKeys: string[];
	videos?: Video[];
	createdAt: number;
	updatedAt: number;
	isPublic: boolean;
	shareId?: string;
}

export interface PlaylistShareData {
	playlistId: string;
	name: string;
	description?: string;
	thumbnailUrl?: string;
	videoCount: number;
	isPublic: boolean;
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

const PLAYLISTS_KEY = "jw-video-playlists";
const SYNC_PENDING_KEY = "jw-video-playlists-pending";
const SHARE_CODES_KEY = "jw-video-share-codes";

// ─── Playlist Management ────────────────────────────────────────────────────

/**
 * Get all playlists from localStorage
 */
export function getPlaylists(): Playlist[] {
	try {
		return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || "[]");
	} catch {
		return [];
	}
}

/**
 * Create a new playlist
 */
export function createPlaylist(
	name: string,
	description?: string,
	thumbnailUrl?: string,
	isPublic = false,
): Playlist {
	const playlists = getPlaylists();

	const playlist: Playlist = {
		id: generateId(),
		name,
		description,
		thumbnailUrl,
		videoKeys: [],
		createdAt: Date.now(),
		updatedAt: Date.now(),
		isPublic,
		shareId: isPublic ? generateShareId() : undefined,
	};

	playlists.unshift(playlist);
	savePlaylists(playlists);
	queueSyncOperation("create", playlist);

	return playlist;
}

/**
 * Update an existing playlist
 */
export function updatePlaylist(
	id: string,
	updates: Partial<
		Pick<Playlist, "name" | "description" | "thumbnailUrl" | "isPublic">
	>,
): Playlist | null {
	const playlists = getPlaylists();
	const index = playlists.findIndex((p) => p.id === id);

	if (index === -1) {
		return null;
	}

	const updated: Playlist = {
		...playlists[index],
		...updates,
		updatedAt: Date.now(),
	};

	// Generate shareId if making public
	if (updates.isPublic && !updated.shareId) {
		updated.shareId = generateShareId();
	} else if (updates.isPublic === false) {
		updated.shareId = undefined;
	}

	playlists[index] = updated;
	savePlaylists(playlists);
	queueSyncOperation("update", updated);

	return updated;
}

/**
 * Delete a playlist
 */
export function deletePlaylist(id: string): boolean {
	const playlists = getPlaylists();
	const filtered = playlists.filter((p) => p.id !== id);

	if (filtered.length === playlists.length) {
		return false;
	}

	savePlaylists(filtered);
	queueSyncOperation("delete", { id });

	// Remove share code if exists
	const playlist = playlists.find((p) => p.id === id);
	if (playlist?.shareId) {
		removeShareCode(playlist.shareId);
	}

	return true;
}

/**
 * Get a playlist by ID
 */
export function getPlaylist(id: string): Playlist | null {
	const playlists = getPlaylists();
	return playlists.find((p) => p.id === id) || null;
}

/**
 * Get a playlist by share ID
 */
export function getPlaylistByShareId(shareId: string): Playlist | null {
	const playlists = getPlaylists();
	return playlists.find((p) => p.shareId === shareId) || null;
}

/**
 * Add a video to a playlist
 */
export function addVideoToPlaylist(playlistId: string, video: Video): boolean {
	const playlists = getPlaylists();
	const playlist = playlists.find((p) => p.id === playlistId);

	if (!playlist) {
		return false;
	}

	// Remove if already exists (to move to top)
	playlist.videoKeys = playlist.videoKeys.filter((key) => key !== video.key);
	playlist.videoKeys.unshift(video.key);
	playlist.updatedAt = Date.now();

	// Store video data if available
	if (!playlist.videos) {
		playlist.videos = [];
	}
	const existingVideoIndex = playlist.videos.findIndex(
		(v) => v.key === video.key,
	);
	if (existingVideoIndex !== -1) {
		playlist.videos.splice(existingVideoIndex, 1);
	}
	playlist.videos.unshift(video);

	savePlaylists(playlists);
	queueSyncOperation("addVideo", { playlistId, videoKey: video.key });

	return true;
}

/**
 * Remove a video from a playlist
 */
export function removeVideoFromPlaylist(
	playlistId: string,
	videoKey: string,
): boolean {
	const playlists = getPlaylists();
	const playlist = playlists.find((p) => p.id === playlistId);

	if (!playlist) {
		return false;
	}

	playlist.videoKeys = playlist.videoKeys.filter((key) => key !== videoKey);
	playlist.updatedAt = Date.now();

	if (playlist.videos) {
		playlist.videos = playlist.videos.filter((v) => v.key !== videoKey);
	}

	savePlaylists(playlists);
	queueSyncOperation("removeVideo", { playlistId, videoKey });

	return true;
}

/**
 * Check if a video is in a playlist
 */
export function isVideoInPlaylist(
	playlistId: string,
	videoKey: string,
): boolean {
	const playlist = getPlaylist(playlistId);
	return playlist?.videoKeys.includes(videoKey) ?? false;
}

/**
 * Get all videos in a playlist
 */
export async function getPlaylistVideos(playlistId: string): Promise<Video[]> {
	const { getVideo } = await import("./api");
	const playlist = getPlaylist(playlistId);

	if (!playlist) {
		return [];
	}

	// Return cached videos if available
	if (playlist.videos && playlist.videos.length === playlist.videoKeys.length) {
		return playlist.videos;
	}

	const videos: Video[] = [];
	for (const key of playlist.videoKeys) {
		const video = await getVideo(key);
		if (video) {
			videos.push(video);
		}
	}

	// Cache the videos
	playlist.videos = videos;
	savePlaylists(getPlaylists());

	return videos;
}

/**
 * Reorder videos in a playlist
 */
export function reorderPlaylistVideos(
	playlistId: string,
	fromIndex: number,
	toIndex: number,
): boolean {
	const playlists = getPlaylists();
	const playlist = playlists.find((p) => p.id === playlistId);

	if (!playlist) {
		return false;
	}

	if (
		fromIndex < 0 ||
		fromIndex >= playlist.videoKeys.length ||
		toIndex < 0 ||
		toIndex >= playlist.videoKeys.length
	) {
		return false;
	}

	const [movedKey] = playlist.videoKeys.splice(fromIndex, 1);
	playlist.videoKeys.splice(toIndex, 0, movedKey);

	if (playlist.videos) {
		const [movedVideo] = playlist.videos.splice(fromIndex, 1);
		playlist.videos.splice(toIndex, 0, movedVideo);
	}

	playlist.updatedAt = Date.now();
	savePlaylists(playlists);

	return true;
}

// ─── Share Functionality ────────────────────────────────────────────────────

/**
 * Generate a shareable link for a playlist
 */
export function sharePlaylist(playlistId: string): string | null {
	const playlist = getPlaylist(playlistId);

	if (!playlist) {
		return null;
	}

	// Make public if not already
	if (!playlist.isPublic) {
		updatePlaylist(playlistId, { isPublic: true });
	}

	// Generate share code
	const shareCode = playlist.shareId || generateShareId();
	saveShareCode(shareCode, playlistId);

	// Return shareable URL
	const baseUrl = window.location.origin;
	return `${baseUrl}/playlist/share/${shareCode}`;
}

/**
 * Get share data for a playlist
 */
export function getPlaylistShareData(
	playlistId: string,
): PlaylistShareData | null {
	const playlist = getPlaylist(playlistId);

	if (!playlist?.isPublic) {
		return null;
	}

	return {
		playlistId: playlist.id,
		name: playlist.name,
		description: playlist.description,
		thumbnailUrl: playlist.thumbnailUrl,
		videoCount: playlist.videoKeys.length,
		isPublic: playlist.isPublic,
	};
}

/**
 * Import a playlist from a share code
 */
export function importPlaylistFromShareCode(
	shareCode: string,
): Playlist | null {
	const playlists = getPlaylists();
	const sourcePlaylist = playlists.find(
		(p) => p.shareId === shareCode && p.isPublic,
	);

	if (!sourcePlaylist) {
		return null;
	}

	// Create a copy of the playlist
	const newPlaylist: Playlist = {
		id: generateId(),
		name: `${sourcePlaylist.name} (Copy)`,
		description: sourcePlaylist.description,
		thumbnailUrl: sourcePlaylist.thumbnailUrl,
		videoKeys: [...sourcePlaylist.videoKeys],
		videos: sourcePlaylist.videos ? [...sourcePlaylist.videos] : undefined,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		isPublic: false,
	};

	playlists.unshift(newPlaylist);
	savePlaylists(playlists);

	return newPlaylist;
}

// ─── Share Code Storage ─────────────────────────────────────────────────────

function saveShareCode(shareCode: string, playlistId: string): void {
	const codes = getShareCodes();
	codes[shareCode] = playlistId;
	localStorage.setItem(SHARE_CODES_KEY, JSON.stringify(codes));
}

function getShareCodes(): Record<string, string> {
	try {
		return JSON.parse(localStorage.getItem(SHARE_CODES_KEY) || "{}");
	} catch {
		return {};
	}
}

function removeShareCode(shareCode: string): void {
	const codes = getShareCodes();
	delete codes[shareCode];
	localStorage.setItem(SHARE_CODES_KEY, JSON.stringify(codes));
}

// ─── Sync Operations ────────────────────────────────────────────────────────

interface SyncOperation {
	type: "create" | "update" | "delete" | "addVideo" | "removeVideo";
	data: Playlist | { id: string } | { playlistId: string; videoKey: string };
	timestamp: number;
}

function queueSyncOperation(
	type: SyncOperation["type"],
	data: SyncOperation["data"],
): void {
	const pending: SyncOperation[] = getPendingSyncOperations();
	pending.push({ type, data, timestamp: Date.now() });
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
 */
export async function syncPlaylists(): Promise<boolean> {
	const pending = getPendingSyncOperations();

	if (pending.length === 0) {
		return true;
	}

	if (!navigator.onLine) {
		return false;
	}

	try {
		// TODO: Implement actual server sync when backend is available
		console.log("Syncing playlist operations:", pending);

		localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify([]));

		return true;
	} catch (error) {
		console.error("Failed to sync playlists:", error);
		return false;
	}
}

/**
 * Listen for online events and trigger sync
 */
export function setupAutoSync(): () => void {
	const handleOnline = () => {
		syncPlaylists();
	};

	window.addEventListener("online", handleOnline);

	if (navigator.onLine) {
		syncPlaylists();
	}

	return () => {
		window.removeEventListener("online", handleOnline);
	};
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function savePlaylists(playlists: Playlist[]): void {
	localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

function generateId(): string {
	return `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateShareId(): string {
	return Math.random().toString(36).substr(2, 12);
}

/**
 * Get a random thumbnail from playlist videos
 */
export function getPlaylistThumbnail(playlist: Playlist): string | undefined {
	if (playlist.thumbnailUrl) {
		return playlist.thumbnailUrl;
	}

	if (playlist.videos && playlist.videos.length > 0) {
		return playlist.videos[0].thumbnailUrl;
	}

	return undefined;
}

/**
 * Get formatted date for playlist
 */
export function getPlaylistDateFormatted(playlist: Playlist): string {
	return new Date(playlist.updatedAt).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
