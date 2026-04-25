import type {
	SearchFilters,
	SearchHistoryEntry,
	SearchResult,
	SearchSuggestion,
	Video,
} from "../types";
import { getCategories } from "./api";

// ─── Constants ──────────────────────────────────────────────────────────────

const TRENDING_SEARCHES_KEY = "jw-video-trending-searches";
const RECENT_SEARCHES_KEY = "jw-video-recent-searches";
const MAX_RECENT_SEARCHES = 10;
const MAX_TRENDING_SEARCHES = 10;

// Mock trending searches (in production, this would come from analytics)
const DEFAULT_TRENDING: SearchSuggestion[] = [
	{ text: "nature documentary", type: "trending" },
	{ text: "cooking tutorials", type: "trending" },
	{ text: "tech reviews", type: "trending" },
	{ text: "music concerts", type: "trending" },
	{ text: "sports highlights", type: "trending" },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function loadFromStorage<T>(key: string, defaultValue: T): T {
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : defaultValue;
	} catch {
		return defaultValue;
	}
}

function saveToStorage<T>(key: string, value: T): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage might be full or unavailable
	}
}

function normalizeText(text: string): string {
	return text.toLowerCase().trim();
}

// ─── Trending Searches ──────────────────────────────────────────────────────

export function getTrendingSearches(): SearchSuggestion[] {
	const stored = loadFromStorage<SearchSuggestion[]>(TRENDING_SEARCHES_KEY, []);
	if (stored.length > 0) {
		return stored.slice(0, MAX_TRENDING_SEARCHES);
	}
	return DEFAULT_TRENDING;
}

export function addTrendingSearch(query: string): void {
	const normalized = normalizeText(query);
	const trending = getTrendingSearches();

	// Remove if exists to move to top
	const filtered = trending.filter((t) => t.text !== normalized);

	// Add to front
	const updated: SearchSuggestion[] = [
		{ text: normalized, type: "trending" },
		...filtered,
	];

	saveToStorage(TRENDING_SEARCHES_KEY, updated.slice(0, MAX_TRENDING_SEARCHES));
}

// ─── Recent Searches ────────────────────────────────────────────────────────

export function getRecentSearches(): SearchHistoryEntry[] {
	return loadFromStorage<SearchHistoryEntry[]>(RECENT_SEARCHES_KEY, []);
}

export function addRecentSearch(
	query: string,
	resultCount?: number,
): SearchHistoryEntry {
	const normalized = normalizeText(query);
	const recent = getRecentSearches();

	// Remove if exists to avoid duplicates
	const filtered = recent.filter((r) => r.query !== normalized);

	const entry: SearchHistoryEntry = {
		query: normalized,
		timestamp: Date.now(),
		resultCount,
	};

	const updated = [entry, ...filtered];
	saveToStorage(RECENT_SEARCHES_KEY, updated.slice(0, MAX_RECENT_SEARCHES));

	return entry;
}

export function removeRecentSearch(query: string): void {
	const normalized = normalizeText(query);
	const recent = getRecentSearches().filter((r) => r.query !== normalized);
	saveToStorage(RECENT_SEARCHES_KEY, recent);
}

export function clearRecentSearches(): void {
	saveToStorage(RECENT_SEARCHES_KEY, []);
}

// ─── Search Suggestions ─────────────────────────────────────────────────────

export async function getSearchSuggestions(
	query: string,
	videos: Video[],
): Promise<SearchSuggestion[]> {
	const normalized = normalizeText(query);

	if (normalized.length < 2) {
		return [];
	}

	// Get suggestions based on video titles and descriptions
	const suggestions = new Set<string>();

	for (const video of videos) {
		const title = normalizeText(video.title);
		const _description = normalizeText(video.description || "");

		// Check if query matches start of title words
		const words = title.split(/\s+/);
		for (const word of words) {
			if (word.startsWith(normalized) && word.length > 2) {
				suggestions.add(word);
			}
		}

		// Extract potential suggestion phrases from title
		if (title.includes(normalized)) {
			// Add partial title as suggestion
			const parts = title.split(normalized);
			if (parts[0].length < 30) {
				suggestions.add(title);
			}
		}
	}

	// Convert to suggestions
	const result: SearchSuggestion[] = Array.from(suggestions)
		.slice(0, 8)
		.map((text) => ({
			text,
			type: "suggested" as const,
		}));

	return result;
}

// ─── Search with Filters ────────────────────────────────────────────────────

