import { Clock, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	getVideo,
	getWatchHistoryWithProgress,
	removeFromHistory,
	updateWatchProgress,
	type WatchHistoryEntry,
} from "../services/api";
import type { Video } from "../types";

interface ContinueWatchingProps {
	onVideoSelect?: (video: Video) => void;
	limit?: number;
}

export function ContinueWatching({
	onVideoSelect,
	limit = 10,
}: ContinueWatchingProps) {
	const navigate = useNavigate();
	const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const loadHistory = async () => {
		setLoading(true);
		const historyEntries = getWatchHistoryWithProgress().filter(
			(h) => h.progress != null && h.progress > 0 && h.progress < 95,
		);
		setHistory(historyEntries.slice(0, limit));

		// Load video data
		const videoPromises = historyEntries
			.slice(0, limit)
			.map((entry) => getVideo(entry.key));
		const loadedVideos = await Promise.all(videoPromises);
		setVideos(loadedVideos.filter(Boolean) as Video[]);
		setLoading(false);
	};

	const handleRemove = (videoKey: string) => {
		removeFromHistory(videoKey);
		loadHistory();
	};

	const handlePlay = (video: Video) => {
		onVideoSelect?.(video);
		navigate(`/video/${video.key}`);
	};

	if (loading) {
		return (
			<div className="continue-watching-section">
				<h3>Continue Watching</h3>
				<div className="continue-watching-loading">Loading...</div>
			</div>
		);
	}

	if (videos.length === 0) {
		return null; // Don't show section if no continue watching items
	}

	return (
		<div className="continue-watching-section">
			<div className="section-header">
				<h3>
					<Clock size={20} />
					Continue Watching
				</h3>
			</div>
			<div className="continue-watching-grid">
				{videos.map((video, _index) => {
					const entry = history.find((h) => h.key === video.key);
					const progress = entry?.progress || 0;
					const lastPosition = entry?.lastPosition || 0;

					return (
						<div key={video.key} className="continue-watching-card">
							<div
								className="continue-watching-thumbnail"
								onClick={() => handlePlay(video)}
							>
								{video.thumbnailUrl ? (
									<img src={video.thumbnailUrl} alt={video.title} />
								) : (
									<div className="thumbnail-placeholder" />
								)}
								<div className="play-overlay">
									<Play size={32} />
								</div>
								<div className="progress-bar-container">
									<div
										className="progress-bar"
										style={{ width: `${progress}%` }}
									/>
								</div>
								<span className="progress-text">{Math.round(progress)}%</span>
							</div>
							<div className="continue-watching-info">
								<h4 className="video-title" onClick={() => handlePlay(video)}>
									{video.title}
								</h4>
								{lastPosition > 0 && (
									<p className="time-remaining">
										{formatTime(lastPosition)} remaining
									</p>
								)}
							</div>
							<button
								type="button"
								className="remove-history-btn"
								onClick={() => handleRemove(video.key)}
								title="Remove from history"
							>
								<X size={16} />
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ─── Continue Watching Banner (for video detail page) ───────────────────────

interface ContinueWatchingBannerProps {
	videoKey: string;
	onResume: () => void;
}

export function ContinueWatchingBanner({
	videoKey,
	onResume,
}: ContinueWatchingBannerProps) {
	const [progress, setProgress] = useState<number | null>(null);
	const [lastPosition, setLastPosition] = useState<number | null>(null);

	useEffect(() => {
		const history = getWatchHistoryWithProgress();
		const entry = history.find((h) => h.key === videoKey);
		if (
			entry &&
			entry.progress != null &&
			entry.progress > 5 &&
			entry.progress < 95
		) {
			setProgress(entry.progress);
			setLastPosition(entry.lastPosition || 0);
		}
	}, [videoKey]);

	if (progress === null || progress === undefined) {
		return null;
	}

	return (
		<div className="continue-watching-banner">
			<div className="banner-content">
				<div className="banner-info">
					<span className="banner-icon">
						<Clock size={20} />
					</span>
					<span>
						You watched {Math.round(progress)}% •{" "}
						{lastPosition ? formatTime(lastPosition) : ""} remaining
					</span>
				</div>
				<button type="button" className="btn btn-resume" onClick={onResume}>
					<Play size={16} />
					Resume
				</button>
			</div>
			<div className="banner-progress">
				<div
					className="banner-progress-bar"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
}

// ─── Auto-save Watch Progress Hook ──────────────────────────────────────────

import { useEffect as useReactEffect } from "react";

export function useAutoSaveWatchProgress(
	videoKey: string,
	currentTime: number,
	duration: number,
	autoSaveInterval = 10000, // Save every 10 seconds
) {
	useReactEffect(() => {
		if (!videoKey || !duration || duration <= 0) return;

		const saveProgress = () => {
			const progress = (currentTime / duration) * 100;
			updateWatchProgress(videoKey, progress, duration - currentTime);
		};

		// Save immediately if there's progress
		if (currentTime > 0) {
			saveProgress();
		}

		// Set up interval for auto-save
		const interval = setInterval(saveProgress, autoSaveInterval);

		// Save on unmount
		return () => {
			saveProgress();
			clearInterval(interval);
		};
	}, [videoKey, currentTime, duration, autoSaveInterval]);
}

// ─── Watch History Section (for user profile/settings) ──────────────────────

interface WatchHistorySectionProps {
	limit?: number;
}

export function WatchHistorySection({ limit = 20 }: WatchHistorySectionProps) {
	const navigate = useNavigate();
	const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
	const [videos, setVideos] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const loadHistory = async () => {
		setLoading(true);
		const historyEntries = getWatchHistoryWithProgress().slice(0, limit);
		setHistory(historyEntries);

		const videoPromises = historyEntries.map((entry) => getVideo(entry.key));
		const loadedVideos = await Promise.all(videoPromises);
		setVideos(loadedVideos.filter(Boolean) as Video[]);
		setLoading(false);
	};

	const handleRemove = (videoKey: string) => {
		removeFromHistory(videoKey);
		loadHistory();
	};

	const handleClearAll = () => {
		if (confirm("Clear all watch history?")) {
			history.forEach((entry) => removeFromHistory(entry.key));
			loadHistory();
		}
	};

	if (loading) {
		return <div className="watch-history-section">Loading history...</div>;
	}

	return (
		<div className="watch-history-section">
			<div className="section-header">
				<h3>Watch History</h3>
				{videos.length > 0 && (
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={handleClearAll}
					>
						Clear All
					</button>
				)}
			</div>

			{videos.length === 0 ? (
				<p className="empty-hint">No watch history yet</p>
			) : (
				<div className="watch-history-list">
					{videos.map((video, index) => {
						const entry = history[index];
						const watchedAt = entry.watchedAt
							? new Date(entry.watchedAt).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									hour: "2-digit",
									minute: "2-digit",
								})
							: "";

						return (
							<div key={video.key} className="watch-history-item">
								<div
									className="history-video-info"
									onClick={() => navigate(`/video/${video.key}`)}
								>
									{video.thumbnailUrl && (
										<img
											src={video.thumbnailUrl}
											alt=""
											className="history-thumbnail"
										/>
									)}
									<div className="history-details">
										<h4>{video.title}</h4>
										<p className="history-meta">
											{watchedAt}
											{entry.progress != null && entry.progress >= 95 && (
												<span className="completed-badge">✓ Completed</span>
											)}
										</p>
									</div>
								</div>
								<button
									type="button"
									className="remove-history-btn"
									onClick={() => handleRemove(video.key)}
									title="Remove from history"
								>
									<X size={16} />
								</button>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function formatTime(seconds: number): string {
	if (seconds < 60) {
		return `${Math.round(seconds)}s`;
	}
	const mins = Math.floor(seconds / 60);
	const secs = Math.round(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}
