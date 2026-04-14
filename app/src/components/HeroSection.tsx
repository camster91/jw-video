import { Link } from "react-router-dom";
import type { Video } from "../types";

interface HeroSectionProps {
	video: Video;
	onPlay: (video: Video) => void;
}

export function HeroSection({ video, onPlay }: HeroSectionProps) {
	return (
		<section className="hero-section">
			<div className="hero-backdrop">
				{video.posterUrl && (
					<img src={video.posterUrl} alt="" className="hero-image" />
				)}
				<div className="hero-gradient" />
			</div>
			<div className="hero-content">
				<h1 className="hero-title">{video.title}</h1>
				{video.description && (
					<p className="hero-description">{video.description}</p>
				)}
				<div className="hero-meta">
					{video.durationFormatted && (
						<span className="hero-duration">{video.durationFormatted}</span>
					)}
					{video.firstPublished && (
						<span className="hero-date">
							{new Date(video.firstPublished).toLocaleDateString()}
						</span>
					)}
				</div>
				<div className="hero-actions">
					<button
						type="button"
						className="btn btn-play"
						onClick={() => onPlay(video)}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path d="M8 5v14l11-7z" />
						</svg>
						Play
					</button>
					<Link to={`/video/${video.key}`} className="btn btn-info">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="12" y1="16" x2="12" y2="12" />
							<line x1="12" y1="8" x2="12.01" y2="8" />
						</svg>
						More Info
					</Link>
				</div>
			</div>
		</section>
	);
}