function matchesFilters(video: Video, filters: SearchFilters): boolean {
	// Category filter
	if (filters.categoryKey && video.categoryKey !== filters.categoryKey) {
		return false;
	}

	// Duration filters
	if (
		filters.minDuration !== undefined &&
		video.duration < filters.minDuration
	) {
		return false;
	}
	if (
		filters.maxDuration !== undefined &&
		video.duration > filters.maxDuration
	) {
		return false;
	}

	// Date filters
	if (filters.dateFrom && video.firstPublished) {
		const videoDate = new Date(video.firstPublished);
		const fromDate = new Date(filters.dateFrom);
		if (videoDate < fromDate) return false;
	}
	if (filters.dateTo && video.firstPublished) {
		const videoDate = new Date(video.firstPublished);
		const toDate = new Date(filters.dateTo);
		if (videoDate > toDate) return false;
	}

	// Media type filter
	if (filters.mediaType && video.mediaType !== filters.mediaType) {
		return false;
	}

	return true;
}

export async function performSearch(
	query: string,
	videos: Video[],
	filters?: SearchFilters,
): Promise<SearchResult> {
	const normalized = normalizeText(query);

	// Base search - filter by query
	let results = videos.filter((v) => {
		const title = normalizeText(v.title);
		const description = normalizeText(v.description || "");

		// Simple text search
		return (
			title.includes(normalized) ||
			description.includes(normalized) ||
			// Also check for word boundary matches
			title.split(/\s+/).some((word) => word.startsWith(normalized))
		);
	});

	// Apply filters
	if (filters) {
		results = results.filter((v) => matchesFilters(v, filters));
	}

	// Generate suggestions
	const suggestions = await getSearchSuggestions(normalized, videos);

	// Add to recent searches if there are results
	if (results.length > 0 && query.trim().length > 0) {
		addRecentSearch(query, results.length);
		addTrendingSearch(query);
	}

	return {
		videos: results,
		total: results.length,
		suggestions,
		appliedFilters: filters || {},
	};
}

// ─── Voice Search ───────────────────────────────────────────────────────────

export interface VoiceSearchResult {
	success: boolean;
	transcript?: string;
	error?: string;
}

export function isSpeechRecognitionAvailable(): boolean {
	return (
		typeof window !== "undefined" &&
		("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
	);
}

export function startVoiceSearch(
	onResult: (result: VoiceSearchResult) => void,
): () => void {
	if (!isSpeechRecognitionAvailable()) {
		onResult({
			success: false,
			error: "Voice search is not supported in this browser",
		});
		return () => {};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const SpeechRecognition =
		(window as any).SpeechRecognition ||
		(window as any).webkitSpeechRecognition;

	const recognition = new SpeechRecognition();
	recognition.continuous = false;
	recognition.interimResults = true;
	recognition.lang = "en-US";

	let finalTranscript = "";

	recognition.onresult = (event: any) => {
		let interimTranscript = "";

		for (let i = event.resultIndex; i < event.results.length; i++) {
			const transcript = event.results[i][0].transcript;
			if (event.results[i].isFinal) {
				finalTranscript += transcript;
			} else {
				interimTranscript += transcript;
			}
		}

		onResult({
			success: true,
			transcript: finalTranscript || interimTranscript,
		});
	};

	recognition.onerror = (event: any) => {
		onResult({
			success: false,
			error: event.error || "Voice recognition error",
		});
	};

	recognition.onend = () => {
		if (finalTranscript) {
			onResult({ success: true, transcript: finalTranscript });
		}
	};

	recognition.start();

	// Return cleanup function
	return () => {
		try {
			recognition.stop();
		} catch {
			// Ignore
		}
	};
}

// ─── Duration Formatting Helpers ────────────────────────────────────────────

export function parseDurationFilter(value: string): number | undefined {
	if (!value) return undefined;

	// Parse formats like "5m", "10m", "1h", "1h30m"
	const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?$/);
	if (!match) return undefined;

	const hours = parseInt(match[1] || "0", 10);
	const minutes = parseInt(match[2] || "0", 10);

	return hours * 3600 + minutes * 60;
}

export function formatDurationFilter(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours > 0) {
		return `${hours}h${minutes}m`;
	}
	return `${minutes}m`;
}

// ─── Category-based Suggestions ─────────────────────────────────────────────

export async function getCategorySuggestions(
	videos: Video[],
): Promise<SearchSuggestion[]> {
	const categories = await getCategories();
	const suggestions: SearchSuggestion[] = [];

	for (const category of categories.slice(0, 5)) {
		const count = videos.filter((v) => v.categoryKey === category.key).length;
		if (count > 0) {
			suggestions.push({
				text: category.name,
				type: "trending",
				videoCount: count,
			});
		}
	}

	return suggestions;
}
