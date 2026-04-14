import type { Category, Video, VideoData } from "../types";

// Load embedded video data (built at compile time from scraper output)
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

export function getWatchHistory(): string[] {
	try {
		return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
	} catch {
		return [];
	}
}

export function addToHistory(key: string): void {
	const hist = getWatchHistory().filter((k) => k !== key);
	hist.unshift(key);
	if (hist.length > 100) hist.pop();
	localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

export function getWatchedVideos(): Video[] {
	const data = cachedData;
	if (!data) return [];
	const hist = getWatchHistory();
	return hist
		.map((k) => data.videos.find((v) => v.key === k))
		.filter(Boolean) as Video[];
}
