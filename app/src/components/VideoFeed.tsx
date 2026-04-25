import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	addToHistory,
	getFeatured,
	getRecentlyPublished,
	getVideos,
	getWatchHistory,
	getWatchHistoryWithProgress,
} from "../services/api";
import type { Video } from "../types";

// Utility function to format duration
export function formatDuration(seconds: number): string {
	const hrs = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hrs > 0) {
		return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface VideoFeedSection {
	title: string;
	key: string;
	videos: Video[];
	loading: boolean;
	hasMore: boolean;
	page: number;
	type: "recent" | "popular" | "recommended" | "history" | "series";
}

interface VideoFeedProps {
	onVideoSelect?: (video: Video) => void;
}

// Enhanced recommendation algorithm based on watch history
export function getRecommendedVideos(
	allVideos: Video[],
	limit: number = 20,
): Video[] {
	const history = getWatchHistory();
	if (allVideos.length === 0) return [];

	if (history.length === 0) {
		// No history, return recently published
		return allVideos.slice(0, limit);
	}

	// Build category affinity map from watch history
	const categoryAffinity = new Map<string, number>();
	const watchedVideos = history
		.map((key) => allVideos.find((v) => v.key === key))
		.filter(Boolean) as Video[];

	watchedVideos.forEach((video) => {
		if (video.categoryKey) {
			categoryAffinity.set(
				video.categoryKey,
				(categoryAffinity.get(video.categoryKey) || 0) + 1,
			);
		}
	});

	// Calculate average duration preference
	const avgDuration =
		watchedVideos.length > 0
			? watchedVideos.reduce((acc, v) => acc + v.duration, 0) /
				watchedVideos.length
			: 0;

	// Score videos based on multiple factors
	const scored = allVideos.map((video) => {
		let score = 0;
		const historyIndex = history.indexOf(video.key);

		// Factor 1: Exclude recently watched (give them very low priority)
		if (historyIndex !== -1) {
			if (historyIndex < 5) {
				return { video, score: -1000 }; // Just watched, don't recommend
			}
			// Older watches get slight boost for re-watch potential
			score += 2 * (1 - historyIndex / history.length);
		}

		// Factor 2: Category affinity - strong boost for preferred categories
		if (video.categoryKey && categoryAffinity.has(video.categoryKey)) {
			const affinity = categoryAffinity.get(video.categoryKey)!;
			score += affinity * 8;
		}

		// Factor 3: Recency boost - prefer newer content
		if (video.firstPublished) {
			const publishedDate = new Date(video.firstPublished);
			const daysSincePublished =
				(Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
			if (daysSincePublished < 3) {
				score += 20; // Very recent
			} else if (daysSincePublished < 7) {
				score += 15;
			} else if (daysSincePublished < 14) {
				score += 10;
			} else if (daysSincePublished < 30) {
				score += 5;
			}
		}

		// Factor 4: Duration preference - match user's watching patterns
		if (avgDuration > 0 && watchedVideos.length >= 3) {
			const durationDiff = Math.abs(video.duration - avgDuration);
			if (durationDiff < 120) {
				// Within 2 minutes of average
				score += 12;
			} else if (durationDiff < 300) {
				// Within 5 minutes
				score += 6;
			} else if (durationDiff < 600) {
				// Within 10 minutes
				score += 3;
			}
		}

		// Factor 5: Diversity bonus - boost unwatched content
		if (historyIndex === -1) {
			score += 5;
		}

		// Factor 6: Completion bias - if user watches videos to end, boost longer content
		// (simplified heuristic)

		return { video, score };
	});

	// Sort by score
	scored.sort((a, b) => b.score - a.score);

	// Return top recommendations, prioritizing unwatched content
	const recommended = scored
		.filter(({ score }) => score > -500) // Filter out recently watched
		.slice(0, limit);

	return recommended.map(({ video }) => video);
}

// Get series videos (videos that are part of a series based on title patterns)
export function getSeriesVideos(
	allVideos: Video[],
	limit: number = 20,
): Video[] {
	const history = getWatchHistory();

	// Look for videos with series-like patterns in titles
	const seriesPattern = /(?:Part|Episode|Season|Vol\.|Chapter)\s*\d+/i;
	const seriesVideos = allVideos.filter((v) => seriesPattern.test(v.title));

	// Sort by relevance to watch history
	if (history.length > 0) {
		const watchedCategories = new Set(
			history
				.map((key) => allVideos.find((v) => v.key === key)?.categoryKey)
				.filter(Boolean),
		);

		seriesVideos.sort((a, b) => {
			const aInHistory = history.includes(a.key);
			const bInHistory = history.includes(b.key);
			if (aInHistory && !bInHistory) return 1;
			if (!aInHistory && bInHistory) return -1;

			const aCategoryMatch =
				a.categoryKey && watchedCategories.has(a.categoryKey);
			const bCategoryMatch =
				b.categoryKey && watchedCategories.has(b.categoryKey);
			if (aCategoryMatch && !bCategoryMatch) return -1;
			if (!aCategoryMatch && bCategoryMatch) return 1;

			return 0;
		});
	}

	return seriesVideos.slice(0, limit);
}

export function VideoFeed({ onVideoSelect }: VideoFeedProps) {
	const navigate = useNavigate();
	const [sections, setSections] = useState<VideoFeedSection[]>([
		{
			title: "For You",
			key: "for-you",
			videos: [],
			loading: true,
			hasMore: true,
			page: 1,
			type: "recommended",
		},
		{
			title: "New & Trending",
			key: "new",
			videos: [],
			loading: true,
			hasMore: true,
			page: 1,
			type: "recent",
		},
		{
			title: "Popular Now",
			key: "popular",
			videos: [],
			loading: true,
			hasMore: true,
			page: 1,
			type: "popular",
		},
		{
			title: "Continue Watching",
			key: "continue",
			videos: [],
			loading: true,
			hasMore: false,
			page: 1,
			type: "history",
		},
		{
			title: "Series & Episodes",
			key: "series",
			videos: [],
			loading: true,
			hasMore: true,
			page: 1,
			type: "series",
		},
	]);
	const [_allVideos, setAllVideos] = useState<Video[]>([]);
	const [hoveredVideo, setHoveredVideo] = useState<Video | null>(null);
	const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
	const longPressTimer = useRef<NodeJS.Timeout | null>(null);
	const observerRefs = useRef<Map<string, IntersectionObserver>>(new Map());

	// Load initial videos
	useEffect(() => {
		async function loadInitialData() {
			try {
				const [recent, _featured, paginated] = await Promise.all([
					getRecentlyPublished(50),
					getFeatured(),
					getVideos(1, 50),
				]);

				const combined = [
					...new Map(
						[...recent, ...paginated.videos].map((v) => [v.key, v]),
					).values(),
				];
				setAllVideos(combined);

				// Get watch history for continue watching
				const history = getWatchHistory();
				const continueVideos: Video[] = [];
				for (const key of history.slice(0, 10)) {
					const video = combined.find((v) => v.key === key);
					if (video) continueVideos.push(video);
				}

				// Get recommendations for "For You" section
				const recommended = getRecommendedVideos(combined, 20);
				const seriesVideos = getSeriesVideos(combined, 20);

				setSections((prev) =>
					prev.map((section) => {
						switch (section.key) {
							case "for-you":
								return { ...section, videos: recommended, loading: false };
							case "new":
								return {
									...section,
									videos: recent.slice(0, 20),
									loading: false,
								};
							case "popular":
								return {
									...section,
									videos: combined.slice(0, 20),
									loading: false,
								};
							case "continue":
								return {
									...section,
									videos: continueVideos,
									loading: false,
									hasMore: false,
								};
							case "series":
								return {
									...section,
									videos: seriesVideos,
									loading: false,
								};
							default:
								return section;
						}
					}),
				);
			} catch (error) {
				console.error("Failed to load videos:", error);
				setSections((prev) => prev.map((s) => ({ ...s, loading: false })));
			}
		}
		loadInitialData();
	}, []);

	// Infinite scroll handler
	const loadMoreVideos = useCallback(
		async (sectionKey: string) => {
			const section = sections.find((s) => s.key === sectionKey);
			if (!section?.hasMore || section.loading) return;

			setSections((prev) =>
				prev.map((s) => (s.key === sectionKey ? { ...s, loading: true } : s)),
			);

			try {
				const nextPage = section.page + 1;
				let newVideos: Video[] = [];

				switch (section.type) {
					case "recent": {
						const recent = await getRecentlyPublished(nextPage * 20);
						newVideos = recent.filter(
							(v) => !section.videos.some((ex) => ex.key === v.key),
						);
						break;
					}
					case "popular":
					case "recommended":
					case "series": {
						const result = await getVideos(nextPage, 20);
						newVideos = result.videos.filter(
							(v) => !section.videos.some((ex) => ex.key === v.key),
						);
						break;
					}
				}

				setSections((prev) =>
					prev.map((s) =>
						s.key === sectionKey
							? {
									...s,
									videos: [...s.videos, ...newVideos],
									page: nextPage,
									hasMore: newVideos.length === 20,
									loading: false,
								}
							: s,
					),
				);
			} catch (error) {
				console.error("Failed to load more videos:", error);
				setSections((prev) =>
					prev.map((s) =>
						s.key === sectionKey ? { ...s, loading: false } : s,
					),
				);
			}
		},
		[sections],
	);

	// Setup intersection observers for infinite scroll
	useEffect(() => {
		sections.forEach((section) => {
			if (section.key === "continue") return; // No infinite scroll for continue watching

			const observerId = `observer-${section.key}`;
			const sentinelId = `sentinel-${section.key}`;
			const sentinel = document.getElementById(sentinelId);

			if (sentinel) {
				// Clean up existing observer
				const existingObserver = observerRefs.current.get(observerId);
				if (existingObserver) {
					existingObserver.disconnect();
				}

				const observer = new IntersectionObserver(
					(entries) => {
						if (entries[0].isIntersecting && section.hasMore) {
							loadMoreVideos(section.key);
						}
					},
					{ rootMargin: "200px" },
				);

				observer.observe(sentinel);
				observerRefs.current.set(observerId, observer);
			}
		});

		return () => {
			observerRefs.current.forEach((observer) => observer.disconnect());
		};
	}, [sections, loadMoreVideos]);

	// Handle video card press (long press for preview on mobile)
	const handleCardPressStart = (video: Video) => {
		longPressTimer.current = setTimeout(() => {
			setHoveredVideo(video);
			if (video.key) {
				addToHistory(video.key);
			}
		}, 500); // 500ms for long press
	};

	const handleCardPressEnd = () => {
		if (longPressTimer.current) {
			clearTimeout(longPressTimer.current);
			longPressTimer.current = null;
		}
	};

	const handleCardClick = (video: Video) => {
		if (hoveredVideo) {
			setHoveredVideo(null);
			return;
		}
		if (video.key) {
			addToHistory(video.key);
		}
		onVideoSelect?.(video);
		navigate(`/video/${video.key}`);
	};

	// Mouse hover for desktop
	const handleMouseEnter = (video: Video) => {
		const timeout = setTimeout(() => {
			setHoveredVideo(video);
		}, 800); // 800ms hover for preview
		setHoverTimeout(timeout);
	};

	const handleMouseLeave = () => {
		if (hoverTimeout) {
			clearTimeout(hoverTimeout);
		}
		setHoveredVideo(null);
	};

	return (
		<div className="video-feed">
			{sections.map((section) => (
				<VideoFeedRow
					key={section.key}
					section={section}
					hoveredVideo={hoveredVideo}
					onCardPressStart={handleCardPressStart}
					onCardPressEnd={handleCardPressEnd}
					onCardClick={handleCardClick}
					onMouseEnter={handleMouseEnter}
					onMouseLeave={handleMouseLeave}
					sentinelId={`sentinel-${section.key}`}
					showProgress={section.type === "history"}
				/>
			))}

			{/* Hover Preview Overlay */}
			{hoveredVideo && (
				<div
					className="video-preview-overlay"
					onClick={() => setHoveredVideo(null)}
				>
					<div className="video-preview-card">
						<div className="video-preview-image">
							{hoveredVideo.thumbnailUrl ? (
								<img src={hoveredVideo.thumbnailUrl} alt={hoveredVideo.title} />
							) : (
								<div className="video-preview-placeholder">
									<svg
										width="48"
										height="48"
										viewBox="0 0 24 24"
										fill="currentColor"
										opacity="0.4"
									>
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
							)}
							<div className="video-preview-duration">
								{hoveredVideo.durationFormatted}
							</div>
							<button
								type="button"
								className="video-preview-play"
								onClick={(e) => {
									e.stopPropagation();
									setHoveredVideo(null);
									handleCardClick(hoveredVideo);
								}}
							>
								<svg
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="currentColor"
								>
									<path d="M8 5v14l11-7z" />
								</svg>
							</button>
						</div>
						<div className="video-preview-info">
							<h3 className="video-preview-title">{hoveredVideo.title}</h3>
							{hoveredVideo.description && (
								<p className="video-preview-description">
									{hoveredVideo.description.slice(0, 100)}
									{hoveredVideo.description.length > 100 ? "..." : ""}
								</p>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

interface VideoFeedRowProps {
	section: VideoFeedSection;
	hoveredVideo: Video | null;
	onCardPressStart: (video: Video) => void;
	onCardPressEnd: () => void;
	onCardClick: (video: Video) => void;
	onMouseEnter: (video: Video) => void;
	onMouseLeave: () => void;
	sentinelId: string;
	showProgress?: boolean;
}

function VideoFeedRow({
	section,
	hoveredVideo,
	onCardPressStart,
	onCardPressEnd,
	onCardClick,
	onMouseEnter,
	onMouseLeave,
	sentinelId,
	showProgress = false,
}: VideoFeedRowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);
	const historyProgress = showProgress ? getWatchHistoryWithProgress() : [];

	const updateScrollButtons = () => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 10);
		setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
	};

	const scroll = (direction: "left" | "right") => {
		const el = scrollRef.current;
		if (!el) return;
		const distance = el.clientWidth * 0.8;
		el.scrollBy({
			left: direction === "left" ? -distance : distance,
			behavior: "smooth",
		});
	};

	if (section.loading && section.videos.length === 0) {
		return (
			<div className="video-feed-section">
				<h2 className="feed-section-title">{section.title}</h2>
				<div className="feed-section-loading">
					<div className="feed-skeleton-card"></div>
					<div className="feed-skeleton-card"></div>
					<div className="feed-skeleton-card"></div>
					<div className="feed-skeleton-card"></div>
					<div className="feed-skeleton-card"></div>
				</div>
			</div>
		);
	}

	if (section.videos.length === 0) {
		return null;
	}

	return (
		<div className="video-feed-section">
			<div className="feed-section-header">
				<h2 className="feed-section-title">{section.title}</h2>
			</div>
			<div className="feed-carousel-wrapper">
				{canScrollLeft && (
					<button
						type="button"
						className="feed-carousel-btn left"
						onClick={() => scroll("left")}
						aria-label="Scroll left"
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
						</svg>
					</button>
				)}
				<div
					ref={scrollRef}
					className="feed-carousel-track"
					onScroll={updateScrollButtons}
				>
					{section.videos.map((video) => {
						const progressEntry = historyProgress.find(
							(h) => h.key === video.key,
						);
						const progress = progressEntry?.progress ?? 0;
						return (
							<div
								key={video.key}
								className="feed-video-card"
								onTouchStart={() => onCardPressStart(video)}
								onTouchEnd={onCardPressEnd}
								onTouchCancel={onCardPressEnd}
								onMouseEnter={() => onMouseEnter(video)}
								onMouseLeave={onMouseLeave}
								onClick={() => onCardClick(video)}
							>
								<div className="feed-video-image">
									{video.thumbnailUrl ? (
										<img
											src={video.thumbnailUrl}
											alt={video.title}
											loading="lazy"
										/>
									) : (
										<div className="feed-video-placeholder">
											<svg
												width="40"
												height="40"
												viewBox="0 0 24 24"
												fill="currentColor"
												opacity="0.4"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									)}
									<div className="feed-video-duration">
										{video.durationFormatted || formatDuration(video.duration)}
									</div>
									{showProgress && progress > 0 && (
										<div className="feed-video-progress">
											<div
												className="feed-video-progress-bar"
												style={{ width: `${progress}%` }}
											/>
										</div>
									)}
								</div>
								<div className="feed-video-info">
									<h3 className="feed-video-title">{video.title}</h3>
									{showProgress && progress > 0 && (
										<span className="feed-video-progress-text">
											{Math.round(progress)}% watched
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
				{canScrollRight && (
					<button
						type="button"
						className="feed-carousel-btn right"
						onClick={() => scroll("right")}
						aria-label="Scroll right"
					>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
						</svg>
					</button>
				)}
			</div>

			{/* Sentinel for infinite scroll */}
			{section.hasMore && section.key !== "continue" && (
				<div id={sentinelId} className="feed-scroll-sentinel">
					{section.loading && (
						<div className="feed-loading-more">Loading more...</div>
					)}
				</div>
			)}
		</div>
	);
}
