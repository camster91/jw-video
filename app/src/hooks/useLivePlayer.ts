import Hls from "hls.js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DVRState, LiveStreamQuality } from "../types/live";

export interface LivePlayerState {
	isLive: boolean;
	isLoading: boolean;
	isPlaying: boolean;
	error: string | null;
	currentTime: number;
	duration: number;
	dvrWindow: number;
	isDvrEnabled: boolean;
	isPaused: boolean;
	isAtLiveEdge: boolean;
	quality: LiveStreamQuality | null;
	availableQualities: LiveStreamQuality[];
	buffered: number;
	isMuted: boolean;
	isFullscreen: boolean;
	volume: number;
}

export function useLivePlayer() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const hlsRef = useRef<Hls | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [state, setState] = useState<LivePlayerState>({
		isLive: true,
		isLoading: true,
		isPlaying: false,
		error: null,
		currentTime: 0,
		duration: 0,
		dvrWindow: 0,
		isDvrEnabled: false,
		isPaused: false,
		isAtLiveEdge: true,
		quality: null,
		availableQualities: [],
		buffered: 0,
		isMuted: false,
		isFullscreen: false,
		volume: 0.5,
	});

	const [dvrState, setDvrState] = useState<DVRState>({
		isActive: false,
		bufferStart: 0,
		bufferEnd: 0,
		position: 0,
		isAtLiveEdge: true,
	});

	const currentStreamUrl = useRef<string>("");
	const qualityLevelsRef = useRef<LiveStreamQuality[]>([]);

	const loadStream = useCallback(
		(url: string, qualities?: LiveStreamQuality[]) => {
			const video = videoRef.current;
			if (!video || !url) return;

			currentStreamUrl.current = url;

			// Clean up existing HLS instance
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}

			setState((s) => ({ ...s, isLoading: true, error: null }));

			if (Hls.isSupported()) {
				const hls = new Hls({
					enableWorker: true,
					lowLatencyMode: true,
					backBufferLength: 90, // Keep 90 seconds of DVR buffer
					maxBufferLength: 30,
					maxMaxBufferLength: 60,
					liveSyncDurationCount: 3,
					liveMaxLatencyDurationCount: 5,
					startPosition: -1, // Start at live edge
				});

				hlsRef.current = hls;

				hls.loadSource(url);
				hls.attachMedia(video);

				hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
					// Extract quality levels from manifest
					const extractedQualities: LiveStreamQuality[] = data.levels.map(
						(level, _index) => ({
							label: `${level.height}p`,
							height: level.height,
							bitrate: level.bitrate,
							url: "",
						}),
					);

					// Use provided qualities or extracted ones
					const finalQualities =
						qualities && qualities.length > 0
							? qualities
							: extractedQualities.length > 0
								? extractedQualities
								: [
										{ label: "Auto", height: 0, bitrate: 0, url: "" },
										{ label: "720p", height: 720, bitrate: 2500000, url: "" },
										{ label: "480p", height: 480, bitrate: 1000000, url: "" },
										{ label: "360p", height: 360, bitrate: 500000, url: "" },
									];

					qualityLevelsRef.current = finalQualities;

					setState((s) => ({
						...s,
						availableQualities: finalQualities,
						quality: finalQualities[0] || null,
						isDvrEnabled: true,
					}));
				});

				hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
					const level = hls.levels[data.level];
					if (level) {
						setState((s) => ({
							...s,
							quality: {
								label: `${level.height}p`,
								height: level.height,
								bitrate: level.bitrate,
								url: "",
							},
						}));
					}
				});

				hls.on(Hls.Events.ERROR, (_event, data) => {
					if (data.fatal) {
						switch (data.type) {
							case Hls.ErrorTypes.NETWORK_ERROR:
								setState((s) => ({
									...s,
									error: "Network error. Trying to recover...",
									isLoading: false,
								}));
								hls.startLoad();
								break;
							case Hls.ErrorTypes.MEDIA_ERROR:
								setState((s) => ({
									...s,
									error: "Media error. Recovering...",
									isLoading: false,
								}));
								hls.recoverMediaError();
								break;
							default:
								setState((s) => ({
									...s,
									error: "Failed to load stream",
									isLoading: false,
								}));
								break;
						}
					}
				});

				hls.on(Hls.Events.LIVE_BACK_BUFFER_REACHED, (_event, data) => {
					setDvrState((d) => ({
						...d,
						bufferStart: (data as any).bufferStart || 0,
					}));
				});
			} else if (video.canPlayType("application/vnd.apple.mpegurl")) {
				// Native HLS support (Safari)
				video.src = url;
				video.addEventListener("loadedmetadata", () => {
					setState((s) => ({
						...s,
						isLoading: false,
						isDvrEnabled: true,
						availableQualities: qualities || [],
					}));
				});
			} else {
				setState((s) => ({
					...s,
					error: "HLS is not supported in this browser",
					isLoading: false,
				}));
			}
		},
		[],
	);

	const play = useCallback(() => {
		videoRef.current?.play().catch(() => {});
	}, []);

	const pause = useCallback(() => {
		videoRef.current?.pause();
	}, []);

	const togglePlay = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) {
			video.play().catch(() => {});
		} else {
			video.pause();
		}
	}, []);

	const seek = useCallback((time: number) => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = time;
	}, []);

	const seekRelative = useCallback((delta: number) => {
		const video = videoRef.current;
		if (!video) return;
		video.currentTime = Math.max(0, video.currentTime + delta);
	}, []);

	const goToLiveEdge = useCallback(() => {
		const video = videoRef.current;
		const hls = hlsRef.current;
		if (!video) return;

		if (hls) {
			// Reset sync to live edge by restarting
			hls.stopLoad();
			hls.startLoad(-1);
		}

		// Seek to near the end of the buffer
		if (video.buffered.length > 0) {
			const end = video.buffered.end(video.buffered.length - 1);
			video.currentTime = end - 2; // 2 seconds from live edge
		}

		setState((s) => ({ ...s, isAtLiveEdge: true, isPaused: false }));
		setDvrState((d) => ({ ...d, isAtLiveEdge: true }));

		// Resume playback if paused
		if (video.paused) {
			video.play().catch(() => {});
		}
	}, []);

	const changeQuality = useCallback((quality: LiveStreamQuality) => {
		const hls = hlsRef.current;
		if (!hls) return;

		if (quality.label === "Auto") {
			hls.currentLevel = -1; // Auto quality
		} else {
			// Find matching level
			const levelIndex = hls.levels.findIndex(
				(level) => level.height === quality.height,
			);
			if (levelIndex !== -1) {
				hls.currentLevel = levelIndex;
			}
		}

		setState((s) => ({ ...s, quality }));
	}, []);

	const toggleMute = useCallback(() => {
		const video = videoRef.current;
		if (!video) return;
		video.muted = !video.muted;
		setState((s) => ({ ...s, isMuted: video.muted }));
	}, []);

	const setVolume = useCallback((volume: number) => {
		const video = videoRef.current;
		if (!video) return;
		const clamped = Math.max(0, Math.min(1, volume));
		video.volume = clamped;
		setState((s) => ({ ...s, volume: clamped, isMuted: clamped === 0 }));
	}, []);

	const toggleFullscreen = useCallback(async () => {
		const container = containerRef.current;
		if (!container) return;

		try {
			if (document.fullscreenElement) {
				await document.exitFullscreen();
				setState((s) => ({ ...s, isFullscreen: false }));
			} else {
				await container.requestFullscreen();
				setState((s) => ({ ...s, isFullscreen: true }));
			}
		} catch {
			// Ignore fullscreen errors
		}
	}, []);

	// Set up event listeners
	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const onPlay = () => {
			setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
		};

		const onPause = () => {
			setState((s) => ({ ...s, isPlaying: false, isPaused: true }));
		};

		const onTimeUpdate = () => {
			const currentTime = video.currentTime;
			let isAtLiveEdge = true;

			if (video.buffered.length > 0) {
				const end = video.buffered.end(video.buffered.length - 1);
				const start = video.buffered.start(video.buffered.length - 1);
				const dvrWindow = end - start;

				isAtLiveEdge = end - currentTime < 5; // Within 5 seconds of live edge

				setDvrState((d) => ({
					...d,
					bufferStart: start,
					bufferEnd: end,
					position: currentTime - start,
					isAtLiveEdge,
				}));

				setState((s) => ({
					...s,
					currentTime,
					duration: end,
					dvrWindow,
					isAtLiveEdge,
				}));
			} else {
				setState((s) => ({ ...s, currentTime }));
			}
		};

		const onLoadedData = () => {
			setState((s) => ({ ...s, isLoading: false, error: null }));
		};

		const onWaiting = () => {
			setState((s) => ({ ...s, isLoading: true }));
		};

		const onCanPlay = () => {
			setState((s) => ({ ...s, isLoading: false }));
		};

		const onProgress = () => {
			if (video.buffered.length > 0) {
				const end = video.buffered.end(video.buffered.length - 1);
				setState((s) => ({ ...s, buffered: end }));
			}
		};

		const onError = () => {
			setState((s) => ({
				...s,
				error: "Failed to load stream",
				isLoading: false,
			}));
		};

		const onDurationChange = () => {
			// For live streams, duration represents the end of the buffer
			setState((s) => ({ ...s, duration: video.duration }));
		};

		const onVolumeChange = () => {
			setState((s) => ({
				...s,
				volume: video.volume,
				isMuted: video.muted,
			}));
		};

		video.addEventListener("play", onPlay);
		video.addEventListener("pause", onPause);
		video.addEventListener("timeupdate", onTimeUpdate);
		video.addEventListener("loadeddata", onLoadedData);
		video.addEventListener("waiting", onWaiting);
		video.addEventListener("canplay", onCanPlay);
		video.addEventListener("progress", onProgress);
		video.addEventListener("error", onError);
		video.addEventListener("durationchange", onDurationChange);
		video.addEventListener("volumechange", onVolumeChange);

		return () => {
			video.removeEventListener("play", onPlay);
			video.removeEventListener("pause", onPause);
			video.removeEventListener("timeupdate", onTimeUpdate);
			video.removeEventListener("loadeddata", onLoadedData);
			video.removeEventListener("waiting", onWaiting);
			video.removeEventListener("canplay", onCanPlay);
			video.removeEventListener("progress", onProgress);
			video.removeEventListener("error", onError);
			video.removeEventListener("durationchange", onDurationChange);
			video.removeEventListener("volumechange", onVolumeChange);
		};
	}, []);

	// Cleanup HLS instance on unmount
	useEffect(() => {
		return () => {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
		};
	}, []);

	return {
		videoRef,
		containerRef,
		state,
		dvrState,
		loadStream,
		play,
		pause,
		togglePlay,
		seek,
		seekRelative,
		goToLiveEdge,
		changeQuality,
		toggleMute,
		setVolume,
		toggleFullscreen,
	};
}
