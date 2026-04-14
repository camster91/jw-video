import { ArrowLeft, Heart, Play } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	addFavorite,
	isFavorite as checkIsFavorite,
	removeFavorite,
} from "../services/api";
import type { Video } from "../types";
import { VideoCarousel } from "./VideoCarousel";

interface VideoDetailProps {
	video: Video;
	suggestedVideos: Video[];
	onPlay: (video: Video) => void;
}

export function VideoDetail({
	video,
	suggestedVideos,
	onPlay,
}: VideoDetailProps) {
	const navigate = useNavigate();
	const [isFav, setIsFav] = useState(checkIsFavorite(video.key));
	const [showDesc, setShowDesc] = useState(false);

	const toggleFavorite = () => {
		if (isFav) {
			removeFavorite(video.key);
		} else {
			addFavorite(video.key);
		}
		setIsFav(!isFav);
	};

	const publishedDate = video.firstPublished
		? new Date(video.firstPublished).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})
		: null;

	return (
		<div className="video-detail">
			{/* Hero / Poster area */}
			<div className="video-detail-hero">
				<div className="video-detail-backdrop">
					{video.posterUrl && <img src={video.posterUrl} alt="" />}
					<div className="video-detail-gradient" />
				</div>
				<button
					type="button"
					className="video-detail-back"
					onClick={() => navigate(-1)}
					aria-label="Go back"
				>
					<ArrowLeft size={24} />
				</button>
				<div className="video-detail-hero-content">
					<h1>{video.title}</h1>
					<div className="video-detail-meta">
						{video.durationFormatted && <span>{video.durationFormatted}</span>}
						{publishedDate && <span>{publishedDate}</span>}
					</div>
					<div className="video-detail-actions">
						<button
							type="button"
							className="btn btn-play"
							onClick={() => onPlay(video)}
						>
							<Play size={20} />
							Play
						</button>
						<button
							type="button"
							className={`btn btn-circle ${isFav ? "active" : ""}`}
							onClick={toggleFavorite}
							aria-label={isFav ? "Remove from My List" : "Add to My List"}
						>
							<Heart size={20} fill={isFav ? "currentColor" : "none"} />
						</button>
					</div>
				</div>
			</div>

			{/* Details section */}
			<div className="video-detail-body">
				<div className="video-detail-info">
					{video.description && (
						<div className="video-detail-description">
							<p className={showDesc ? "" : "clamped"}>{video.description}</p>
							{video.description.length > 200 && (
								<button
									type="button"
									className="read-more-btn"
									onClick={() => setShowDesc(!showDesc)}
								>
									{showDesc ? "Show less" : "Read more"}
								</button>
							)}
						</div>
					)}
					{video.files && video.files.length > 0 && (
						<div className="video-detail-quality">
							<h3>Available Qualities</h3>
							<div className="quality-list">
								{video.files
									.filter((f) => f.progressiveDownloadUrl)
									.sort((a, b) => (b.frameHeight ?? 0) - (a.frameHeight ?? 0))
									.map((f) => (
										<a
											key={`${f.label}-${f.frameHeight}`}
											href={f.progressiveDownloadUrl}
											className="quality-badge"
											download
											target="_blank"
											rel="noopener noreferrer"
										>
											{f.label || `${f.frameHeight}p`}
											{f.subtitled && " (Subtitled)"}
										</a>
									))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Suggested videos */}
			{suggestedVideos.length > 0 && (
				<VideoCarousel
					title="More Like This"
					videos={suggestedVideos.slice(0, 15)}
					onPlay={onPlay}
				/>
			)}
		</div>
	);
}
