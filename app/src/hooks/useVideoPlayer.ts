import { useRef, useState, useCallback, useEffect } from "react";
import type { Video } from "../types";
import { addToHistory } from "../services/api";

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    isLoading: true,
    error: null,
  });

  const currentVideo = useRef<Video | null>(null);

  const load = useCallback((video: Video) => {
    const el = videoRef.current;
    if (!el || !video.streamUrl) return;

    currentVideo.current = video;
    addToHistory(video.key);

    el.src = video.streamUrl;
    el.load();
    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Set up MediaSession for lock screen / PiP controls
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title,
        artist: "Jehovah's Witnesses",
        album: "JW.org Videos",
        artwork: video.thumbnailUrl
          ? [{ src: video.thumbnailUrl, sizes: "512x512", type: "image/jpeg" }]
          : [],
      });
    }
  }, []);

  const play = useCallback(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = vol;
    setState((s) => ({ ...s, volume: vol, isMuted: vol === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setState((s) => ({ ...s, isMuted: !s.isMuted }));
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
      // Fallback: try video element directly
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          await videoRef.current?.requestFullscreen();
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Wire up video event listeners
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onTimeUpdate = () => setState((s) => ({ ...s, currentTime: el.currentTime }));
    const onDurationChange = () => setState((s) => ({ ...s, duration: el.duration }));
    const onLoadedData = () => setState((s) => ({ ...s, isLoading: false }));
    const onWaiting = () => setState((s) => ({ ...s, isLoading: true }));
    const onCanPlay = () => setState((s) => ({ ...s, isLoading: false }));
    const onError = () => setState((s) => ({ ...s, error: "Failed to load video", isLoading: false }));
    const onEnded = () => setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));

    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("durationchange", onDurationChange);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("error", onError);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("durationchange", onDurationChange);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("error", onError);
      el.removeEventListener("ended", onEnded);
    };
  }, []);

  // MediaSession action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => play());
    navigator.mediaSession.setActionHandler("pause", () => pause());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) seek(details.seekTime);
    });
  }, [play, pause, seek]);

  return {
    videoRef,
    containerRef,
    state,
    currentVideo: currentVideo.current,
    load,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
  };
}