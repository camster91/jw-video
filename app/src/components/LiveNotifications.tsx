import { Bell, Check, Clock, Play, Tv, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
	checkUpcomingEvents,
	clearNotifications,
	getStoredNotifications,
	markNotificationAsRead,
	sendBrowserNotification,
} from "../services/liveStream";
import type { LiveNotification } from "../types/live";
import "./LiveNotifications.css";

interface LiveNotificationsProps {
	onNavigate?: (type: "live" | "upcoming" | "replay", eventId?: string) => void;
}

export function LiveNotifications({ onNavigate }: LiveNotificationsProps) {
	const [notifications, setNotifications] = useState<LiveNotification[]>([]);
	const [showDropdown, setShowDropdown] = useState(false);

	useEffect(() => {
		// Load notifications
		const stored = getStoredNotifications();
		setNotifications(stored);

		// Check for upcoming events periodically
		const checkInterval = setInterval(() => {
			const upcoming = checkUpcomingEvents();
			upcoming.forEach((event) => {
				sendBrowserNotification(
					"Starting Soon",
					`${event.title} starts in less than 15 minutes!`,
				);
			});
		}, 60000); // Check every minute

		return () => clearInterval(checkInterval);
	}, []);

	const handleMarkAsRead = (notificationId: string) => {
		markNotificationAsRead(notificationId);
		setNotifications((prev) =>
			prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
		);
	};

	const handleClearAll = () => {
		clearNotifications();
		setNotifications([]);
	};

	const handleNotificationClick = (notification: LiveNotification) => {
		handleMarkAsRead(notification.id);

		if (onNavigate) {
			switch (notification.type) {
				case "now_live":
					onNavigate("live", notification.eventId);
					break;
				case "starting_soon":
					onNavigate("upcoming", notification.eventId);
					break;
				case "replay_available":
					onNavigate("replay", notification.eventId);
					break;
			}
		}

		setShowDropdown(false);
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	const getNotificationIcon = (type: LiveNotification["type"]) => {
		switch (type) {
			case "now_live":
				return <Tv size={20} className="notif-icon-live" />;
			case "starting_soon":
				return <Clock size={20} className="notif-icon-soon" />;
			case "replay_available":
				return <Play size={20} className="notif-icon-replay" />;
		}
	};

	const formatTimeAgo = (timestamp: number): string => {
		const now = Date.now();
		const diff = now - timestamp;

		if (diff < 60000) return "Just now";
		if (diff < 3600000) {
			const minutes = Math.floor(diff / 60000);
			return `${minutes}m ago`;
		}
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			return `${hours}h ago`;
		}
		const days = Math.floor(diff / 86400000);
		return `${days}d ago`;
	};

	return (
		<div className="live-notifications">
			<button
				type="button"
				className="notif-trigger"
				onClick={() => setShowDropdown(!showDropdown)}
				aria-label="Live notifications"
			>
				<Bell size={20} />
				{unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
			</button>

			{showDropdown && (
				<div className="notif-dropdown">
					<div className="notif-header">
						<h3>Live Notifications</h3>
						<div className="notif-actions">
							{notifications.length > 0 && (
								<button
									type="button"
									className="btn-clear-all"
									onClick={handleClearAll}
								>
									Clear All
								</button>
							)}
							<button
								type="button"
								className="btn-close"
								onClick={() => setShowDropdown(false)}
							>
								<X size={18} />
							</button>
						</div>
					</div>

					<div className="notif-list">
						{notifications.length === 0 ? (
							<div className="notif-empty">
								<Bell size={32} />
								<p>No notifications yet</p>
								<span>You'll be notified when live events start</span>
							</div>
						) : (
							notifications.map((notification) => (
								<div
									key={notification.id}
									className={`notif-item ${notification.read ? "read" : ""}`}
									onClick={() => handleNotificationClick(notification)}
								>
									<div className="notif-icon">
										{getNotificationIcon(notification.type)}
									</div>
									<div className="notif-content">
										<p className="notif-message">{notification.message}</p>
										<span className="notif-event-title">
											{notification.eventTitle}
										</span>
										<span className="notif-time">
											{formatTimeAgo(notification.timestamp)}
										</span>
									</div>
									{!notification.read && (
										<button
											type="button"
											className="notif-mark-read"
											onClick={(e) => {
												e.stopPropagation();
												handleMarkAsRead(notification.id);
											}}
											aria-label="Mark as read"
										>
											<Check size={16} />
										</button>
									)}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
