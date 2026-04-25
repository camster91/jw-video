import { Bell, BellOff, Calendar, Clock, Play, Tv } from "lucide-react";
import { useState } from "react";
import {
	isEventViewed,
	registerForLiveNotifications,
} from "../services/liveStream";
import type { LiveEvent } from "../types/live";
import "./LiveEventsCalendar.css";

interface LiveEventsCalendarProps {
	events: LiveEvent[];
	onWatchLive?: (event: LiveEvent) => void;
	onWatchReplay?: (event: LiveEvent) => void;
}

export function LiveEventsCalendar({
	events,
	onWatchLive,
	onWatchReplay,
}: LiveEventsCalendarProps) {
	const [registeredEvents, setRegisteredEvents] = useState<Set<string>>(
		new Set(),
	);

	const upcomingEvents = events.filter((e) => e.status === "upcoming");
	const liveEvents = events.filter((e) => e.status === "live");
	const endedEvents = events.filter((e) => e.status === "ended");

	const getTimeUntilStart = (startTime: string): string => {
		const now = Date.now();
		const start = new Date(startTime).getTime();
		const diff = start - now;

		if (diff <= 0) return "Starting now";
		if (diff < 60000) return "Less than a minute";
		if (diff < 3600000) {
			const minutes = Math.floor(diff / 60000);
			return `${minutes}m`;
		}
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			const minutes = Math.floor((diff % 3600000) / 60000);
			return `${hours}h ${minutes}m`;
		}
		const days = Math.floor(diff / 86400000);
		return `${days}d`;
	};

	const formatDate = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleDateString([], {
			weekday: "short",
			month: "short",
			day: "numeric",
		});
	};

	const formatTime = (dateString: string): string => {
		const date = new Date(dateString);
		return date.toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const handleRegisterNotification = (e: React.MouseEvent, eventId: string) => {
		e.stopPropagation();
		registerForLiveNotifications(eventId);
		setRegisteredEvents((prev) => new Set(prev).add(eventId));
	};

	const isRegistered = (eventId: string) => registeredEvents.has(eventId);
	const isViewed = (eventId: string) => isEventViewed(eventId);

	return (
		<div className="live-events-calendar">
			<div className="calendar-header">
				<h2>
					<Tv size={24} />
					Live Events
				</h2>
				<span className="calendar-subtitle">
					Don't miss upcoming broadcasts
				</span>
			</div>

			{/* Live Now Section */}
			{liveEvents.length > 0 && (
				<div className="events-section live-section">
					<div className="section-header">
						<span className="live-indicator">
							<span className="live-dot" />
							Live Now
						</span>
						<span className="section-count">{liveEvents.length}</span>
					</div>
					<div className="events-list">
						{liveEvents.map((event) => (
							<div
								key={event.id}
								className={`event-card live-event-card ${isViewed(event.id) ? "viewed" : ""}`}
								onClick={() => onWatchLive?.(event)}
							>
								<div className="event-thumbnail">
									{event.thumbnailUrl ? (
										<img src={event.thumbnailUrl} alt={event.title} />
									) : (
										<div className="thumbnail-placeholder">
											<Tv size={32} />
										</div>
									)}
									<div className="live-badge">
										<span className="live-dot" />
										LIVE
									</div>
									{event.viewerCount && (
										<div className="viewer-count-badge">
											{event.viewerCount.toLocaleString()} watching
										</div>
									)}
								</div>
								<div className="event-info">
									<h3 className="event-title">{event.title}</h3>
									{event.description && (
										<p className="event-description">{event.description}</p>
									)}
									<div className="event-meta">
										{event.categoryKey && (
											<span className="event-category">
												{event.categoryKey}
											</span>
										)}
									</div>
									<button
										type="button"
										className="btn-watch-live"
										onClick={(e) => {
											e.stopPropagation();
											onWatchLive?.(event);
										}}
									>
										<Play size={16} />
										<span>Watch Live</span>
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Upcoming Section */}
			{upcomingEvents.length > 0 && (
				<div className="events-section upcoming-section">
					<div className="section-header">
						<span className="section-title">
							<Calendar size={18} />
							Coming Soon
						</span>
					</div>
					<div className="events-list">
						{upcomingEvents.map((event) => {
							const timeUntil = getTimeUntilStart(event.startTime);
							const isStartingSoon =
								new Date(event.startTime).getTime() - Date.now() < 900000; // 15 min

							return (
								<div
									key={event.id}
									className={`event-card upcoming-event-card ${isStartingSoon ? "starting-soon" : ""}`}
								>
									<div className="event-thumbnail">
										{event.thumbnailUrl ? (
											<img src={event.thumbnailUrl} alt={event.title} />
										) : (
											<div className="thumbnail-placeholder">
												<Tv size={32} />
											</div>
										)}
										<div className="countdown-badge">
											<Clock size={12} />
											<span>{timeUntil}</span>
										</div>
									</div>
									<div className="event-info">
										<h3 className="event-title">{event.title}</h3>
										{event.description && (
											<p className="event-description">{event.description}</p>
										)}
										<div className="event-meta">
											<span className="event-date">
												{formatDate(event.startTime)}
											</span>
											<span className="event-time">
												{formatTime(event.startTime)}
											</span>
											{event.categoryKey && (
												<span className="event-category">
													{event.categoryKey}
												</span>
											)}
										</div>
										<div className="event-actions">
											<button
												type="button"
												className={`btn-notify ${isRegistered(event.id) ? "registered" : ""}`}
												onClick={(e) => handleRegisterNotification(e, event.id)}
												aria-label="Get notified"
											>
												{isRegistered(event.id) ? (
													<>
														<BellOff size={16} />
														<span>Notified</span>
													</>
												) : (
													<>
														<Bell size={16} />
														<span>Remind Me</span>
													</>
												)}
											</button>
											{isStartingSoon && (
												<span className="starting-soon-label">
													Starting soon!
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Past Events / Replays */}
			{endedEvents.length > 0 && (
				<div className="events-section past-section">
					<div className="section-header">
						<span className="section-title">Recent Replays</span>
					</div>
					<div className="events-list">
						{endedEvents.map((event) => (
							<div
								key={event.id}
								className={`event-card past-event-card ${isViewed(event.id) ? "viewed" : ""}`}
								onClick={() => {
									if (event.replayVideoKey) {
										onWatchReplay?.(event);
									}
								}}
							>
								<div className="event-thumbnail">
									{event.thumbnailUrl ? (
										<img src={event.thumbnailUrl} alt={event.title} />
									) : (
										<div className="thumbnail-placeholder">
											<Tv size={32} />
										</div>
									)}
									{event.replayVideoKey && (
										<div className="replay-badge">
											<Play size={12} />
											<span>Replay Available</span>
										</div>
									)}
								</div>
								<div className="event-info">
									<h3 className="event-title">{event.title}</h3>
									{event.description && (
										<p className="event-description">{event.description}</p>
									)}
									<div className="event-meta">
										<span className="event-date">
											{formatDate(event.startTime || "")}
										</span>
										{event.categoryKey && (
											<span className="event-category">
												{event.categoryKey}
											</span>
										)}
									</div>
									{event.replayVideoKey ? (
										<button
											type="button"
											className="btn-watch-replay"
											onClick={(e) => {
												e.stopPropagation();
												onWatchReplay?.(event);
											}}
										>
											<Play size={16} />
											<span>Watch Replay</span>
										</button>
									) : (
										<span className="no-replay-text">Replay coming soon</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{events.length === 0 && (
				<div className="no-events-state">
					<Tv size={48} className="no-events-icon" />
					<h3>No Live Events Scheduled</h3>
					<p>Check back later for upcoming broadcasts</p>
				</div>
			)}
		</div>
	);
}
