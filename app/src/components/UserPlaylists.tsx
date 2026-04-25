import {
	Check,
	Copy,
	Edit2,
	Globe,
	Heart,
	Image,
	Plus,
	Share2,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	addVideoToPlaylist,
	createPlaylist,
	deletePlaylist,
	getPlaylistDateFormatted,
	getPlaylists,
	getPlaylistThumbnail,
	getPlaylistVideos,
	importPlaylistFromShareCode,
	isVideoInPlaylist,
	type Playlist,
	removeVideoFromPlaylist,
	sharePlaylist,
	updatePlaylist,
} from "../services/UserPlaylists";
import {
	addToWatchLater,
	getWatchLater,
	isInWatchLater,
	removeFromWatchLater,
} from "../services/WatchLater";
import type { Video } from "../types";
import { VideoCard } from "./VideoCard";

interface UserPlaylistsProps {
	video?: Video; // Optional: if provided, show "Add to Playlist" options for this video
	onClose?: () => void;
}

export function UserPlaylists({ video, onClose }: UserPlaylistsProps) {
	const navigate = useNavigate();
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
		null,
	);
	const [playlistVideos, setPlaylistVideos] = useState<Video[]>([]);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showEditModal, setShowEditModal] = useState(false);
	const [showShareModal, setShowShareModal] = useState(false);
	const [showImportModal, setShowImportModal] = useState(false);
	const [shareCode, setShareCode] = useState("");
	const [copied, setCopied] = useState(false);
	const [shareUrl, setShareUrl] = useState("");

	// Form states
	const [formName, setFormName] = useState("");
	const [formDescription, setFormDescription] = useState("");
	const [formThumbnail, setFormThumbnail] = useState("");
	const [formIsPublic, setFormIsPublic] = useState(false);

	// Load playlists
	useEffect(() => {
		loadPlaylists();
	}, [loadPlaylists]);

	// Load playlist videos when selected
	useEffect(() => {
		if (selectedPlaylist) {
			getPlaylistVideos(selectedPlaylist.id).then(setPlaylistVideos);
		} else {
			setPlaylistVideos([]);
		}
	}, [selectedPlaylist]);

	const loadPlaylists = () => {
		setPlaylists(getPlaylists());
	};

	const handleCreatePlaylist = () => {
		if (!formName.trim()) return;

		createPlaylist(
			formName.trim(),
			formDescription.trim() || undefined,
			formThumbnail.trim() || undefined,
			formIsPublic,
		);
		loadPlaylists();
		resetForm();
		setShowCreateModal(false);
	};

	const handleUpdatePlaylist = () => {
		if (!selectedPlaylist || !formName.trim()) return;

		updatePlaylist(selectedPlaylist.id, {
			name: formName.trim(),
			description: formDescription.trim() || undefined,
			thumbnailUrl: formThumbnail.trim() || undefined,
			isPublic: formIsPublic,
		});
		loadPlaylists();
		resetForm();
		setShowEditModal(false);
	};

	const handleDeletePlaylist = async () => {
		if (!selectedPlaylist) return;

		if (confirm(`Delete "${selectedPlaylist.name}"? This cannot be undone.`)) {
			deletePlaylist(selectedPlaylist.id);
			setSelectedPlaylist(null);
			loadPlaylists();
		}
	};

	const handleAddVideoToPlaylist = async (playlistId: string) => {
		if (!video) return;

		addVideoToPlaylist(playlistId, video);
		loadPlaylists();

		// Show brief success feedback
		const btn = document.getElementById(`add-btn-${playlistId}`);
		if (btn) {
			btn.textContent = "Added!";
			setTimeout(() => {
				btn.textContent = "Add";
			}, 1000);
		}
	};

	const handleRemoveVideo = (videoKey: string) => {
		if (!selectedPlaylist) return;

		removeVideoFromPlaylist(selectedPlaylist.id, videoKey);
		getPlaylistVideos(selectedPlaylist.id).then(setPlaylistVideos);
		loadPlaylists();
	};

	const handleShare = () => {
		if (!selectedPlaylist) return;

		const url = sharePlaylist(selectedPlaylist.id);
		if (url) {
			setShareUrl(url);
			setShowShareModal(true);
		}
	};

	const handleCopyShareUrl = async () => {
		try {
			await navigator.clipboard.writeText(shareUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// Fallback
			const textarea = document.createElement("textarea");
			textarea.value = shareUrl;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleImportPlaylist = () => {
		if (!shareCode.trim()) return;

		const imported = importPlaylistFromShareCode(shareCode.trim());
		if (imported) {
			loadPlaylists();
			setShowImportModal(false);
			setShareCode("");
			alert(`Imported "${imported.name}" successfully!`);
		} else {
			alert("Invalid share code. Please check and try again.");
		}
	};

	const openEditModal = (playlist: Playlist) => {
		setSelectedPlaylist(playlist);
		setFormName(playlist.name);
		setFormDescription(playlist.description || "");
		setFormThumbnail(playlist.thumbnailUrl || "");
		setFormIsPublic(playlist.isPublic);
		setShowEditModal(true);
	};

	const resetForm = () => {
		setFormName("");
		setFormDescription("");
		setFormThumbnail("");
		setFormIsPublic(false);
	};

	const _isInAnyPlaylist = (videoKey: string) => {
		return playlists.some((p) => p.videoKeys.includes(videoKey));
	};

	// Render playlist detail view
	if (selectedPlaylist) {
		return (
			<div className="user-playlists-container">
				<div className="playlist-header">
					<button
						type="button"
						className="back-btn"
						onClick={() => setSelectedPlaylist(null)}
					>
						← Back
					</button>
					<div className="playlist-actions">
						<button
							type="button"
							className="icon-btn"
							onClick={() => openEditModal(selectedPlaylist)}
							title="Edit playlist"
						>
							<Edit2 size={18} />
						</button>
						<button
							type="button"
							className="icon-btn"
							onClick={handleShare}
							title="Share playlist"
						>
							<Share2 size={18} />
						</button>
						<button
							type="button"
							className="icon-btn danger"
							onClick={handleDeletePlaylist}
							title="Delete playlist"
						>
							<Trash2 size={18} />
						</button>
					</div>
				</div>

				<div className="playlist-detail">
					<div className="playlist-cover">
						{selectedPlaylist.thumbnailUrl ||
						playlistVideos[0]?.thumbnailUrl ? (
							<img
								src={
									selectedPlaylist.thumbnailUrl ||
									playlistVideos[0]?.thumbnailUrl
								}
								alt={selectedPlaylist.name}
							/>
						) : (
							<div className="playlist-cover-placeholder">
								<Image size={48} />
							</div>
						)}
						{selectedPlaylist.isPublic && (
							<span className="public-badge">
								<Globe size={12} /> Public
							</span>
						)}
					</div>
					<div className="playlist-info">
						<h2>{selectedPlaylist.name}</h2>
						{selectedPlaylist.description && (
							<p className="playlist-description">
								{selectedPlaylist.description}
							</p>
						)}
						<div className="playlist-meta">
							<span>{playlistVideos.length} videos</span>
							<span>•</span>
							<span>Updated {getPlaylistDateFormatted(selectedPlaylist)}</span>
						</div>
					</div>
				</div>

				{playlistVideos.length === 0 ? (
					<div className="empty-playlist">
						<p>This playlist is empty</p>
						{video && (
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => handleAddVideoToPlaylist(selectedPlaylist.id)}
							>
								<Plus size={18} />
								Add current video
							</button>
						)}
					</div>
				) : (
					<div className="playlist-videos">
						{playlistVideos.map((vid, _index) => (
							<div key={vid.key} className="playlist-video-item">
								<VideoCard
									video={vid}
									onPlay={(v) => navigate(`/video/${v.key}`)}
								/>
								<button
									type="button"
									className="remove-video-btn"
									onClick={() => handleRemoveVideo(vid.key)}
									title="Remove from playlist"
								>
									<X size={18} />
								</button>
							</div>
						))}
					</div>
				)}

				{video && (
					<div className="add-to-playlist-section">
						<h3>Add Current Video</h3>
						<button
							type="button"
							className="btn btn-primary"
							onClick={() => handleAddVideoToPlaylist(selectedPlaylist.id)}
							disabled={isVideoInPlaylist(selectedPlaylist.id, video.key)}
						>
							{isVideoInPlaylist(selectedPlaylist.id, video.key) ? (
								<>
									<Check size={18} /> Added
								</>
							) : (
								<>
									<Plus size={18} /> Add to this playlist
								</>
							)}
						</button>
					</div>
				)}
			</div>
		);
	}

	// Render playlists list view
	return (
		<div className="user-playlists-container">
			<div className="playlists-header">
				<h2>My Playlists</h2>
				<div className="playlists-actions">
					<button
						type="button"
						className="btn btn-secondary"
						onClick={() => setShowImportModal(true)}
					>
						<Copy size={18} />
						Import
					</button>
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => setShowCreateModal(true)}
					>
						<Plus size={18} />
						New Playlist
					</button>
				</div>
			</div>

			{/* Watch Later Quick Access */}
			<WatchLaterSection video={video} />

			{/* Playlists Grid */}
			{playlists.length === 0 ? (
				<div className="empty-state">
					<Heart size={48} opacity={0.3} />
					<p>No playlists yet</p>
					<p className="empty-hint">
						Create your first playlist to organize your favorite videos
					</p>
					<button
						type="button"
						className="btn btn-primary"
						onClick={() => setShowCreateModal(true)}
					>
						<Plus size={18} />
						Create Playlist
					</button>
				</div>
			) : (
				<div className="playlists-grid">
					{playlists.map((playlist) => (
						<div
							key={playlist.id}
							className="playlist-card"
							onClick={() => setSelectedPlaylist(playlist)}
						>
							<div className="playlist-card-cover">
								{getPlaylistThumbnail(playlist) ? (
									<img
										src={getPlaylistThumbnail(playlist)!}
										alt={playlist.name}
									/>
								) : (
									<div className="playlist-card-placeholder">
										<Image size={32} />
									</div>
								)}
								{playlist.isPublic && (
									<span className="public-badge-small">
										<Globe size={10} />
									</span>
								)}
							</div>
							<div className="playlist-card-info">
								<h3>{playlist.name}</h3>
								<p className="playlist-card-count">
									{playlist.videoKeys.length} videos
								</p>
								<p className="playlist-card-date">
									{getPlaylistDateFormatted(playlist)}
								</p>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Add video to playlist modal (if video prop provided) */}
			{video && (
				<div className="add-to-playlist-quick">
					<h3>Add to Playlist</h3>
					{playlists.length === 0 ? (
						<p>Create a playlist first</p>
					) : (
						<div className="quick-playlist-list">
							{playlists.map((playlist) => (
								<button
									key={playlist.id}
									type="button"
									id={`add-btn-${playlist.id}`}
									className="quick-playlist-item"
									onClick={() => handleAddVideoToPlaylist(playlist.id)}
									disabled={isVideoInPlaylist(playlist.id, video.key)}
								>
									{isVideoInPlaylist(playlist.id, video.key) ? (
										<>
											<Check size={18} />
											<span>Added</span>
										</>
									) : (
										<>
											<Plus size={18} />
											<span>{playlist.name}</span>
										</>
									)}
								</button>
							))}
						</div>
					)}
				</div>
			)}

			{/* Create Playlist Modal */}
			{showCreateModal && (
				<div
					className="modal-overlay"
					onClick={() => setShowCreateModal(false)}
				>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Create New Playlist</h3>
							<button
								type="button"
								className="modal-close"
								onClick={() => setShowCreateModal(false)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="modal-body">
							<div className="form-group">
								<label>Name</label>
								<input
									type="text"
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
									placeholder="My Awesome Playlist"
								/>
							</div>
							<div className="form-group">
								<label>Description (optional)</label>
								<textarea
									value={formDescription}
									onChange={(e) => setFormDescription(e.target.value)}
									placeholder="What's this playlist about?"
									rows={3}
								/>
							</div>
							<div className="form-group">
								<label>Thumbnail URL (optional)</label>
								<input
									type="url"
									value={formThumbnail}
									onChange={(e) => setFormThumbnail(e.target.value)}
									placeholder="https://example.com/image.jpg"
								/>
							</div>
							<div className="form-group form-checkbox">
								<label>
									<input
										type="checkbox"
										checked={formIsPublic}
										onChange={(e) => setFormIsPublic(e.target.checked)}
									/>
									<span>Make public (shareable)</span>
								</label>
							</div>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => setShowCreateModal(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleCreatePlaylist}
								disabled={!formName.trim()}
							>
								Create
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Edit Playlist Modal */}
			{showEditModal && selectedPlaylist && (
				<div className="modal-overlay" onClick={() => setShowEditModal(false)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Edit Playlist</h3>
							<button
								type="button"
								className="modal-close"
								onClick={() => setShowEditModal(false)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="modal-body">
							<div className="form-group">
								<label>Name</label>
								<input
									type="text"
									value={formName}
									onChange={(e) => setFormName(e.target.value)}
								/>
							</div>
							<div className="form-group">
								<label>Description (optional)</label>
								<textarea
									value={formDescription}
									onChange={(e) => setFormDescription(e.target.value)}
									rows={3}
								/>
							</div>
							<div className="form-group">
								<label>Thumbnail URL (optional)</label>
								<input
									type="url"
									value={formThumbnail}
									onChange={(e) => setFormThumbnail(e.target.value)}
								/>
							</div>
							<div className="form-group form-checkbox">
								<label>
									<input
										type="checkbox"
										checked={formIsPublic}
										onChange={(e) => setFormIsPublic(e.target.checked)}
									/>
									<span>Make public (shareable)</span>
								</label>
							</div>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => setShowEditModal(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleUpdatePlaylist}
								disabled={!formName.trim()}
							>
								Save Changes
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Share Modal */}
			{showShareModal && (
				<div className="modal-overlay" onClick={() => setShowShareModal(false)}>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Share Playlist</h3>
							<button
								type="button"
								className="modal-close"
								onClick={() => setShowShareModal(false)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="modal-body">
							<p>Share this link with others:</p>
							<div className="share-link-container">
								<input
									type="text"
									value={shareUrl}
									readOnly
									className="share-link-input"
								/>
								<button
									type="button"
									className="btn btn-icon"
									onClick={handleCopyShareUrl}
								>
									{copied ? <Check size={18} /> : <Copy size={18} />}
								</button>
							</div>
							{copied && (
								<p className="copy-success">Link copied to clipboard!</p>
							)}
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-primary"
								onClick={() => setShowShareModal(false)}
							>
								Done
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Import Modal */}
			{showImportModal && (
				<div
					className="modal-overlay"
					onClick={() => setShowImportModal(false)}
				>
					<div className="modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h3>Import Playlist</h3>
							<button
								type="button"
								className="modal-close"
								onClick={() => setShowImportModal(false)}
							>
								<X size={20} />
							</button>
						</div>
						<div className="modal-body">
							<p>Enter the share code or URL from a shared playlist:</p>
							<input
								type="text"
								value={shareCode}
								onChange={(e) => setShareCode(e.target.value)}
								placeholder="e.g., abc123xyz or full URL"
								className="full-width-input"
							/>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-secondary"
								onClick={() => setShowImportModal(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={handleImportPlaylist}
								disabled={!shareCode.trim()}
							>
								Import
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Watch Later Section Component ──────────────────────────────────────────

function WatchLaterSection({ video }: { video?: Video }) {
	const navigate = useNavigate();
	const [watchLater, setWatchLater] = useState(getWatchLater());
	const [isInList, setIsInList] = useState(
		video ? isInWatchLater(video.key) : false,
	);

	useEffect(() => {
		setWatchLater(getWatchLater());
		if (video) {
			setIsInList(isInWatchLater(video.key));
		}
	}, [video]);

	const handleToggleWatchLater = () => {
		if (!video) return;

		if (isInList) {
			removeFromWatchLater(video.key);
		} else {
			addToWatchLater(video);
		}
		setIsInList(!isInList);
		setWatchLater(getWatchLater());
	};

	const handleRemoveFromWatchLater = (key: string) => {
		removeFromWatchLater(key);
		setWatchLater(getWatchLater());
	};

	return (
		<div className="watch-later-section">
			<div className="watch-later-header">
				<h3>Watch Later</h3>
				<span className="watch-later-count">{watchLater.length} videos</span>
			</div>

			{video && (
				<button
					type="button"
					className={`btn watch-later-toggle ${isInList ? "active" : ""}`}
					onClick={handleToggleWatchLater}
				>
					{isInList ? (
						<>
							<Check size={18} /> In Watch Later
						</>
					) : (
						<>
							<Plus size={18} /> Add to Watch Later
						</>
					)}
				</button>
			)}

			{watchLater.length === 0 ? (
				<p className="empty-hint">
					Videos you add to watch later will appear here
				</p>
			) : (
				<div className="watch-later-queue">
					{watchLater.slice(0, 5).map((entry) => (
						<div key={entry.key} className="watch-later-item">
							<button
								type="button"
								className="watch-later-video"
								onClick={() => navigate(`/video/${entry.key}`)}
							>
								{entry.video?.thumbnailUrl ? (
									<img src={entry.video.thumbnailUrl} alt="" />
								) : (
									<div className="watch-later-placeholder" />
								)}
								<span className="watch-later-title">
									{entry.video?.title || entry.key}
								</span>
							</button>
							<button
								type="button"
								className="remove-watch-later-btn"
								onClick={() => handleRemoveFromWatchLater(entry.key)}
								title="Remove from Watch Later"
							>
								<X size={16} />
							</button>
						</div>
					))}
					{watchLater.length > 5 && (
						<p className="watch-later-more">+{watchLater.length - 5} more</p>
					)}
				</div>
			)}
		</div>
	);
}
