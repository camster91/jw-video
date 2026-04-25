import { Clipboard } from "@capacitor/clipboard";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

/**
 * Sharing Service - Handles video link sharing, timestamp sharing, and watch together
 */

export interface ShareOptions {
	videoId: string;
	title: string;
	timestamp?: number;
	thumbnailUrl?: string;
}

export interface ShareResult {
	success: boolean;
	platform?: string;
	error?: string;
}

export interface WatchTogetherSession {
	id: string;
	hostId: string;
	videoId: string;
	title: string;
	currentTime: number;
	isPlaying: boolean;
	participants: Participant[];
	createdAt: number;
}

export interface Participant {
	id: string;
	name: string;
	joinedAt: number;
	isReady: boolean;
}

export type WatchTogetherListener = (
	session: WatchTogetherSession | null,
) => void;

class SharingServiceClass {
	private watchTogetherSession: WatchTogetherSession | null = null;
	private watchTogetherListeners: Set<WatchTogetherListener> = new Set();

	/**
	 * Generate a shareable video link
	 */
	generateVideoLink(videoId: string, timestamp?: number): string {
		const baseUrl = window.location.origin;
		const path = `/watch/${videoId}`;
		const params = new URLSearchParams();

		if (timestamp && timestamp > 0) {
			params.set("t", Math.floor(timestamp).toString());
		}

		const queryString = params.toString();
		return `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;
	}

	/**
	 * Generate embed code for a video
	 */
	generateEmbedCode(
		videoId: string,
		timestamp?: number,
		options?: EmbedOptions,
	): string {
		const {
			width = 640,
			height = 360,
			autoplay = false,
			controls = true,
		} = options || {};

		const link = this.generateVideoLink(videoId, timestamp);
		const embedUrl = `${link}&embed=1`;

		return `<iframe
	src="${embedUrl}"
	width="${width}"
	height="${height}"
	frameborder="0"
	allowfullscreen
	allow="autoplay; fullscreen"
	${autoplay ? 'autoplay="1"' : ""}
	${!controls ? 'controls="0"' : ""}
></iframe>`;
	}

	/**
	 * Share video using native share dialog
	 */
	async shareVideo(options: ShareOptions): Promise<ShareResult> {
		try {
			const link = this.generateVideoLink(options.videoId, options.timestamp);
			const text = this.getShareText(options);

			// Use Capacitor Share plugin for native sharing
			if (Capacitor.isNativePlatform()) {
				await Share.share({
					title: options.title,
					text: text,
					url: link,
					dialogTitle: "Share Video",
				});

				return { success: true, platform: "native" };
			}

			// Web Share API fallback
			if (navigator.share) {
				await navigator.share({
					title: options.title,
					text: text,
					url: link,
				});

				return { success: true, platform: "web-share" };
			}

			// Fallback to clipboard
			await this.copyToClipboard(link);
			return {
				success: true,
				platform: "clipboard",
			};
		} catch (error) {
			console.error("Share error:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Share failed",
			};
		}
	}

	/**
	 * Share video with specific timestamp
	 */
	async shareTimestamp(
		videoId: string,
		title: string,
		timestamp: number,
		thumbnailUrl?: string,
	): Promise<ShareResult> {
		return this.shareVideo({
			videoId,
			title: `${title} (at ${this.formatTimestamp(timestamp)})`,
			timestamp,
			thumbnailUrl,
		});
	}

	/**
	 * Copy video link to clipboard
	 */
	async copyToClipboard(text: string): Promise<boolean> {
		try {
			if (Capacitor.isNativePlatform()) {
				await Clipboard.write({ string: text });
			} else {
				await navigator.clipboard.writeText(text);
			}
			return true;
		} catch (error) {
			console.error("Clipboard error:", error);
			return false;
		}
	}

	/**
	 * Copy embed code to clipboard
	 */
	async copyEmbedCode(
		videoId: string,
		options?: EmbedOptions,
	): Promise<boolean> {
		const embedCode = this.generateEmbedCode(videoId, undefined, options);
		return this.copyToClipboard(embedCode);
	}

	/**
	 * Get share text based on platform
	 */
	private getShareText(options: ShareOptions): string {
		let text = `Check out "${options.title}"`;

		if (options.timestamp) {
			text += ` starting at ${this.formatTimestamp(options.timestamp)}`;
		}

		text += " on JW Video!";
		return text;
	}

	/**
	 * Format timestamp for display
	 */
	private formatTimestamp(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);

		if (h > 0) {
			return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		}
		return `${m}:${s.toString().padStart(2, "0")}`;
	}

	/**
	 * Create a watch together session (mock implementation)
	 */
	async createWatchTogetherSession(
		videoId: string,
		title: string,
		hostName: string,
	): Promise<WatchTogetherSession> {
		const sessionId = this.generateSessionId();
		const hostId = this.generateUserId();

		const session: WatchTogetherSession = {
			id: sessionId,
			hostId,
			videoId,
			title,
			currentTime: 0,
			isPlaying: false,
			participants: [
				{
					id: hostId,
					name: hostName,
					joinedAt: Date.now(),
					isReady: true,
				},
			],
			createdAt: Date.now(),
		};

		this.watchTogetherSession = session;
		this.notifyWatchTogetherListeners();

		// In production, this would connect to a WebSocket server
		console.log("Watch Together session created:", session);

		return session;
	}

	/**
	 * Join a watch together session (mock implementation)
	 */
	async joinWatchTogetherSession(
		sessionId: string,
		participantName: string,
	): Promise<WatchTogetherSession | null> {
		// Mock - in production, fetch from server
		if (
			!this.watchTogetherSession ||
			this.watchTogetherSession.id !== sessionId
		) {
			// Create a mock session for demonstration
			this.watchTogetherSession = {
				id: sessionId,
				hostId: "host-123",
				videoId: "demo-video",
				title: "Demo Video",
				currentTime: 0,
				isPlaying: false,
				participants: [],
				createdAt: Date.now(),
			};
		}

		const participant: Participant = {
			id: this.generateUserId(),
			name: participantName,
			joinedAt: Date.now(),
			isReady: true,
		};

		this.watchTogetherSession.participants.push(participant);
		this.notifyWatchTogetherListeners();

		return this.watchTogetherSession;
	}

	/**
	 * Leave watch together session
	 */
	leaveWatchTogetherSession(): void {
		this.watchTogetherSession = null;
		this.notifyWatchTogetherListeners();
	}

	/**
	 * Update session state (sync across participants)
	 */
	updateSessionState(currentTime: number, isPlaying: boolean): void {
		if (this.watchTogetherSession) {
			this.watchTogetherSession.currentTime = currentTime;
			this.watchTogetherSession.isPlaying = isPlaying;
			this.notifyWatchTogetherListeners();

			// In production, emit via WebSocket to sync with other participants
			console.log("Session state updated:", { currentTime, isPlaying });
		}
	}

	/**
	 * Seek in watch together session
	 */
	seekSession(time: number): void {
		if (this.watchTogetherSession) {
			this.watchTogetherSession.currentTime = time;
			this.notifyWatchTogetherListeners();

			// In production, emit via WebSocket
			console.log("Session seeked to:", time);
		}
	}

	/**
	 * Subscribe to watch together session updates
	 */
	subscribeToWatchTogether(listener: WatchTogetherListener): () => void {
		this.watchTogetherListeners.add(listener);
		// Immediately call with current state
		listener(this.watchTogetherSession);
		return () => {
			this.watchTogetherListeners.delete(listener);
		};
	}

	/**
	 * Notify all watch together listeners
	 */
	private notifyWatchTogetherListeners() {
		this.watchTogetherListeners.forEach((listener) =>
			listener(
				this.watchTogetherSession ? { ...this.watchTogetherSession } : null,
			),
		);
	}

	/**
	 * Get current watch together session
	 */
	getCurrentSession(): WatchTogetherSession | null {
		return this.watchTogetherSession;
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `wt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Generate a unique user ID
	 */
	private generateUserId(): string {
		return `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Share to specific social platforms
	 */
	async shareToPlatform(
		platform: "twitter" | "facebook" | "whatsapp" | "telegram" | "email",
		videoId: string,
		title: string,
		timestamp?: number,
	): Promise<boolean> {
		const link = this.generateVideoLink(videoId, timestamp);
		const text = encodeURIComponent(
			this.getShareText({ videoId, title, timestamp }),
		);
		const encodedUrl = encodeURIComponent(link);

		let shareUrl: string;

		switch (platform) {
			case "twitter":
				shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
				break;
			case "facebook":
				shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
				break;
			case "whatsapp":
				shareUrl = `https://wa.me/?text=${text}%20${encodedUrl}`;
				break;
			case "telegram":
				shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${text}`;
				break;
			case "email":
				shareUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${text}%0A%0A${encodedUrl}`;
				break;
			default:
				return false;
		}

		// Open share URL
		window.open(shareUrl, "_blank", "noopener,noreferrer");
		return true;
	}

	/**
	 * Get QR code data for sharing (for TV casting)
	 */
	getQRCodeData(videoId: string, timestamp?: number): string {
		return this.generateVideoLink(videoId, timestamp);
	}
}

export interface EmbedOptions {
	width?: number;
	height?: number;
	autoplay?: boolean;
	controls?: boolean;
}

export const SharingService = new SharingServiceClass();
