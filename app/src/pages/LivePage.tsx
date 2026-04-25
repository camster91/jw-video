import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveChat } from "../components/LiveChat";
import { LiveEventsCalendar } from "../components/LiveEventsCalendar";
import { LiveNotifications } from "../components/LiveNotifications";
import { LivePlayer } from "../components/LivePlayer";
import { getVideo } from "../services/api";
import { getFeaturedLiveEvent, getLiveEvents } from "../services/liveStream";
import type { LiveEvent } from "../types/live";
import "./LivePage.css";

export function LivePage() {
	const navigate = useNavigate();
	const [events, setEvents] = useState<LiveEvent[]>([]);
	const [featuredEvent, setFeaturedEvent] = useState<LiveEvent | null>(null);
	const [currentLiveEvent, setCurrentLiveEvent] = useState<LiveEvent | null>(
		null,
	);
	const [showChat, setShowChat] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadEvents();
	}, [loadEvents]);

	const loadEvents = async () => {
		setLoading(true);
		try {
			const [allEvents, featured] = await Promise.all([
				getLiveEvents(),
				getFeaturedLiveEvent(),
			]);
			setEvents(allEvents);
			setFeaturedEvent(featured);
		} catch (error) {
			console.error("Failed to load live events:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleWatchLive = (event: LiveEvent) => {
		if (event.status === "live") {
			setCurrentLiveEvent(event);
			setShowChat(true);
		}
	};

	const handleWatchReplay = async (event: LiveEvent) => {
		if (event.replayVideoKey) {
			const video = await getVideo(event.replayVideoKey);
			if (video) {
				navigate(`/video/${video.key}`);
			}
		}
	};

	const handleBackFromLive = () => {
		setCurrentLiveEvent(null);
		setShowChat(false);
	};

	const handleNavigateFromNotification = (
		type: "live" | "upcoming" | "replay",
		eventId?: string,
	) => {
		if (!eventId) return;
		const event = events.find((e) => e.id === eventId);
		if (!event) return;

		switch (type) {
			case "live":
				handleWatchLive(event);
				break;
			case "upcoming": {
				// Scroll to upcoming section
				const upcomingSection = document.querySelector(".upcoming-section");
				upcomingSection?.scrollIntoView({ behavior: "smooth" });
				break;
			}
			case "replay":
				handleWatchReplay(event);
				break;
		}
	};

	if (currentLiveEvent) {
		return (
			<div className="live-page live-page-player">
				<LivePlayer event={currentLiveEvent} onBack={handleBackFromLive} />
				{showChat && (
					<LiveChat
						eventId={currentLiveEvent.id}
						isOpen={showChat}
						onClose={() => setShowChat(false)}
					/>
				)}
			</div>
		);
	}

	return (
		<div className="live-page">
			{/* Hero Section */}
			<div className="live-hero">
				<div className="live-hero-content">
					<div className="live-hero-header">
						<h1>
							<span className="live-dot" />
							Live Streaming
						</h1>
						<LiveNotifications onNavigate={handleNavigateFromNotification} />
					</div>
					<p className="hero-description">
						Watch live events, conventions, and meetings as they happen. Join
						the community with live chat and never miss a broadcast.
					</p>
				</div>
			</div>

			{/* Featured Live Event */}
			{featuredEvent && featuredEvent.status === "live" && (
				<div className="featured-live-section">
					<div
						className="featured-live-card"
						onClick={() => handleWatchLive(featuredEvent)}
					>
						<div className="featured-thumbnail">
							{featuredEvent.thumbnailUrl ? (
								<img
									src={featuredEvent.thumbnailUrl}
									alt={featuredEvent.title}
								/>
							) : (
								<div className="thumbnail-placeholder" />
							)}
							<div className="live-badge-large">
								<span className="live-dot" />
								LIVE NOW
							</div>
							{featuredEvent.viewerCount && (
								<div className="viewer-count">
									{featuredEvent.viewerCount.toLocaleString()} watching
								</div>
							)}
						</div>
						<div className="featured-info">
							<h2>{featuredEvent.title}</h2>
							<p>{featuredEvent.description}</p>
							<div className="featured-actions">
								<button type="button" className="btn-watch-featured">
									<span>Watch Live</span>
								</button>
								<button
									type="button"
									className="btn-chat"
									onClick={(e) => {
										e.stopPropagation();
										handleWatchLive(featuredEvent);
										setShowChat(true);
									}}
								>
									💬 Open Chat
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Live Events Calendar */}
			<div className="calendar-section">
				{loading ? (
					<div className="loading-state">
						<div className="spinner" />
						<p>Loading live events...</p>
					</div>
				) : (
					<LiveEventsCalendar
						events={events}
						onWatchLive={handleWatchLive}
						onWatchReplay={handleWatchReplay}
					/>
				)}
			</div>
		</div>
	);
}
