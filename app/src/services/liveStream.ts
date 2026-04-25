import type {
	LiveChatMessage,
	LiveEvent,
	LiveNotification,
} from "../types/live";

const STORAGE_KEY = "jw_live_notifications";
const VIEWED_EVENTS_KEY = "jw_viewed_live_events";

// Mock live events data
const MOCK_LIVE_EVENTS: LiveEvent[] = [
	{
		id: "live-001",
		title: "Annual Convention 2026 - Day 1",
		description:
			"Watch the first day of our annual convention featuring inspiring talks and demonstrations.",
		thumbnailUrl: "https://picsum.photos/seed/convention1/640/360",
		posterUrl: "https://picsum.photos/seed/convention1/1280/720",
		startTime: new Date(Date.now() - 1800000).toISOString(), // Started 30 min ago
		status: "live",
		streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
		qualities: [
			{ label: "1080p", height: 1080, bitrate: 5000000, url: "" },
			{ label: "720p", height: 720, bitrate: 2500000, url: "" },
			{ label: "480p", height: 480, bitrate: 1000000, url: "" },
			{ label: "360p", height: 360, bitrate: 500000, url: "" },
		],
		viewerCount: 12453,
		categoryKey: "conventions",
		isFeatured: true,
	},
	{
		id: "live-002",
		title: "Bible Reading - Genesis Chapter 1-5",
		description: "Follow along with our daily Bible reading program.",
		thumbnailUrl: "https://picsum.photos/seed/bible1/640/360",
		posterUrl: "https://picsum.photos/seed/bible1/1280/720",
		startTime: new Date(Date.now() + 3600000).toISOString(), // Starts in 1 hour
		status: "upcoming",
		categoryKey: "bible-reading",
		isFeatured: false,
	},
	{
		id: "live-003",
		title: "Midweek Meeting Highlights",
		description:
			"Special presentation of this week's midweek meeting treasures.",
		thumbnailUrl: "https://picsum.photos/seed/meeting1/640/360",
		posterUrl: "https://picsum.photos/seed/meeting1/1280/720",
		startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		endTime: new Date(Date.now() + 90000000).toISOString(),
		status: "upcoming",
		categoryKey: "meetings",
		isFeatured: true,
	},
	{
		id: "live-004",
		title: "Convention 2025 - Replay",
		description: "Last year's convention - now available as replay.",
		thumbnailUrl: "https://picsum.photos/seed/convention2/640/360",
		posterUrl: "https://picsum.photos/seed/convention2/1280/720",
		startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
		endTime: new Date(Date.now() - 82800000).toISOString(),
		status: "ended",
		replayVideoKey: "conv-2025-replay",
		categoryKey: "conventions",
		isFeatured: false,
	},
	{
		id: "live-005",
		title: "Special Assembly - Faith in Action",
		description:
			"An inspiring assembly focusing on faith examples from around the world.",
		thumbnailUrl: "https://picsum.photos/seed/assembly1/640/360",
		posterUrl: "https://picsum.photos/seed/assembly1/1280/720",
		startTime: new Date(Date.now() + 172800000).toISOString(), // In 2 days
		status: "upcoming",
		categoryKey: "assemblies",
		isFeatured: true,
	},
];

// Mock chat messages generator
const MOCK_CHAT_USERS = [
	{ username: "FaithfulServant", isVerified: true },
	{ username: "BibleStudent2026", isVerified: false },
	{ username: "KingdomProclaimer", isVerified: true },
	{ username: "TruthSeeker", isVerified: false },
	{ username: "PioneerLife", isVerified: false },
	{ username: "ElderJohn", isModerator: true, isVerified: true },
	{ username: "BethelVolunteer", isVerified: false },
	{ username: "CircuitOverseer", isModerator: true, isVerified: true },
];

const MOCK_CHAT_MESSAGES = [
	"Great encouragement today!",
	"Amen to that!",
	"Thank you for this spiritual food",
	"Watching from Brazil! 🇧🇷",
	"Watching from Philippines! 🇵🇭",
	"Watching from USA! 🇺🇸",
	"Watching from Nigeria! 🇳🇬",
	"Watching from Japan! 🇯🇵",
	"Jehovah bless this convention",
	"So uplifting!",
	"Can't wait for the next talk",
	"The illustrations were so clear",
	"Really touched my heart",
	"Sharing this with my family",
	"Love the new song!",
];

export async function getLiveEvents(): Promise<LiveEvent[]> {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 300));
	return [...MOCK_LIVE_EVENTS];
}

export async function getFeaturedLiveEvent(): Promise<LiveEvent | null> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	const live = MOCK_LIVE_EVENTS.filter((e) => e.status === "live");
	return live.find((e) => e.isFeatured) || live[0] || null;
}

