export interface LiveStreamQuality {
	label: string;
	height: number;
	bitrate: number;
	url: string;
}

export interface LiveChatMessage {
	id: string;
	userId: string;
	username: string;
	message: string;
	timestamp: number;
	avatarUrl?: string;
	isModerator?: boolean;
	isVerified?: boolean;
}

export interface LiveEvent {
	id: string;
	title: string;
	description?: string;
	thumbnailUrl?: string;
	posterUrl?: string;
	startTime: string; // ISO date string
	endTime?: string; // ISO date string
	status: "upcoming" | "live" | "ended";
	streamUrl?: string; // HLS manifest URL
	qualities?: LiveStreamQuality[];
	viewerCount?: number;
	categoryKey?: string;
	replayVideoKey?: string; // Key to VOD after stream ends
	isFeatured?: boolean;
}

export interface LiveStreamState {
	isLive: boolean;
	isLoading: boolean;
	error: string | null;
	currentTime: number;
	duration: number;
	dvrWindow: number; // Available DVR window in seconds
	isDvrEnabled: boolean;
	isPaused: boolean;
	quality: LiveStreamQuality | null;
	availableQualities: LiveStreamQuality[];
	viewerCount: number;
	chatEnabled: boolean;
}

export interface LiveNotification {
	id: string;
	eventId: string;
	eventTitle: string;
	message: string;
	type: "starting_soon" | "now_live" | "replay_available";
	timestamp: number;
	read: boolean;
}

export interface DVRState {
	isActive: boolean;
	bufferStart: number;
	bufferEnd: number;
	position: number; // Current playback position relative to live edge
	isAtLiveEdge: boolean;
}
