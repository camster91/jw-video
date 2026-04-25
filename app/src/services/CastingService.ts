import { Capacitor } from "@capacitor/core";

/**
 * Casting Service - Handles Chromecast, AirPlay, and Smart TV casting
 * Uses Capacitor plugins where available, with web fallbacks
 */

export interface CastDevice {
	id: string;
	name: string;
	type: "chromecast" | "airplay" | "smarttv" | "dlna";
	available: boolean;
}

export interface CastState {
	isCasting: boolean;
	isConnecting: boolean;
	currentDevice: CastDevice | null;
	availableDevices: CastDevice[];
}

export type CastStateListener = (state: CastState) => void;

class CastingServiceClass {
	private state: CastState = {
		isCasting: false,
		isConnecting: false,
		currentDevice: null,
		availableDevices: [],
	};

	private listeners: Set<CastStateListener> = new Set();

	// Chromecast sender API (web)
	private castSession: any = null;

	// AirPlay (iOS native via Capacitor plugin or web API)
	private airPlaySession: any = null;

	constructor() {
		this.initializeCastAPI();
	}

	/**
	 * Initialize casting APIs
	 */
	private initializeCastAPI() {
		// Initialize Chromecast
		if (typeof window !== "undefined") {
			// Load Chromecast sender API
			const castScript = document.createElement("script");
			castScript.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js";
			castScript.onload = () => {
				this.initializeChromecast();
			};
			document.head.appendChild(castScript);
		}
	}

	/**
	 * Initialize Chromecast API
	 */
	private initializeChromecast() {
		if (!window.chrome?.cast) return;

		const castOptions = new window.chrome.cast.CastOptions(
			new window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED(),
			true,
			true,
		);

		window.chrome.cast.initialize(
			castOptions,
			() => {
				console.log("Chromecast initialized");
				this.scanForDevices();
			},
			(error) => {
				console.error("Chromecast initialization error:", error);
			},
		);
	}

	/**
	 * Subscribe to cast state changes
	 */
	subscribe(listener: CastStateListener): () => void {
		this.listeners.add(listener);
		// Immediately call with current state
		listener(this.state);
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Notify all listeners of state change
	 */
	private notifyListeners() {
		this.listeners.forEach((listener) => listener({ ...this.state }));
	}

	/**
	 * Scan for available cast devices
	 */
	async scanForDevices(): Promise<void> {
		this.setState({ isConnecting: true });

		try {
			const devices: CastDevice[] = [];

			// Check for Chromecast
			if (window.chrome?.cast?.api?.getAvailability) {
				const available = await new Promise<boolean>((resolve) => {
					window.chrome.cast.api.getAvailability(
						(available: boolean) => resolve(available),
						() => resolve(false),
					);
				});

				if (available) {
					devices.push({
						id: "chromecast",
						name: "Chromecast",
						type: "chromecast",
						available: true,
					});
				}
			}

			// Check for AirPlay (iOS)
			if (Capacitor.isNativePlatform()) {
				// Native platform - check for AirPlay plugin
				const isIOS = Capacitor.getPlatform() === "ios";
				if (isIOS) {
					devices.push({
						id: "airplay",
						name: "AirPlay",
						type: "airplay",
						available: true,
					});
				}
			}

			// Mock Smart TV devices for demonstration
			devices.push(
				{
					id: "smarttv-living-room",
					name: "Living Room TV",
					type: "smarttv",
					available: true,
				},
				{
					id: "smarttv-bedroom",
					name: "Bedroom TV",
					type: "smarttv",
					available: true,
				},
			);

			this.setState({ availableDevices: devices });
		} catch (error) {
			console.error("Error scanning for devices:", error);
		} finally {
			this.setState({ isConnecting: false });
		}
	}

	/**
	 * Start casting to a device
	 */
	async startCasting(
		deviceId: string,
		videoUrl: string,
		title: string,
		posterUrl?: string,
	): Promise<boolean> {
		this.setState({ isConnecting: true });

		try {
			const device = this.state.availableDevices.find((d) => d.id === deviceId);
			if (!device) {
				throw new Error("Device not found");
			}

			switch (device.type) {
				case "chromecast":
					await this.startChromecast(videoUrl, title, posterUrl);
					break;
				case "airplay":
					await this.startAirPlay(videoUrl, title, posterUrl);
					break;
				case "smarttv":
					await this.startSmartTVCast(device, videoUrl, title, posterUrl);
					break;
				default:
					throw new Error("Unsupported device type");
			}

			this.setState({
				isCasting: true,
				currentDevice: device,
			});

			return true;
		} catch (error) {
			console.error("Error starting cast:", error);
			return false;
		} finally {
			this.setState({ isConnecting: false });
		}
	}

	/**
	 * Start Chromecast session
	 */
	private async startChromecast(
		videoUrl: string,
		title: string,
		posterUrl?: string,
	): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!window.chrome?.cast) {
				reject(new Error("Chromecast API not available"));
				return;
			}

			const _sessionRequest = new window.chrome.cast.SessionRequest(
				window.chrome.cast.MEDIA_NAMESPACE,
			);

			const apiConfig = new window.chrome.cast.ApiConfig(
				new window.chrome.cast.SessionRequest(
					window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
				),
				(session: any) => {
					this.castSession = session;
					this.loadMediaOnCast(videoUrl, title, posterUrl);
					resolve();
				},
				() => {
					// Session listener
				},
				window.chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
			);

			window.chrome.cast.initialize(apiConfig, resolve, reject);

