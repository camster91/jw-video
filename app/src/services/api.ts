import type { Category, Video, VideoData } from "../types";

// Remote video data (GitHub, updated daily by local cron)
const REMOTE_DATA_URL = "https://raw.githubusercontent.com/camster91/jw-video/master/app/public/videos.json";

let cachedData: VideoData | undefined;

async function loadData(): Promise<VideoData> {
	if (cachedData) return cachedData;
	const resp = await fetch("/videos.json");
	const data = await resp.json();
	cachedData = data;
	return data;
}

// ─── Videos ────────────────────────────────────────────────────────────────

export async function getVideos(
	page = 1,
	perPage = 30,
): Promise<{ videos: Video[]; total: number }> {
	const data = await loadData();
	const start = (page - 1) * perPage;
	const videos = data.videos.slice(start, start + perPage);
	return { videos, total: data.videos.length };
}

export async function getVideo(key: string): Promise<Video | null> {
	const data = await loadData();
	return data.videos.find((v) => v.key === key) ?? null;
}

export async function searchVideos(query: string): Promise<Video[]> {
	const data = await loadData();
	const q = query.toLowerCase();
	return data.videos.filter(
		(v) =>
			v.title.toLowerCase().includes(q) ||
			v.description?.toLowerCase().includes(q),
	);
}

export async function getVideosByCategory(
	categoryKey: string,
): Promise<Video[]> {
	const data = await loadData();
	return data.videos.filter((v) => v.categoryKey === categoryKey);
}

// ─── Categories ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
	const data = await loadData();
	return data.categories;
}

export async function getCategory(key: string): Promise<Category | null> {
	const data = await loadData();
	return data.categories.find((c) => c.key === key) ?? null;
}

export async function getTopLevelCategories(): Promise<Category[]> {
	const data = await loadData();
	return data.categories.filter((c) => !c.parentKey);
}

export async function getSubcategories(parentKey: string): Promise<Category[]> {
	const data = await loadData();
	return data.categories.filter((c) => c.parentKey === parentKey);
}

// ─── Featured / Recently Published ─────────────────────────────────────────

export async function getFeatured(): Promise<Video | null> {
	const data = await loadData();
	return data.videos.find((v) => v.posterUrl) ?? data.videos[0] ?? null;
}

export async function getRecentlyPublished(limit = 20): Promise<Video[]> {
	const data = await loadData();
	return data.videos
		.filter((v) => v.firstPublished)
		.sort((a, b) =>
			(b.firstPublished ?? "").localeCompare(a.firstPublished ?? ""),
		)
		.slice(0, limit);
}

// ─── Favorites (localStorage) ───────────────────────────────────────────────

const FAVORITES_KEY = "jw-video-favorites";

export function getFavorites(): string[] {
	try {
		return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
	} catch {
		return [];
	}
}

export function addFavorite(key: string): void {
	const favs = getFavorites();
	if (!favs.includes(key)) {
		favs.push(key);
		localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
	}
}

export function removeFavorite(key: string): void {
	const favs = getFavorites().filter((k) => k !== key);
	localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

export function isFavorite(key: string): boolean {
	return getFavorites().includes(key);
}

// ─── Watch History (localStorage) ───────────────────────────────────────────

const HISTORY_KEY = "jw-video-history";
const HISTORY_PROGRESS_KEY = "jw-video-history-progress";

export interface WatchHistoryEntry {
	key: string;
	watchedAt: number;
	progress?: number;
	lastPosition?: number;
}

export function getWatchHistory(): string[] {
	try {
		return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
	} catch {
		return [];
	}
}

export function getWatchHistoryWithProgress(): WatchHistoryEntry[] {
	try {
		return JSON.parse(localStorage.getItem(HISTORY_PROGRESS_KEY) || "[]");
	} catch {
		return [];
	}
}

export function addToHistory(key: string, progress?: number, lastPosition?: number): void {
	const hist = getWatchHistory().filter((k) => k !== key);
	hist.unshift(key);
	if (hist.length > 100) hist.pop();
	localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));

	const histProgress = getWatchHistoryWithProgress();
	const existingIndex = histProgress.findIndex((h) => h.key === key);
	const entry: WatchHistoryEntry = {
		key,
		watchedAt: Date.now(),
		progress: progress ?? 0,
		lastPosition: lastPosition ?? 0,
	};
	if (existingIndex !== -1) histProgress.splice(existingIndex, 1);
	histProgress.unshift(entry);
	if (histProgress.length > 100) histProgress.pop();
	localStorage.setItem(HISTORY_PROGRESS_KEY, JSON.stringify(histProgress));
}

export function updateWatchProgress(key: string, progress: number, lastPosition: number): void {
	const histProgress = getWatchHistoryWithProgress();
	const idx = histProgress.findIndex((h) => h.key === key);
	if (idx !== -1) {
		histProgress[idx] = { ...histProgress[idx], progress, lastPosition };
	} else {
		histProgress.unshift({ key, watchedAt: Date.now(), progress, lastPosition });
	}
	localStorage.setItem(HISTORY_PROGRESS_KEY, JSON.stringify(histProgress));
}

export function removeFromHistory(key: string): void {
	localStorage.setItem(HISTORY_KEY, JSON.stringify(getWatchHistory().filter((k) => k !== key)));
	localStorage.setItem(HISTORY_PROGRESS_KEY, JSON.stringify(getWatchHistoryWithProgress().filter((h) => h.key !== key)));
}

export function getWatchedVideos(): Video[] {
	if (!cachedData) return [];
	const hist = getWatchHistory();
	return hist.map((k) => cachedData!.videos.find((v) => v.key === k)).filter(Boolean) as Video[];
}