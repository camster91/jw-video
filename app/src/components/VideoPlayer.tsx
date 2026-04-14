import { useState, useEffect, useCallback, useRef } from "react";
import type { Video } from "../types";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { useWakeLock } from "../hooks/useWakeLock";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, ArrowLeft, Settings,
} from "lucide-react";

interface VideoPlayerProps {
  video: Video;
  onBack?: () => void;
  autoPlay?: boolean;
}

export function VideoPlayer({ video, onBack, autoPlay = true }: VideoPlayerProps) {
  const {
    videoRef, containerRef, state, load, play, pause, togglePlay,
    seek, setVolume, toggleMute, toggleFullscreen,
  } = useVideoPlayer();
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<ReturnType<typeof setTimeout>>();
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (video.streamUrl) {
      load(video);
      if (autoPlay) {
        requestWakeLock();
        // Small delay to allow video element to load
        setTimeout(() => play(), 100);
      }
    }
    return () => {
      releaseWakeLock();
    };
  }, [video.key]);

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimeout) clearTimeout(controlsTimeout);
    setShowControls(true);
    const timeout = setTimeout(() => {
      if (state.isPlaying) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  }, [state.isPlaying, controlsTimeout]);

  const handleMouseMove = () => hideControlsAfterDelay();

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = progressRef.current;
    if (!el || !state.duration) return;
    const rect = el.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seek(pos * state.duration);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="video-player"
      onMouseMove={handleMouseMove}
      onClick={togglePlay}
    >
      <video ref={videoRef} playsInline crossOrigin="anonymous" />

      {/* Back button */}
      {showControls && onBack && (
        <button
          className="player-back-btn"
          onClick={(e) => { e.stopPropagation(); onBack(); }}
        >
          <ArrowLeft size={24} />
        </button>
      )}

      {/* Center play/pause indicator */}
      {state.isLoading && (
        <div className="player-loading" onClick={(e) => e.stopPropagation()}>
          <div className="spinner" />
        </div>
      )}

      {/* Controls bar */}
      {showControls && (
        <div className="player-controls" onClick={(e) => e.stopPropagation()}>
          {/* Progress bar */}
          <div ref={progressRef} className="progress-bar" onClick={handleProgressClick}>
            <div className="progress-buffered" />
            <div className="progress-played" style={{ width: `${progress}%` }}>
              <div className="progress-handle" />
            </div>
          </div>

          <div className="controls-row">
            <div className="controls-left">
              <button onClick={togglePlay} className="control-btn" aria-label="Play/Pause">
                {state.isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <button onClick={() => seek(Math.max(0, state.currentTime - 10))} className="control-btn" aria-label="Rewind 10s">
                <SkipBack size={18} />
              </button>
              <button onClick={() => seek(Math.min(state.duration, state.currentTime + 10))} className="control-btn" aria-label="Forward 10s">
                <SkipForward size={18} />
              </button>
              <div className="volume-control">
                <button onClick={toggleMute} className="control-btn" aria-label="Mute">
                  {state.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.isMuted ? 0 : state.volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="volume-slider"
                  aria-label="Volume"
                />
              </div>
              <span className="time-display">
                {formatTime(state.currentTime)} / {formatTime(state.duration)}
              </span>
            </div>
            <div className="controls-right">
              <button onClick={toggleFullscreen} className="control-btn" aria-label="Fullscreen">
                {state.isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>

          {/* Video title in controls */}
          <div className="player-title-bar">
            <span className="player-video-title">{video.title}</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {state.error && (
        <div className="player-error" onClick={(e) => e.stopPropagation()}>
          <p>{state.error}</p>
          <button onClick={onBack} className="btn btn-play">Go Back</button>
        </div>
      )}
    </div>
  );
}