export async function getUpcomingLiveEvents(): Promise<LiveEvent[]> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	return MOCK_LIVE_EVENTS.filter((e) => e.status === "upcoming");
}

export async function getLiveEventById(id: string): Promise<LiveEvent | null> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	return MOCK_LIVE_EVENTS.find((e) => e.id === id) || null;
}

export async function getReplayForEvent(
	eventId: string,
): Promise<LiveEvent | null> {
	await new Promise((resolve) => setTimeout(resolve, 200));
	const event = MOCK_LIVE_EVENTS.find((e) => e.id === eventId);
	if (event?.status === "ended" && event.replayVideoKey) {
		// In real app, fetch VOD details
		return {
			...event,
			title: `${event.title} (Replay)`,
			status: "ended",
		};
	}
	return null;
}

// Chat functionality (mock)
export async function sendChatMessage(
	_eventId: string,
	message: string,
): Promise<LiveChatMessage> {
	await new Promise((resolve) => setTimeout(resolve, 100));

	const newMessage: LiveChatMessage = {
		id: `msg-${Date.now()}`,
		userId: "current-user",
		username: "You",
		message,
		timestamp: Date.now(),
	};

	return newMessage;
}

export function simulateLiveChat(
	_eventId: string,
	callback: (message: LiveChatMessage) => void,
): () => void {
	let active = true;
	const interval = setInterval(
		() => {
			if (!active) return;

			const user =
				MOCK_CHAT_USERS[Math.floor(Math.random() * MOCK_CHAT_USERS.length)];
			const message =
				MOCK_CHAT_MESSAGES[
					Math.floor(Math.random() * MOCK_CHAT_MESSAGES.length)
				];

			const chatMessage: LiveChatMessage = {
				id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				userId: `user-${Math.random().toString(36).substr(2, 9)}`,
				username: user.username,
				message,
				timestamp: Date.now(),
				isModerator: user.isModerator,
				isVerified: user.isVerified,
			};

			callback(chatMessage);
		},
		3000 + Math.random() * 5000,
	); // New message every 3-8 seconds

	return () => {
		active = false;
		clearInterval(interval);
	};
}

// Notification management
export function registerForLiveNotifications(eventId: string): void {
	const notifications = getStoredNotifications();

	// Check if already registered
	if (notifications.some((n) => n.eventId === eventId)) {
		return;
	}

	// Request notification permission
	if ("Notification" in window && Notification.permission === "default") {
		Notification.requestPermission();
	}

	// Store notification preference
	const event = MOCK_LIVE_EVENTS.find((e) => e.id === eventId);
	if (event) {
		notifications.push({
			id: `notif-${Date.now()}`,
			eventId,
			eventTitle: event.title,
			message: "You'll be notified when this event goes live",
			type: "now_live",
			timestamp: Date.now(),
			read: false,
		});
		saveNotifications(notifications);
	}
}

export function getStoredNotifications(): LiveNotification[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

export function markNotificationAsRead(notificationId: string): void {
	const notifications = getStoredNotifications();
	const updated = notifications.map((n) =>
		n.id === notificationId ? { ...n, read: true } : n,
	);
	saveNotifications(updated);
}

export function clearNotifications(): void {
	localStorage.removeItem(STORAGE_KEY);
}

function saveNotifications(notifications: LiveNotification[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
	} catch {
		// Storage might be full or unavailable
	}
}

// Check for events starting soon (within 15 minutes)
export function checkUpcomingEvents(): LiveEvent[] {
	const now = Date.now();
	const soonWindow = 15 * 60 * 1000; // 15 minutes

	return MOCK_LIVE_EVENTS.filter((event) => {
		if (event.status !== "upcoming") return false;
		const startTime = new Date(event.startTime).getTime();
		const timeUntilStart = startTime - now;
		return timeUntilStart > 0 && timeUntilStart <= soonWindow;
	});
}

// Send browser notification
export function sendBrowserNotification(
	title: string,
	body: string,
	icon?: string,
): void {
	if (!("Notification" in window)) return;

	if (Notification.permission === "granted") {
		new Notification(title, {
			body,
			icon: icon || "/icon-192.png",
			tag: "jw-live-stream",
			requireInteraction: false,
		});
	}
}

// Mark event as viewed
export function markEventAsViewed(eventId: string): void {
	try {
		const viewed = JSON.parse(localStorage.getItem(VIEWED_EVENTS_KEY) || "[]");
		if (!viewed.includes(eventId)) {
			viewed.push(eventId);
			localStorage.setItem(VIEWED_EVENTS_KEY, JSON.stringify(viewed));
		}
	} catch {
		// Ignore storage errors
	}
}

export function isEventViewed(eventId: string): boolean {
	try {
		const viewed = JSON.parse(localStorage.getItem(VIEWED_EVENTS_KEY) || "[]");
		return viewed.includes(eventId);
	} catch {
		return false;
	}
}
