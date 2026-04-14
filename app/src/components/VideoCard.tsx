import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Video } from "../types";

interface VideoCardProps {
	video: Video;
	onPlay?: (video: Video) => void;
}

export function VideoCard({ video, onPlay }: VideoCardProps) {
	const navigate = useNavigate();
	const [imgLoaded, setImgLoaded] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	return (
		<button
			type="button"
			className="video-card"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => navigate(`/video/${video.key}`)}
		>
			<div className="video-card-image">
				{video.thumbnailUrl ? (
					<img
						src={video.thumbnailUrl}
						alt={video.title}
						loading="lazy"
						onLoad={() => setImgLoaded(true)}
						className={imgLoaded ? "loaded" : ""}
					/>
				) : (
					<div className="video-card-placeholder">
						<svg
							width="40"
							height="40"
							viewBox="0 0 24 24"
							fill="currentColor"
							opacity="0.4"
							aria-label="Video"
						>
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
				)}
				<div className="video-card-duration">{video.durationFormatted}</div>
			</div>

			{isHovered && (
				<div className="video-card-overlay">
					<button
						type="button"
						className="video-card-play-btn"
						onClick={(e) => {
							e.stopPropagation();
							onPlay?.(video);
						}}
						aria-label={`Play ${video.title}`}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M8 5v14l11-7z" />
						</svg>
					</button>
					<div className="video-card-info">
						<h4 className="video-card-title">{video.title}</h4>
					</div>
				</div>
			)}
		</button>
	);
}
