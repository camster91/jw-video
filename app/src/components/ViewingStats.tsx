import { useEffect, useState } from "react";
import "./ViewingStats.css";
import {
	Award,
	BarChart3,
	Calendar,
	CalendarDays,
	Clock,
	Film,
	Flame,
	Star,
	Target,
	TrendingUp,
	Trophy,
	TV as Tv,
} from "lucide-react";
import {
	getCategories,
	getVideo,
	getWatchHistoryWithProgress,
	type WatchHistoryEntry,
} from "../services/api";
import type { Category, Video } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ViewingStatsData {
	totalWatchTime: number; // in seconds
	videosWatched: number;
	completedVideos: number;
	categories: { key: string; name: string; count: number; time: number }[];
	dailyActivity: { date: string; count: number; time: number }[];
	mostWatchedSeries: { title: string; count: number; time: number }[];
	achievements: Achievement[];
	currentStreak: number;
	longestStreak: number;
}

interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	earned: boolean;
	earnedAt?: number;
	rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

interface ViewingStatsProps {
	timeRange?: "daily" | "weekly" | "monthly" | "all";
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function ViewingStats({ timeRange = "all" }: ViewingStatsProps) {
	const [stats, setStats] = useState<ViewingStatsData | null>(null);
	const [loading, setLoading] = useState(true);
	const [selectedRange, setSelectedRange] = useState<
		"daily" | "weekly" | "monthly" | "all"
	>(timeRange);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	const loadStats = async () => {
		setLoading(true);
		const history = getWatchHistoryWithProgress();
		const filteredHistory = filterHistoryByRange(history, selectedRange);

		// Load video data for all history entries
		const videoData = await Promise.all(
			filteredHistory.map((entry) => getVideo(entry.key)),
		);
		const categories = await getCategories();

		const statsData = calculateStats(filteredHistory, videoData, categories);
		setStats(statsData);
		setLoading(false);
	};

	if (loading) {
		return (
			<div className="viewing-stats loading">
				<div className="stats-loading">Loading your viewing statistics...</div>
			</div>
		);
	}

	if (!stats || stats.videosWatched === 0) {
		return (
			<div className="viewing-stats empty">
				<div className="empty-stats">
					<BarChart3 size={48} />
					<h3>No Viewing Data Yet</h3>
					<p>Start watching videos to see your viewing statistics!</p>
				</div>
			</div>
		);
	}

	return (
		<div className="viewing-stats">
			<div className="stats-header">
				<h2>
					<BarChart3 size={24} />
					Viewing Statistics
				</h2>
				<div className="time-range-selector">
					<button
						type="button"
						className={selectedRange === "daily" ? "active" : ""}
						onClick={() => setSelectedRange("daily")}
					>
						Daily
					</button>
					<button
						type="button"
						className={selectedRange === "weekly" ? "active" : ""}
						onClick={() => setSelectedRange("weekly")}
					>
						Weekly
					</button>
					<button
						type="button"
						className={selectedRange === "monthly" ? "active" : ""}
						onClick={() => setSelectedRange("monthly")}
					>
						Monthly
					</button>
					<button
						type="button"
						className={selectedRange === "all" ? "active" : ""}
						onClick={() => setSelectedRange("all")}
					>
						All Time
					</button>
				</div>
			</div>

			{/* Overview Cards */}
			<div className="stats-overview">
				<div className="stat-card">
					<div className="stat-icon clock">
						<Clock size={24} />
					</div>
					<div className="stat-details">
						<span className="stat-value">
							{formatWatchTime(stats.totalWatchTime)}
						</span>
						<span className="stat-label">Total Watch Time</span>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-icon film">
						<Film size={24} />
					</div>
					<div className="stat-details">
						<span className="stat-value">{stats.videosWatched}</span>
						<span className="stat-label">Videos Watched</span>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-icon star">
						<Star size={24} />
					</div>
					<div className="stat-details">
						<span className="stat-value">{stats.completedVideos}</span>
						<span className="stat-label">Completed</span>
					</div>
				</div>
				<div className="stat-card">
					<div className="stat-icon flame">
						<Flame size={24} />
					</div>
					<div className="stat-details">
						<span className="stat-value">{stats.currentStreak} days</span>
						<span className="stat-label">Current Streak</span>
					</div>
				</div>
			</div>

			{/* Favorite Categories */}
			<div className="stats-section">
				<h3>
					<TrendingUp size={20} />
					Favorite Categories
				</h3>
				<div className="categories-chart">
					{stats.categories.slice(0, 5).map((cat, index) => {
						const maxTime = Math.max(...stats.categories.map((c) => c.time));
						const percentage = maxTime > 0 ? (cat.time / maxTime) * 100 : 0;
						return (
							<div key={cat.key} className="category-bar">
								<div className="category-info">
									<span className="category-rank">#{index + 1}</span>
									<span className="category-name">{cat.name}</span>
									<span className="category-count">{cat.count} videos</span>
								</div>
								<div className="category-progress">
									<div
										className="category-progress-bar"
										style={{ width: `${percentage}%` }}
									/>
								</div>
								<span className="category-time">
									{formatWatchTime(cat.time)}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Viewing History Calendar */}
			<div className="stats-section">
				<h3>
					<CalendarDays size={20} />
					Viewing Activity Calendar
				</h3>
				<div className="activity-calendar">
					{renderActivityCalendar(stats.dailyActivity)}
				</div>
			</div>

			{/* Most Watched Series */}
			<div className="stats-section">
				<h3>
					<TV size={20} />
					Most Watched Series
				</h3>
				<div className="series-list">
					{stats.mostWatchedSeries.slice(0, 5).map((series, index) => (
						<div key={series.title} className="series-item">
							<span className="series-rank">#{index + 1}</span>
							<div className="series-details">
								<span className="series-title">{series.title}</span>
								<span className="series-meta">
									{series.count} episodes • {formatWatchTime(series.time)}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Daily/Weekly/Monthly Reports */}
			<div className="stats-section">
				<h3>
					<Calendar size={20} />
					{selectedRange === "daily"
						? "Daily"
						: selectedRange === "weekly"
							? "Weekly"
							: "Monthly"}{" "}
					Report
				</h3>
				<div className="time-report">
					{renderTimeReport(stats.dailyActivity, selectedRange)}
				</div>
			</div>

			{/* Achievement Badges */}
			<div className="stats-section">
				<h3>
					<Trophy size={20} />
					Achievement Badges
				</h3>
				<div className="achievements-grid">
					{stats.achievements.map((achievement) => (
						<div
							key={achievement.id}
							className={`achievement-badge ${achievement.earned ? "earned" : "locked"} ${achievement.rarity}`}
						>
							<div className="achievement-icon">
								{getAchievementIcon(achievement.icon)}
							</div>
							<div className="achievement-info">
								<span className="achievement-name">{achievement.name}</span>
								<span className="achievement-description">
									{achievement.description}
								</span>
								{achievement.earned && achievement.earnedAt && (
									<span className="achievement-earned">
										Earned {new Date(achievement.earnedAt).toLocaleDateString()}
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function filterHistoryByRange(
	history: WatchHistoryEntry[],
	range: "daily" | "weekly" | "monthly" | "all",
): WatchHistoryEntry[] {
	const now = Date.now();
	const oneDay = 24 * 60 * 60 * 1000;

	switch (range) {
		case "daily":
			return history.filter((h) => now - h.watchedAt < oneDay);
		case "weekly":
			return history.filter((h) => now - h.watchedAt < oneDay * 7);
		case "monthly":
			return history.filter((h) => now - h.watchedAt < oneDay * 30);
		default:
			return history;
	}
}

function calculateStats(
	history: WatchHistoryEntry[],
	videos: (Video | null)[],
	categories: Category[],
): ViewingStatsData {
	// Calculate total watch time and videos watched
	let totalWatchTime = 0;
	let completedVideos = 0;
	const categoryStats = new Map<
		string,
		{ name: string; count: number; time: number }
	>();
	const seriesStats = new Map<string, { count: number; time: number }>();
	const dailyActivity = new Map<string, { count: number; time: number }>();

	history.forEach((entry, index) => {
		const video = videos[index];
		if (!video) return;

		// Calculate watch time (estimate based on progress)
		const estimatedDuration = entry.lastPosition || 1800; // Default 30 min
		const watchTime = ((entry.progress || 0) / 100) * estimatedDuration;
		totalWatchTime += watchTime;

		// Count completed videos
		if ((entry.progress || 0) >= 95) {
			completedVideos++;
		}

		// Category stats
		if (video.categoryKey) {
			const category = categories.find((c) => c.key === video.categoryKey);
			const categoryName = category?.name || video.categoryKey;
			const existing = categoryStats.get(video.categoryKey) || {
				name: categoryName,
				count: 0,
				time: 0,
			};
			existing.count++;
			existing.time += watchTime;
			categoryStats.set(video.categoryKey, existing);
		}

		// Series stats (group by title)
		const existingSeries = seriesStats.get(video.title) || {
			count: 0,
			time: 0,
		};
		existingSeries.count++;
		existingSeries.time += watchTime;
		seriesStats.set(video.title, existingSeries);

		// Daily activity
		const dateKey = new Date(entry.watchedAt).toISOString().split("T")[0];
		const existingDaily = dailyActivity.get(dateKey) || { count: 0, time: 0 };
		existingDaily.count++;
		existingDaily.time += watchTime;
		dailyActivity.set(dateKey, existingDaily);
	});

	// Calculate streaks
	const { currentStreak, longestStreak } = calculateStreaks(history);

	// Convert maps to arrays and sort
	const categoriesArray = Array.from(categoryStats.entries())
		.map(([key, data]) => ({ key, ...data }))
		.sort((a, b) => b.time - a.time);

	const seriesArray = Array.from(seriesStats.entries())
		.map(([title, data]) => ({ title, ...data }))
		.sort((a, b) => b.time - a.time);

	const dailyArray = Array.from(dailyActivity.entries())
		.map(([date, data]) => ({ date, ...data }))
		.sort((a, b) => a.date.localeCompare(b.date));

	// Generate achievements
	const achievements = generateAchievements(
		history,
		totalWatchTime,
		completedVideos,
		currentStreak,
		videos.length,
	);

	return {
		totalWatchTime,
		videosWatched: history.length,
		completedVideos,
		categories: categoriesArray,
		dailyActivity: dailyArray,
		mostWatchedSeries: seriesArray,
		achievements,
		currentStreak,
		longestStreak,
	};
}

function calculateStreaks(history: WatchHistoryEntry[]): {
	currentStreak: number;
	longestStreak: number;
} {
	if (history.length === 0) {
		return { currentStreak: 0, longestStreak: 0 };
	}

	const uniqueDates = new Set(
		history.map((h) => new Date(h.watchedAt).toISOString().split("T")[0]),
	);
	const sortedDates = Array.from(uniqueDates).sort().reverse();

	if (sortedDates.length === 0) {
		return { currentStreak: 0, longestStreak: 0 };
	}

	// Calculate current streak
	let currentStreak = 0;
	const today = new Date().toISOString().split("T")[0];
	const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
		.toISOString()
		.split("T")[0];

	if (sortedDates[0] === today || sortedDates[0] === yesterday) {
		currentStreak = 1;
		for (let i = 1; i < sortedDates.length; i++) {
			const prevDate = new Date(sortedDates[i - 1]);
			const currDate = new Date(sortedDates[i]);
			const diff = Math.floor(
				(prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000),
			);
			if (diff === 1) {
				currentStreak++;
			} else {
				break;
			}
		}
	}

	// Calculate longest streak
	let longestStreak = 1;
	let tempStreak = 1;
	for (let i = sortedDates.length - 1; i > 0; i--) {
		const prevDate = new Date(sortedDates[i]);
		const currDate = new Date(sortedDates[i - 1]);
		const diff = Math.floor(
			(currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000),
		);
		if (diff === 1) {
			tempStreak++;
			longestStreak = Math.max(longestStreak, tempStreak);
		} else {
			tempStreak = 1;
		}
	}

	return { currentStreak, longestStreak };
}

function generateAchievements(
	_history: WatchHistoryEntry[],
	totalWatchTime: number,
	completedVideos: number,
	currentStreak: number,
	videosWatched: number,
): Achievement[] {
	const hoursWatched = totalWatchTime / 3600;
	const achievements: Achievement[] = [
		{
			id: "first_video",
			name: "First Steps",
			description: "Watch your first video",
			icon: "play",
			earned: videosWatched >= 1,
			rarity: "common",
		},
		{
			id: "binge_watcher",
			name: "Binge Watcher",
			description: "Watch 10 videos",
			icon: "film",
			earned: videosWatched >= 10,
			rarity: "common",
		},
		{
			id: "dedicated_viewer",
			name: "Dedicated Viewer",
			description: "Watch 50 videos",
			icon: "tv",
			earned: videosWatched >= 50,
			rarity: "uncommon",
		},
		{
			id: "hour_one",
			name: "One Hour Club",
			description: "Watch for 1 hour total",
			icon: "clock",
			earned: hoursWatched >= 1,
			rarity: "common",
		},
		{
			id: "marathon_viewer",
			name: "Marathon Viewer",
			description: "Watch for 10 hours total",
			icon: "clock",
			earned: hoursWatched >= 10,
			rarity: "uncommon",
		},
		{
			id: "legendary_viewer",
			name: "Legendary Viewer",
			description: "Watch for 100 hours total",
			icon: "crown",
			earned: hoursWatched >= 100,
			rarity: "legendary",
		},
		{
			id: "completist",
			name: "Completist",
			description: "Complete 10 videos",
			icon: "check",
			earned: completedVideos >= 10,
			rarity: "uncommon",
		},
		{
			id: "streak_starter",
			name: "Streak Starter",
			description: "Maintain a 3-day streak",
			icon: "flame",
			earned: currentStreak >= 3,
			rarity: "uncommon",
		},
		{
			id: "streak_master",
			name: "Streak Master",
			description: "Maintain a 7-day streak",
			icon: "fire",
			earned: currentStreak >= 7,
			rarity: "rare",
		},
		{
			id: "unstoppable",
			name: "Unstoppable",
			description: "Maintain a 30-day streak",
			icon: "trophy",
			earned: currentStreak >= 30,
			rarity: "epic",
		},
	];

	return achievements;
}

function formatWatchTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);

	if (hours >= 100) {
		return `${Math.round(hours / 10) / 10}h`;
	}
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}

function getAchievementIcon(icon: string): React.JSX.Element {
	switch (icon) {
		case "play":
			return <Clock size={24} />;
		case "film":
			return <Film size={24} />;
		case "tv":
			return <Tv size={24} />;
		case "clock":
			return <Clock size={24} />;
		case "crown":
			return <Award size={24} />;
		case "check":
			return <Target size={24} />;
		case "flame":
			return <Flame size={24} />;
		case "fire":
			return <Flame size={28} />;
		case "trophy":
			return <Trophy size={24} />;
		default:
			return <Star size={24} />;
	}
}

function renderActivityCalendar(
	dailyActivity: { date: string; count: number; time: number }[],
): React.JSX.Element {
	const today = new Date();
	const weeks: React.JSX.Element[] = [];
	const maxCount = Math.max(...dailyActivity.map((d) => d.count), 1);

	// Generate last 12 weeks
	for (let week = 11; week >= 0; week--) {
		const weekStart = new Date(today);
		weekStart.setDate(weekStart.getDate() - (week * 7 + weekStart.getDay()));
		weekStart.setHours(0, 0, 0, 0);

		const days: React.JSX.Element[] = [];
		for (let day = 0; day < 7; day++) {
			const currentDate = new Date(weekStart);
			currentDate.setDate(currentDate.getDate() + day);
			const dateKey = currentDate.toISOString().split("T")[0];
			const activity = dailyActivity.find((d) => d.date === dateKey);
			const intensity = activity
				? Math.ceil((activity.count / maxCount) * 4)
				: 0;

			days.push(
				<div
					key={dateKey}
					className={`calendar-day level-${intensity}`}
					title={`${dateKey}: ${activity?.count || 0} videos, ${activity ? formatWatchTime(activity.time) : "0m"}`}
				/>,
			);
		}

		weeks.push(
			<div key={week} className="calendar-week">
				{days}
			</div>,
		);
	}

	return <div className="calendar-grid">{weeks}</div>;
}

function renderTimeReport(
	dailyActivity: { date: string; count: number; time: number }[],
	range: "daily" | "weekly" | "monthly" | "all",
): React.JSX.Element {
	const groupedData: { label: string; count: number; time: number }[] = [];

	if (range === "daily") {
		// Group by hour
		const hours = new Map<number, { count: number; time: number }>();
		dailyActivity.forEach((day) => {
			const hour = new Date(day.date).getHours();
			const existing = hours.get(hour) || { count: 0, time: 0 };
			existing.count += day.count;
			existing.time += day.time;
			hours.set(hour, existing);
		});
		for (let i = 0; i < 24; i++) {
			const data = hours.get(i) || { count: 0, time: 0 };
			groupedData.push({ label: `${i}:00`, ...data });
		}
	} else if (range === "weekly") {
		// Group by day of week
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const dayMap = new Map<number, { count: number; time: number }>();
		dailyActivity.forEach((day) => {
			const dayOfWeek = new Date(day.date).getDay();
			const existing = dayMap.get(dayOfWeek) || { count: 0, time: 0 };
			existing.count += day.count;
			existing.time += day.time;
			dayMap.set(dayOfWeek, existing);
		});
		days.forEach((day, index) => {
			const data = dayMap.get(index) || { count: 0, time: 0 };
			groupedData.push({ label: day, ...data });
		});
	} else {
		// Group by week or month
		const weeks = new Map<string, { count: number; time: number }>();
		dailyActivity.forEach((day) => {
			const date = new Date(day.date);
			const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
			const existing = weeks.get(weekKey) || { count: 0, time: 0 };
			existing.count += day.count;
			existing.time += day.time;
			weeks.set(weekKey, existing);
		});
		Array.from(weeks.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.slice(-12)
			.forEach(([label, data]) => {
				groupedData.push({ label, ...data });
			});
	}

	const maxValue = Math.max(...groupedData.map((d) => d.time), 1);

	return (
		<div className="time-report-chart">
			{groupedData.map((item, index) => {
				const percentage = (item.time / maxValue) * 100;
				return (
					<div key={index} className="report-bar-container">
						<div className="report-label">{item.label}</div>
						<div className="report-bar">
							<div
								className="report-bar-fill"
								style={{ height: `${percentage}%` }}
							/>
						</div>
						<div className="report-value">{formatWatchTime(item.time)}</div>
					</div>
				);
			})}
		</div>
	);
}