			// Request session
			window.chrome.cast.requestSession((session: any) => {
				this.castSession = session;
				this.loadMediaOnCast(videoUrl, title, posterUrl);
				resolve();
			}, reject);
		});
	}

	/**
	 * Load media on Chromecast
	 */
	private loadMediaOnCast(videoUrl: string, title: string, posterUrl?: string) {
		if (!this.castSession) return;

		const mediaInfo = new window.chrome.cast.media.MediaInfo(
			videoUrl,
			"video/mp4",
		);
		mediaInfo.metadata = new window.chrome.cast.media.GenericMediaMetadata();
		mediaInfo.metadata.title = title;
		if (posterUrl) {
			mediaInfo.metadata.images = [new window.chrome.cast.Image(posterUrl)];
		}

		const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
		this.castSession.loadMedia(
			request,
			() => {
				console.log("Media loaded on Chromecast");
			},
			(error: any) => {
				console.error("Error loading media:", error);
			},
		);
	}

	/**
	 * Start AirPlay (iOS native)
	 */
	private async startAirPlay(
		videoUrl: string,
		title: string,
		_posterUrl?: string,
	): Promise<void> {
		// On iOS, AirPlay is typically handled by the native video player
		// This would require a Capacitor plugin for full control
		// For now, we'll use the web API which triggers the native AirPlay picker

		return new Promise((resolve, _reject) => {
			// Create a temporary video element to trigger AirPlay
			const video = document.createElement("video");
			video.src = videoUrl;
			video.setAttribute("playsinline", "true");
			video.setAttribute("webkit-playsinline", "true");
			video.setAttribute("x5-playsinline", "true");

			// AirPlay is user-initiated, so we can't programmatically start it
			// This is a limitation - in production, use a Capacitor plugin
			console.log("AirPlay: Please use the native AirPlay button on iOS");

			// Mock success for demonstration
			this.airPlaySession = { videoUrl, title };
			resolve();
		});
	}

	/**
	 * Start Smart TV casting (mock implementation)
	 */
	private async startSmartTVCast(
		device: CastDevice,
		videoUrl: string,
		title: string,
		_posterUrl?: string,
	): Promise<void> {
		// Mock implementation - in production, use DIAL protocol or manufacturer SDK
		console.log(`Casting to Smart TV: ${device.name}`);
		console.log(`Video URL: ${videoUrl}`);
		console.log(`Title: ${title}`);

		// Simulate connection delay
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Mock successful connection
		return Promise.resolve();
	}

	/**
	 * Stop casting
	 */
	async stopCasting(): Promise<void> {
		try {
			if (this.castSession) {
				await this.castSession.stop(
					() => {
						console.log("Cast session stopped");
					},
					(error: any) => {
						console.error("Error stopping cast:", error);
					},
				);
				this.castSession = null;
			}

			if (this.airPlaySession) {
				this.airPlaySession = null;
			}

			this.setState({
				isCasting: false,
				currentDevice: null,
			});
		} catch (error) {
			console.error("Error stopping cast:", error);
		}
	}

	/**
	 * Seek in the casted video
	 */
	seek(position: number): void {
		if (this.castSession) {
			const seekRequest = new window.chrome.cast.media.SeekRequest();
			seekRequest.currentTime = position;
			this.castSession.media[0].seek(seekRequest);
		}
	}

	/**
	 * Play/Pause casted video
	 */
	togglePlayPause(isPlaying: boolean): void {
		if (this.castSession?.media[0]) {
			if (isPlaying) {
				this.castSession.media[0].pause();
			} else {
				this.castSession.media[0].play();
			}
		}
	}

	/**
	 * Set volume on cast device
	 */
	setVolume(level: number, muted: boolean): void {
		if (this.castSession) {
			const volume = new window.chrome.cast.Volume();
			volume.level = level;
			volume.muted = muted;

			const request = new window.chrome.cast.VolumeRequest();
			request.volume = volume;

			this.castSession.setVolume(request);
		}
	}

	/**
	 * Get current cast state
	 */
	getState(): CastState {
		return { ...this.state };
	}

	/**
	 * Update state and notify listeners
	 */
	private setState(partial: Partial<CastState>) {
		this.state = { ...this.state, ...partial };
		this.notifyListeners();
	}
}

// Extend Window interface for Chromecast API
declare global {
	interface Window {
		chrome?: {
			cast?: {
				initialize: (
					config: any,
					onSuccess: () => void,
					onError: (error: any) => void,
				) => void;
				requestSession: (
					onSuccess: (session: any) => void,
					onError: (error: any) => void,
				) => void;
				api: {
					getAvailability: (
						onSuccess: (available: boolean) => void,
						onError: () => void,
					) => void;
				};
				SessionRequest: new (appId: string) => any;
				ApiConfig: new (
					sessionRequest: any,
					sessionListener: (session: any) => void,
					receiverListener: () => void,
					autoJoinPolicy: any,
				) => any;
				AutoJoinPolicy: {
					TAB_AND_ORIGIN_SCOPED: any;
					ORIGIN_SCOPED: any;
				};
				MEDIA_NAMESPACE: string;
				media: {
					DEFAULT_MEDIA_RECEIVER_APP_ID: string;
					MediaInfo: new (url: string, contentType: string) => any;
					GenericMediaMetadata: new () => any;
					Image: new (url: string) => any;
					LoadRequest: new (mediaInfo: any) => any;
					SeekRequest: new () => any;
					Volume: new () => any;
					VolumeRequest: new () => any;
				};
			};
		};
	}
}

export const CastingService = new CastingServiceClass();
