import {
	AlertCircle,
	ArrowLeft,
	Check,
	ChevronsRight,
	List,
	Loader2,
	Maximize,
	Minimize,
	Pause,
	Play,
	PlayCircle,
	Settings,
	SkipBack,
	SkipForward,
	Sun,
	Volume2,
	VolumeX,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useWakeLock } from "../hooks/useWakeLock";
import type { Video } from "../types";
import {
	SubtitleManager,
	type SubtitleStyle,
	type SubtitleTrack,
} from "./SubtitleManager";

interface Chapter {
	title: string;
	time: number;
}

interface EnhancedVideoPlayerProps {
	video: Video;
	onBack?: () => void;
	autoPlay?: boolean;
	nextVideo?: Video | null;
	onPlayNext?: () => void;
	chapters?: Chapter[];
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2] as const;
const QUALITY_OPTIONS = [
	{ label: "Auto", value: "auto", height: 0 },
	{ label: "480p", value: "480", height: 480 },
	{ label: "720p", value: "720", height: 720 },
	{ label: "1080p", value: "1080", height: 1080 },
];

export function EnhancedVideoPlayer({
	video,
	onBack,
	autoPlay = true,
	nextVideo,
	onPlayNext,
	chapters = [],
}: EnhancedVideoPlayerProps) {
	const {
		videoRef,
		containerRef,
		state,
		load,
		play,
		togglePlay,
		seek,
		setVolume: setPlayerVolume,
		toggleMute,
		toggleFullscreen,
	} = useVideoPlayer();
	const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

	// UI State
	const [showControls, setShowControls] = useState(true);
	const [showSettings, setShowSettings] = useState(false);
	const [showChapters, setShowChapters] = useState(false);
	const [showPiPButton, setPiPSupport] = useState(false);
	const [isPiPActive, setIsPiPActive] = useState(false);
	const [autoPlayNext, setAutoPlayNext] = useState(true);
	const [countdown, setCountdown] = useState<number | null>(null);
	const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Gesture State
	const [brightness, setBrightness] = useState(1);
	const [volume, setVolumeGesture] = useState(1);
	const [gestureStart, setGestureStart] = useState<{
		x: number;
		y: number;
		time: number;
	} | null>(null);
	const [gestureFeedback, setGestureFeedback] = useState<{
		type: "volume" | "brightness" | "seek";
		value: number;
	} | null>(null);
	const lastTapRef = useRef<number>(0);
	const touchStartXRef = useRef<number>(0);

	// Playback State
	const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
	const [selectedQuality, setSelectedQuality] = useState<string>("auto");

	// Subtitle State
	const [_subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle | null>(
		null,
	);
	const [_activeSubtitleTrack, setActiveSubtitleTrack] =
		useState<SubtitleTrack | null>(null);

	// Check PiP support
	useEffect(() => {
		setPiPSupport(!!document.pictureInPictureEnabled);
	}, []);

	// Load video
	useEffect(() => {
		if (video.streamUrl) {
			load(video);
			if (autoPlay) {
				requestWakeLock();
				setTimeout(() => play(), 100);
			}
		}
		return () => {
			releaseWakeLock();
		};
	}, [
		video.key,
		video.streamUrl,
		releaseWakeLock,
		autoPlay,
		requestWakeLock,
		video,
		play,
		load,
	]);

	// Handle auto-play next
	useEffect(() => {
		if (
			state.isPlaying === false &&
			state.currentTime > 0 &&
			state.duration > 0 &&
			state.currentTime >= state.duration - 1
		) {
			if (autoPlayNext && nextVideo && onPlayNext) {
				setCountdown(5);
				const interval = setInterval(() => {
					setCountdown((prev) => {
						if (prev === null || prev <= 1) {
							clearInterval(interval);
							onPlayNext();
							return null;
						}
						return prev - 1;
					});
				}, 1000);
				return () => clearInterval(interval);
			}
		}
	}, [
		state.isPlaying,
		state.currentTime,
		state.duration,
		autoPlayNext,
		nextVideo,
		onPlayNext,
	]);

	// Hide controls after delay
	const hideControlsAfterDelay = useCallback(() => {
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
		setShowControls(true);
		const timeout = setTimeout(() => {
			if (state.isPlaying && !showSettings && !showChapters) {
				setShowControls(false);
			}
		}, 3000);
		controlsTimeoutRef.current = timeout;
	}, [state.isPlaying, showSettings, showChapters]);

	const handleMouseMove = () => hideControlsAfterDelay();

	// Gesture handlers
	const handleTouchStart = (e: React.TouchEvent) => {
		const touch = e.touches[0];
		setGestureStart({
			x: touch.clientX,
			y: touch.clientY,
			time: Date.now(),
		});
		touchStartXRef.current = touch.clientX;

		// Double-tap detection
		const now = Date.now();
		if (now - lastTapRef.current < 300) {
			const screenWidth = window.innerWidth;
			const tapX = touch.clientX;

			if (tapX < screenWidth / 3) {
				// Left side - rewind
				seek(Math.max(0, state.currentTime - 10));
				showGestureFeedback("seek", state.currentTime - 10);
			} else if (tapX > (screenWidth / 3) * 2) {
				// Right side - forward
				seek(Math.min(state.duration, state.currentTime + 10));
				showGestureFeedback("seek", state.currentTime + 10);
			}
			lastTapRef.current = 0;
		} else {
			lastTapRef.current = now;
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!gestureStart) return;

		const touch = e.touches[0];
		const deltaX = touch.clientX - gestureStart.x;
		const deltaY = gestureStart.y - touch.clientY; // Positive = swipe up

		// Determine gesture type based on initial movement
		const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);

		if (isHorizontal && Math.abs(deltaX) > 30) {
			// Horizontal swipe for seeking
			const seekAmount = (deltaX / window.innerWidth) * state.duration * 0.5;
			const newTime = Math.max(
				0,
				Math.min(state.duration, state.currentTime + seekAmount),
			);
			seek(newTime);
			showGestureFeedback("seek", newTime);
		} else if (!isHorizontal && Math.abs(deltaY) > 20) {
			// Vertical swipe
			const screenWidth = window.innerWidth;
			const tapX = touchStartXRef.current;

			if (tapX < screenWidth / 2) {
				// Left side - brightness
				const brightnessChange = deltaY / window.innerHeight;
				const newBrightness = Math.max(
					0.2,
					Math.min(1, brightness + brightnessChange),
				);
				setBrightness(newBrightness);
				showGestureFeedback("brightness", newBrightness);
			} else {
				// Right side - volume
				const volumeChange = deltaY / window.innerHeight;
				const newVolume = Math.max(0, Math.min(1, volume + volumeChange));
				setVolumeGesture(newVolume);
				setPlayerVolume(newVolume);
				showGestureFeedback("volume", newVolume);
			}
		}
	};

	const handleTouchEnd = () => {
		setGestureStart(null);
		setTimeout(() => setGestureFeedback(null), 1500);
	};

	const showGestureFeedback = (
		type: "volume" | "brightness" | "seek",
		value: number,
	) => {
		setGestureFeedback({ type, value });
	};

	// Picture-in-Picture
	const togglePiP = async () => {
		try {
			const videoEl = videoRef.current;
			if (!videoEl) return;

			if (document.pictureInPictureElement) {
				await document.exitPictureInPicture();
				setIsPiPActive(false);
			} else {
				await videoEl.requestPictureInPicture();
				setIsPiPActive(true);
			}
		} catch (error) {
			console.error("PiP error:", error);
		}
	};

	// Handle PiP state changes
	useEffect(() => {
		const handlePiPChange = () => {
			setIsPiPActive(!!document.pictureInPictureElement);
		};

		document.addEventListener("pictureinpicturechange", handlePiPChange);
		return () =>
			document.removeEventListener("pictureinpicturechange", handlePiPChange);
	}, []);

	// Playback speed
	const changePlaybackSpeed = (speed: number) => {
		const videoEl = videoRef.current;
		if (videoEl) {
			videoEl.playbackRate = speed;
			setPlaybackSpeed(speed);
		}
		setShowSettings(false);
	};

	// Quality selector
	const changeQuality = (quality: string) => {
		setSelectedQuality(quality);
		// In a real implementation, you would switch the video source here
		// based on the selected quality
		setShowSettings(false);
	};

	// Subtitle handlers
	const handleStyleChange = useCallback((style: SubtitleStyle) => {
		setSubtitleStyle(style);
	}, []);

	const handleTrackChange = useCallback((track: SubtitleTrack | null) => {
		setActiveSubtitleTrack(track);
	}, []);

	// Format time helper
	const formatTime = (seconds: number) => {
		if (!Number.isFinite(seconds)) return "0:00";
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0)
			return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	// Progress calculation
	const progress =
		state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

	// Get current chapter
	const currentChapter = chapters.find(
		(chapter, index) =>
			state.currentTime >= chapter.time &&
			(index === chapters.length - 1 ||
				state.currentTime < chapters[index + 1].time),
	);

	// Progress bar click
	const progressRef = useRef<HTMLDivElement>(null);
	const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = progressRef.current;
		if (!el || !state.duration) return;
		const rect = el.getBoundingClientRect();
		const pos = (e.clientX - rect.left) / rect.width;
		seek(pos * state.duration);
	};

	return (
		<div
			ref={containerRef}
			className="video-player enhanced-player"
			onMouseMove={handleMouseMove}
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			onClick={() => hideControlsAfterDelay()}
			style={{
				filter: `brightness(${brightness})`,
			}}
		>
			<video
				ref={videoRef}
				playsInline
				crossOrigin="anonymous"
				onDoubleClick={toggleFullscreen}
			>
				<track kind="captions" />
			</video>

			{/* Loading States */}
			{state.isLoading && (
				<div className="player-loading-overlay">
					<div className="loading-content">
						<Loader2 className="animate-spin" size={48} />
						<p className="loading-text">Loading video...</p>
					</div>
				</div>
			)}

			{/* Buffering indicator */}
			{state.isLoading && state.currentTime > 0 && (
				<div className="buffering-indicator">
					<Loader2 className="animate-spin" size={24} />
				</div>
			)}

			{/* Gesture Feedback */}
			{gestureFeedback && (
				<div className="gesture-feedback">
					{gestureFeedback.type === "volume" && (
						<>
							{gestureFeedback.value > 0.5 ? (
								<Volume2 size={48} />
							) : gestureFeedback.value > 0 ? (
								<VolumeX size={48} />
							) : (
								<VolumeX size={48} />
							)}
							<div className="gesture-bar">
								<div
									className="gesture-fill"
									style={{ height: `${gestureFeedback.value * 100}%` }}
								/>
							</div>
							<span>{Math.round(gestureFeedback.value * 100)}%</span>
						</>
					)}
					{gestureFeedback.type === "brightness" && (
						<>
							<Sun size={48} />
							<div className="gesture-bar">
								<div
									className="gesture-fill brightness-fill"
									style={{ height: `${gestureFeedback.value * 100}%` }}
								/>
							</div>
							<span>{Math.round(gestureFeedback.value * 100)}%</span>
						</>
					)}
					{gestureFeedback.type === "seek" && (
						<>
							<PlayCircle size={48} />
							<span>{formatTime(gestureFeedback.value)}</span>
						</>
					)}
				</div>
			)}

			{/* Double-tap feedback */}
			<div className="tap-zones">
				<div className="tap-zone left" />
				<div className="tap-zone right" />
			</div>

			{/* Back button */}
			{showControls && onBack && (
				<button
					type="button"
					className="player-back-btn"
					onClick={(e) => {
						e.stopPropagation();
						onBack();
					}}
					aria-label="Go back"
				>
					<ArrowLeft size={24} />
				</button>
			)}

			{/* Chapter indicator */}
			{currentChapter && showControls && (
				<div className="chapter-indicator">
					<List size={16} />
					<span>{currentChapter.title}</span>
				</div>
			)}

			{/* PiP indicator */}
			{isPiPActive && (
				<div className="pip-indicator">
					<PlayCircle size={16} />
					<span>Picture-in-Picture Active</span>
				</div>
			)}

			{/* Auto-play countdown */}
			{countdown !== null && (
				<div className="autoplay-countdown">
					<p>Playing next video in {countdown}s</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							setCountdown(null);
						}}
						className="btn-cancel-autoplay"
					>
						<X size={20} />
					</button>
				</div>
			)}

			{/* Controls bar */}
			{showControls && (
				<div className="player-controls enhanced-controls">
					{/* Progress bar with chapters */}
					<div
						ref={progressRef}
						className="progress-bar enhanced-progress"
						onClick={handleProgressClick}
						role="slider"
						aria-label="Video progress"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round(progress)}
						tabIndex={0}
					>
						{/* Chapter markers */}
						{chapters.map((chapter, _index) => (
							<div
								key={chapter.title}
								className="chapter-marker"
								style={{
									left: `${(chapter.time / state.duration) * 100}%`,
								}}
								title={chapter.title}
							/>
						))}
						<div className="progress-buffered" />
						<div className="progress-played" style={{ width: `${progress}%` }}>
							<div className="progress-handle" />
						</div>
					</div>

					<div className="controls-row">
						<div className="controls-left">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									togglePlay();
								}}
								className="control-btn"
								aria-label={state.isPlaying ? "Pause" : "Play"}
							>
								{state.isPlaying ? <Pause size={22} /> : <Play size={22} />}
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									seek(Math.max(0, state.currentTime - 10));
								}}
								className="control-btn"
								aria-label="Rewind 10s"
							>
								<SkipBack size={18} />
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									seek(Math.min(state.duration, state.currentTime + 10));
								}}
								className="control-btn"
								aria-label="Forward 10s"
							>
								<SkipForward size={18} />
							</button>
							<div className="volume-control">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										toggleMute();
									}}
									className="control-btn"
									aria-label={state.isMuted ? "Unmute" : "Mute"}
								>
									{state.isMuted ? (
										<VolumeX size={20} />
									) : (
										<Volume2 size={20} />
									)}
								</button>
								<input
									type="range"
									min="0"
									max="1"
									step="0.05"
									value={state.isMuted ? 0 : state.volume}
									onChange={(e) => setPlayerVolume(Number(e.target.value))}
									className="volume-slider"
									aria-label="Volume"
								/>
							</div>
							<span className="time-display">
								{formatTime(state.currentTime)} / {formatTime(state.duration)}
							</span>
						</div>

						<div className="controls-right">
							{/* PiP button */}
							{showPiPButton && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										togglePiP();
									}}
									className="control-btn"
									aria-label={isPiPActive ? "Exit PiP" : "Picture-in-Picture"}
								>
									<PlayCircle size={20} />
								</button>
							)}

							{/* Chapters button */}
							{chapters.length > 0 && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setShowChapters(!showChapters);
										setShowSettings(false);
									}}
									className={`control-btn ${showChapters ? "active" : ""}`}
									aria-label="Chapters"
								>
									<List size={20} />
								</button>
							)}

							{/* Settings button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setShowSettings(!showSettings);
									setShowChapters(false);
								}}
								className={`control-btn ${showSettings ? "active" : ""}`}
								aria-label="Settings"
							>
								<Settings size={20} />
							</button>

							{/* Subtitles button */}
							<SubtitleManager
								videoKey={video.key}
								subtitleUrl={video.subtitleUrl}
								onStyleChange={handleStyleChange}
								onTrackChange={handleTrackChange}
							/>

							{/* Fullscreen button */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									toggleFullscreen();
								}}
								className="control-btn"
								aria-label={
									state.isFullscreen ? "Exit fullscreen" : "Fullscreen"
								}
							>
								{state.isFullscreen ? (
									<Minimize size={20} />
								) : (
									<Maximize size={20} />
								)}
							</button>
						</div>
					</div>

					{/* Video title bar */}
					<div className="player-title-bar">
						<span className="player-video-title">{video.title}</span>
					</div>

					{/* Settings Panel */}
					{showSettings && (
						<div className="settings-panel">
							<div className="settings-header">
								<span>Playback Settings</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowSettings(false);
									}}
									className="close-btn"
								>
									<X size={20} />
								</button>
							</div>

							{/* Playback Speed */}
							<div className="setting-group">
								<div className="setting-label">
									<ChevronsRight size={16} />
									<span>Playback Speed</span>
								</div>
								<div className="speed-options">
									{PLAYBACK_SPEEDS.map((speed) => (
										<button
											key={speed}
											onClick={(e) => {
												e.stopPropagation();
												changePlaybackSpeed(speed);
											}}
											className={`speed-btn ${playbackSpeed === speed ? "active" : ""}`}
										>
											{speed}x{playbackSpeed === speed && <Check size={14} />}
										</button>
									))}
								</div>
							</div>

							{/* Quality Selector */}
							<div className="setting-group">
								<div className="setting-label">
									<Settings size={16} />
									<span>Quality</span>
								</div>
								<div className="quality-options">
									{QUALITY_OPTIONS.map((quality) => (
										<button
											key={quality.value}
											onClick={(e) => {
												e.stopPropagation();
												changeQuality(quality.value);
											}}
											className={`quality-btn ${selectedQuality === quality.value ? "active" : ""}`}
										>
											{quality.label}
											{selectedQuality === quality.value && <Check size={14} />}
										</button>
									))}
								</div>
							</div>

							{/* Auto-play Next */}
							<div className="setting-group">
								<div className="setting-label">
									<PlayCircle size={16} />
									<span>Auto-play Next</span>
								</div>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setAutoPlayNext(!autoPlayNext);
									}}
									className={`autoplay-toggle ${autoPlayNext ? "enabled" : "disabled"}`}
								>
									<div className="toggle-slider" />
								</button>
							</div>
						</div>
					)}

					{/* Chapters Panel */}
					{showChapters && chapters.length > 0 && (
						<div className="chapters-panel">
							<div className="chapters-header">
								<span>Chapters</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										setShowChapters(false);
									}}
									className="close-btn"
								>
									<X size={20} />
								</button>
							</div>
							<div className="chapters-list">
								{chapters.map((chapter, _index) => (
									<button
										key={chapter.title}
										onClick={(e) => {
											e.stopPropagation();
											seek(chapter.time);
											setShowChapters(false);
										}}
										className={`chapter-item ${currentChapter?.title === chapter.title ? "active" : ""}`}
									>
										<span className="chapter-time">
											{formatTime(chapter.time)}
										</span>
										<span className="chapter-title">{chapter.title}</span>
										{currentChapter?.title === chapter.title && (
											<PlayCircle size={16} className="playing-indicator" />
										)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* Error overlay */}
			{state.error && (
				<div className="player-error-overlay">
					<div className="error-content">
						<AlertCircle size={48} className="error-icon" />
						<h3>Playback Error</h3>
						<p>{state.error}</p>
						<div className="error-actions">
							<button
								onClick={(e) => {
									e.stopPropagation();
									load(video);
									play();
								}}
								className="btn btn-retry"
							>
								<PlayCircle size={20} />
								Retry
							</button>
							{onBack && (
								<button onClick={onBack} className="btn btn-back">
									<ArrowLeft size={20} />
									Go Back
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
