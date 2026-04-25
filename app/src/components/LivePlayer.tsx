import {
	ArrowLeft,
	FastForward,
	Maximize,
	Minimize,
	Pause,
	Play,
	Radio,
	Rewind,
	Settings,
	Volume2,
	VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLivePlayer } from "../hooks/useLivePlayer";
import type { LiveEvent, LiveStreamQuality } from "../types/live";
import "./LivePlayer.css";

interface LivePlayerProps {
	event: LiveEvent;
	onBack?: () => void;
	onStreamEnd?: () => void;
}

export function LivePlayer({ event, onBack, onStreamEnd }: LivePlayerProps) {
	const {
		videoRef,
		containerRef,
		state,
		dvrState,
		loadStream,
		togglePlay,
		seekRelative,
		goToLiveEdge,
		changeQuality,
		toggleMute,
		setVolume,
		toggleFullscreen,
	} = useLivePlayer();

	const [showControls, setShowControls] = useState(true);
	const [showQualityMenu, setShowQualityMenu] = useState(false);
	const [controlsTimeout, setControlsTimeout] =
		useState<ReturnType<typeof setTimeout>>();
	const progressRef = useRef<HTMLDivElement>(null);

	// Load the stream when component mounts or event changes
	useEffect(() => {
		if (event.streamUrl) {
			loadStream(event.streamUrl, event.qualities);
		}
	}, [event.streamUrl, event.qualities, loadStream]);

	// Auto-hide controls
	const hideControlsAfterDelay = useCallback(() => {
		if (controlsTimeout) clearTimeout(controlsTimeout);
		setShowControls(true);
		const timeout = setTimeout(() => {
			if (state.isPlaying && !showQualityMenu) {
				setShowControls(false);
			}
		}, 4000);
		setControlsTimeout(timeout);
	}, [state.isPlaying, showQualityMenu, controlsTimeout]);

	const handleMouseMove = () => hideControlsAfterDelay();

	const formatTime = (seconds: number) => {
		if (!Number.isFinite(seconds)) return "LIVE";
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0)
			return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const formatDVRTime = (seconds: number) => {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		return `${m}m`;
	};

	const progress =
		state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

	const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = progressRef.current;
		if (!el || !state.duration) return;
		const rect = el.getBoundingClientRect();
		const pos = (e.clientX - rect.left) / rect.width;
		const time = pos * state.duration;
		seekRelative(time - state.currentTime);
	};

	const handleQualitySelect = (quality: LiveStreamQuality) => {
		changeQuality(quality);
		setShowQualityMenu(false);
	};

	return (
		<div
			ref={containerRef}
			className="live-player"
			onMouseMove={handleMouseMove}
			onClick={togglePlay}
			role="application"
			aria-label={`Live stream: ${event.title}`}
		>
			<video ref={videoRef} playsInline crossOrigin="anonymous" />

			{/* Live badge */}
			<div className="live-badge-container">
				<div className="live-badge">
					<Radio size={12} className="live-icon" />
					<span>LIVE</span>
				</div>
				{event.viewerCount !== undefined && (
					<span className="viewer-count">
						{event.viewerCount.toLocaleString()} watching
					</span>
				)}
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

			{/* Loading indicator */}
			{state.isLoading && (
				<div className="player-loading-overlay">
					<div className="loading-content">
						<div className="spinner" />
						<span className="loading-text">
							{state.error ? "Reconnecting..." : "Loading live stream..."}
						</span>
					</div>
				</div>
			)}

			{/* DVR indicator */}
			{!dvrState.isAtLiveEdge && state.isPlaying && (
				<div className="dvr-indicator">
					<span className="dvr-label">DVR Active</span>
					<button
						type="button"
						className="btn-go-live"
						onClick={(e) => {
							e.stopPropagation();
							goToLiveEdge();
						}}
					>
						<Radio size={14} />
						<span>Return to Live</span>
					</button>
				</div>
			)}

			{/* Controls bar */}
			{showControls && (
				<div
					className="live-player-controls"
					role="toolbar"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					{/* DVR Progress bar */}
					{state.isDvrEnabled && (
						<div className="dvr-progress-container">
							<div
								ref={progressRef}
								className="dvr-progress-bar"
								onClick={handleProgressClick}
								role="slider"
								aria-label="DVR playback position"
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={Math.round(progress)}
								tabIndex={0}
							>
								<div className="dvr-progress-buffered" />
								<div
									className="dvr-progress-played"
									style={{ width: `${progress}%` }}
								>
									<div className="dvr-progress-handle" />
								</div>
								{/* Live edge marker */}
								<div className="live-edge-marker">
									<span>LIVE</span>
								</div>
							</div>
							<div className="dvr-time-display">
								<span>{formatDVRTime(state.dvrWindow)}</span>
								<span className="dvr-label-text">DVR Window</span>
							</div>
						</div>
					)}

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

							{/* DVR Controls */}
							{state.isDvrEnabled && (
								<>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											seekRelative(-10);
										}}
										className="control-btn"
										aria-label="Rewind 10s"
										title="Rewind 10s"
									>
										<Rewind size={18} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											seekRelative(10);
										}}
										className="control-btn"
										aria-label="Forward 10s"
										title="Forward 10s"
									>
										<FastForward size={18} />
									</button>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											goToLiveEdge();
										}}
										className={`control-btn ${dvrState.isAtLiveEdge ? "active" : ""}`}
										aria-label="Go to live"
										title="Return to live edge"
									>
										<Radio size={18} />
									</button>
								</>
							)}

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
									value={state.isMuted ? 0 : 0.5}
									onChange={(e) => setVolume(Number(e.target.value))}
									className="volume-slider"
									aria-label="Volume"
								/>
							</div>

							<span className="time-display">
								{state.isAtLiveEdge ? "LIVE" : formatTime(state.currentTime)}
							</span>
						</div>

						<div className="controls-right">
							{/* Quality selector */}
							<div className="quality-selector">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setShowQualityMenu(!showQualityMenu);
									}}
									className="control-btn"
									aria-label="Quality settings"
									title="Quality"
								>
									<Settings size={20} />
									{state.quality && (
										<span className="quality-label">{state.quality.label}</span>
									)}
								</button>

								{showQualityMenu && (
									<div className="quality-menu">
										{state.availableQualities.map((quality) => (
											<button
												key={quality.label}
												type="button"
												className={`quality-option ${state.quality?.label === quality.label ? "active" : ""}`}
												onClick={(e) => {
													e.stopPropagation();
													handleQualitySelect(quality);
												}}
											>
												{quality.label}
												{quality.bitrate > 0 && (
													<span className="quality-bitrate">
														{(quality.bitrate / 1000000).toFixed(1)} Mbps
													</span>
												)}
											</button>
										))}
									</div>
								)}
							</div>

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

					{/* Stream title */}
					<div className="player-title-bar">
						<span className="player-video-title">{event.title}</span>
						{event.description && (
							<span className="player-video-description">
								{event.description}
							</span>
						)}
					</div>
				</div>
			)}

			{/* Error overlay */}
			{state.error && (
				<div
					className="player-error-overlay"
					onClick={(e) => e.stopPropagation()}
					role="alert"
				>
					<div className="error-content">
						<p>{state.error}</p>
						<div className="error-actions">
							{onBack && (
								<button type="button" onClick={onBack} className="btn btn-back">
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
