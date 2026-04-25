import {
	AlertTriangle,
	Baby,
	CheckCircle,
	Clock,
	Eye,
	EyeOff,
	History,
	Lock,
	Plus,
	Save,
	Settings,
	Shield,
	ToggleLeft,
	ToggleRight,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVideo } from "../services/api";
import type { Video } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParentalSettings {
	pinHash: string | null;
	isEnabled: boolean;
	kidsMode: boolean;
	allowedRatings: ContentRating[];
	watchTimeLimit: number; // minutes per day
	watchTimeUsed: Record<string, number>; // date -> minutes
	approvedContent: string[]; // video keys
	blockUnapproved: boolean;
	viewingHistory: ViewingHistoryEntry[];
	lastReset: string; // ISO date string
}

export type ContentRating =
	| "G"
	| "PG"
	| "PG-13"
	| "TV-Y"
	| "TV-Y7"
	| "TV-G"
	| "TV-PG"
	| "TV-14"
	| "TV-MA"
	| "R"
	| "NC-17";

export interface ViewingHistoryEntry {
	videoKey: string;
	videoTitle: string;
	watchedAt: number;
	duration: number;
	watchedBy: "parent" | "child" | "unknown";
}

export const ALL_RATINGS: ContentRating[] = [
	"G",
	"PG",
	"PG-13",
	"TV-Y",
	"TV-Y7",
	"TV-G",
	"TV-PG",
	"TV-14",
	"TV-MA",
	"R",
	"NC-17",
];

export const KIDS_RATINGS: ContentRating[] = ["G", "TV-Y", "TV-Y7", "TV-G"];

const DEFAULT_SETTINGS: ParentalSettings = {
	pinHash: null,
	isEnabled: false,
	kidsMode: false,
	allowedRatings: ALL_RATINGS,
	watchTimeLimit: 120, // 2 hours default
	watchTimeUsed: {},
	approvedContent: [],
	blockUnapproved: false,
	viewingHistory: [],
	lastReset: new Date().toISOString().split("T")[0],
};

const STORAGE_KEY = "jw-video-parental-controls";
const PIN_HASH_KEY = "jw-video-pin-hash";

// ─── Utility Functions ──────────────────────────────────────────────────────

function hashPin(pin: string): string {
	// Simple hash for demo - in production use proper crypto
	let hash = 0;
	for (let i = 0; i < pin.length; i++) {
		const char = pin.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return hash.toString(36);
}

function getTodayKey(): string {
	return new Date().toISOString().split("T")[0];
}

function loadSettings(): ParentalSettings {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			// Migrate old pinHash from separate storage
			if (!parsed.pinHash) {
				const oldPinHash = localStorage.getItem(PIN_HASH_KEY);
				if (oldPinHash) {
					parsed.pinHash = oldPinHash;
				}
			}
			return { ...DEFAULT_SETTINGS, ...parsed };
		}
	} catch (error) {
		console.error("Failed to load parental settings:", error);
	}
	return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: ParentalSettings): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.error("Failed to save parental settings:", error);
	}
}

function checkDailyReset(settings: ParentalSettings): ParentalSettings {
	const today = getTodayKey();
	if (settings.lastReset !== today) {
		return {
			...settings,
			watchTimeUsed: {},
			lastReset: today,
		};
	}
	return settings;
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface ParentalControlsProps {
	onSettingsChange?: (settings: ParentalSettings) => void;
}

export function ParentalControls({ onSettingsChange }: ParentalControlsProps) {
	const _navigate = useNavigate();
	const [settings, setSettings] = useState<ParentalSettings>(DEFAULT_SETTINGS);
	const [isLocked, setIsLocked] = useState(false);
	const [showPinModal, setShowPinModal] = useState(false);
	const [pinInput, setPinInput] = useState("");
	const [pinError, setPinError] = useState("");
	const [showPin, setShowPin] = useState(false);
	const [activeTab, setActiveTab] = useState<
		"settings" | "history" | "approved"
	>("settings");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [showPinSetup, setShowPinSetup] = useState(false);

	// Load settings on mount
	useEffect(() => {
		let loaded = loadSettings();
		loaded = checkDailyReset(loaded);
		setSettings(loaded);
		setIsLocked(loaded.isEnabled && loaded.pinHash !== null);
	}, []);

	// Notify parent of settings changes
	useEffect(() => {
		onSettingsChange?.(settings);
	}, [settings, onSettingsChange]);

	const handleUnlock = () => {
		if (!settings.pinHash) {
			setIsLocked(false);
			return;
		}

		if (hashPin(pinInput) === settings.pinHash) {
			setIsLocked(false);
			setShowPinModal(false);
			setPinInput("");
			setPinError("");
		} else {
			setPinError("Incorrect PIN");
		}
	};

	const handleSettingsChange = (updates: Partial<ParentalSettings>) => {
		const newSettings = { ...settings, ...updates };
		setSettings(newSettings);
		saveSettings(newSettings);
	};

	const handleSetupPin = () => {
		if (newPin.length < 4) {
			setPinError("PIN must be at least 4 digits");
			return;
		}
		if (newPin !== confirmPin) {
			setPinError("PINs do not match");
			return;
		}
		handleSettingsChange({ pinHash: hashPin(newPin) });
		setShowPinSetup(false);
		setNewPin("");
		setConfirmPin("");
		setPinError("");
	};

	const handleRemovePin = () => {
		handleSettingsChange({ pinHash: null });
		setIsLocked(false);
	};

	const handleToggleKidsMode = () => {
		const newKidsMode = !settings.kidsMode;
		handleSettingsChange({
			kidsMode: newKidsMode,
			allowedRatings: newKidsMode ? KIDS_RATINGS : ALL_RATINGS,
			blockUnapproved: newKidsMode ? true : settings.blockUnapproved,
		});
	};

	const handleToggleRating = (rating: ContentRating) => {
		if (settings.allowedRatings.includes(rating)) {
			// Don't allow removing if it's the last rating
			if (settings.allowedRatings.length > 1) {
				handleSettingsChange({
					allowedRatings: settings.allowedRatings.filter((r) => r !== rating),
				});
			}
		} else {
			handleSettingsChange({
				allowedRatings: [...settings.allowedRatings, rating],
			});
		}
	};

	const handleAddApprovedContent = async (videoKey: string) => {
		if (!settings.approvedContent.includes(videoKey)) {
			handleSettingsChange({
				approvedContent: [...settings.approvedContent, videoKey],
			});
		}
	};

	const handleRemoveApprovedContent = (videoKey: string) => {
		handleSettingsChange({
			approvedContent: settings.approvedContent.filter((k) => k !== videoKey),
		});
	};

	const handleClearHistory = () => {
		if (confirm("Clear all viewing history?")) {
			handleSettingsChange({ viewingHistory: [] });
		}
	};

	const _handleAddViewingEntry = (
		entry: Omit<ViewingHistoryEntry, "watchedBy">,
	) => {
		const newEntry: ViewingHistoryEntry = {
			...entry,
			watchedBy: settings.kidsMode ? "child" : "parent",
		};
		handleSettingsChange({
			viewingHistory: [newEntry, ...settings.viewingHistory].slice(0, 100),
		});
	};

	const _handleUpdateTimeUsed = (minutes: number) => {
		const today = getTodayKey();
		const current = settings.watchTimeUsed[today] || 0;
		handleSettingsChange({
			watchTimeUsed: {
				...settings.watchTimeUsed,
				[today]: current + minutes,
			},
		});
	};

	const getTodayTimeUsed = () => {
		return settings.watchTimeUsed[getTodayKey()] || 0;
	};

	const isTimeLimitExceeded = () => {
		return getTodayTimeUsed() >= settings.watchTimeLimit;
	};

	const _isContentApproved = (videoKey: string) => {
		if (!settings.blockUnapproved) return true;
		return settings.approvedContent.includes(videoKey);
	};

	const _isRatingAllowed = (rating: ContentRating | undefined) => {
		if (!rating) return !settings.blockUnapproved;
		return settings.allowedRatings.includes(rating);
	};

	// If locked, show PIN modal
	if (settings.isEnabled && isLocked && !showPinModal) {
		setShowPinModal(true);
	}

	return (
		<div className="parental-controls">
			{showPinModal && settings.pinHash && (
				<PINModal
					pinInput={pinInput}
					setPinInput={setPinInput}
					showPin={showPin}
					setShowPin={setShowPin}
					pinError={pinError}
					onSubmit={handleUnlock}
					onClose={() => {
						if (settings.pinHash) {
							setShowPinModal(false);
						}
					}}
				/>
			)}

			<div className="parental-controls-header">
				<h2>
					<Shield size={24} />
					Parental Controls
				</h2>
				<div className="status-indicators">
					{settings.kidsMode && (
						<span className="badge kids-mode">
							<Baby size={14} /> Kids Mode
						</span>
					)}
					{isTimeLimitExceeded() && (
						<span className="badge time-exceeded">
							<AlertTriangle size={14} /> Time Limit Reached
						</span>
					)}
				</div>
			</div>

			<div className="parental-tabs">
				<button
					type="button"
					className={`tab ${activeTab === "settings" ? "active" : ""}`}
					onClick={() => setActiveTab("settings")}
				>
					<Settings size={18} /> Settings
				</button>
				<button
					type="button"
					className={`tab ${activeTab === "history" ? "active" : ""}`}
					onClick={() => setActiveTab("history")}
				>
					<History size={18} /> Viewing History
				</button>
				<button
					type="button"
					className={`tab ${activeTab === "approved" ? "active" : ""}`}
					onClick={() => setActiveTab("approved")}
				>
					<CheckCircle size={18} /> Approved Content
				</button>
			</div>

			{activeTab === "settings" && (
				<SettingsTab
					settings={settings}
					showPinSetup={showPinSetup}
					setShowPinSetup={setShowPinSetup}
					newPin={newPin}
					setNewPin={setNewPin}
					confirmPin={confirmPin}
					setConfirmPin={setConfirmPin}
					pinError={pinError}
					setPinError={setPinError}
					onToggleEnabled={() =>
						handleSettingsChange({ isEnabled: !settings.isEnabled })
					}
					onToggleKidsMode={handleToggleKidsMode}
					onToggleRating={handleToggleRating}
					onSetupPin={handleSetupPin}
					onRemovePin={handleRemovePin}
					onRemovePinLock={handleRemovePin}
					onUpdateTimeLimit={(limit) =>
						handleSettingsChange({ watchTimeLimit: limit })
					}
					onToggleBlockUnapproved={() =>
						handleSettingsChange({ blockUnapproved: !settings.blockUnapproved })
					}
					getTodayTimeUsed={getTodayTimeUsed}
					isTimeLimitExceeded={isTimeLimitExceeded}
				/>
			)}

			{activeTab === "history" && (
				<HistoryTab
					viewingHistory={settings.viewingHistory}
					onClearHistory={handleClearHistory}
					onRemoveEntry={(videoKey) => {
						handleSettingsChange({
							viewingHistory: settings.viewingHistory.filter(
								(e) => e.videoKey !== videoKey,
							),
						});
					}}
				/>
			)}

			{activeTab === "approved" && (
				<ApprovedContentTab
					approvedContent={settings.approvedContent}
					onRemoveContent={handleRemoveApprovedContent}
					onAddContent={handleAddApprovedContent}
				/>
			)}
		</div>
	);
}

// ─── PIN Modal ──────────────────────────────────────────────────────────────

interface PINModalProps {
	pinInput: string;
	setPinInput: (pin: string) => void;
	showPin: boolean;
	setShowPin: (show: boolean) => void;
	pinError: string;
	onSubmit: () => void;
	onClose: () => void;
}

function PINModal({
	pinInput,
	setPinInput,
	showPin,
	setShowPin,
	pinError,
	onSubmit,
	onClose,
}: PINModalProps) {
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div
				className="modal-content pin-modal"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-header">
					<h3>
						<Lock size={20} />
						Enter PIN
					</h3>
					<button type="button" className="modal-close" onClick={onClose}>
						<X size={20} />
					</button>
				</div>
				<div className="modal-body">
					<div className="pin-input-container">
						<input
							type={showPin ? "text" : "password"}
							value={pinInput}
							onChange={(e) => {
								// Only allow digits
								const value = e.target.value.replace(/\D/g, "");
								setPinInput(value);
							}}
							placeholder="Enter 4-digit PIN"
							maxLength={8}
							className="pin-input"
						/>
						<button
							type="button"
							className="toggle-pin-btn"
							onClick={() => setShowPin(!showPin)}
						>
							{showPin ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
					{pinError && <p className="error-text">{pinError}</p>}
					<button
						type="button"
						className="btn btn-primary btn-full"
						onClick={onSubmit}
						disabled={pinInput.length < 4}
					>
						Unlock Settings
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Settings Tab ───────────────────────────────────────────────────────────

interface SettingsTabProps {
	settings: ParentalSettings;
	showPinSetup: boolean;
	setShowPinSetup: (show: boolean) => void;
	newPin: string;
	setNewPin: (pin: string) => void;
	confirmPin: string;
	setConfirmPin: (pin: string) => void;
	pinError: string;
	setPinError: (error: string) => void;
	onToggleEnabled: () => void;
	onToggleKidsMode: () => void;
	onToggleRating: (rating: ContentRating) => void;
	onSetupPin: () => void;
	onRemovePin: () => void;
	onRemovePinLock: () => void;
	onUpdateTimeLimit: (limit: number) => void;
	onToggleBlockUnapproved: () => void;
	getTodayTimeUsed: () => number;
	isTimeLimitExceeded: () => boolean;
}

function SettingsTab({
	settings,
	showPinSetup,
	setShowPinSetup,
	newPin,
	setNewPin,
	confirmPin,
	setConfirmPin,
	pinError,
	setPinError,
	onToggleEnabled,
	onToggleKidsMode,
	onToggleRating,
	onSetupPin,
	onRemovePin,
	onRemovePinLock,
	onUpdateTimeLimit,
	onToggleBlockUnapproved,
	getTodayTimeUsed,
	isTimeLimitExceeded,
}: SettingsTabProps) {
	return (
		<div className="settings-tab">
			{/* Enable/Disable Parental Controls */}
			<section className="settings-section">
				<h3>Parental Controls</h3>
				<div className="setting-row">
					<div className="setting-info">
						<span className="setting-label">Enable Parental Controls</span>
						<p className="setting-description">
							Activate content filtering and time limits
						</p>
					</div>
					<button
						type="button"
						className="toggle-btn"
						onClick={onToggleEnabled}
						aria-pressed={settings.isEnabled}
					>
						{settings.isEnabled ? (
							<ToggleRight className="enabled" />
						) : (
							<ToggleLeft className="disabled" />
						)}
					</button>
				</div>
			</section>

			{/* Kids Mode */}
			<section className="settings-section">
				<h3>Kids Mode</h3>
				<div className="setting-row">
					<div className="setting-info">
						<span className="setting-label">Kids Mode</span>
						<p className="setting-description">
							Restrict content to kid-friendly ratings only
						</p>
					</div>
					<button
						type="button"
						className="toggle-btn"
						onClick={onToggleKidsMode}
						disabled={!settings.isEnabled}
						aria-pressed={settings.kidsMode}
					>
						{settings.kidsMode ? (
							<ToggleRight className="enabled" />
						) : (
							<ToggleLeft className="disabled" />
						)}
					</button>
				</div>
			</section>

			{/* PIN Protection */}
			<section className="settings-section">
				<h3>PIN Protection</h3>
				{settings.pinHash ? (
					<>
						<div className="setting-row">
							<div className="setting-info">
								<span className="setting-label">PIN Lock Active</span>
								<p className="setting-description">
									Settings are protected with a PIN
								</p>
							</div>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={onRemovePinLock}
							>
								Remove PIN
							</button>
						</div>
						<div className="setting-row">
							<div className="setting-info">
								<span className="setting-label">Change PIN</span>
								<p className="setting-description">
									Set a new PIN for parental controls
								</p>
							</div>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={() => setShowPinSetup(true)}
							>
								Change
							</button>
						</div>
					</>
				) : (
					<div className="setting-row">
						<div className="setting-info">
							<span className="setting-label">Set Up PIN</span>
							<p className="setting-description">
								Protect settings with a 4-digit PIN
							</p>
						</div>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={() => setShowPinSetup(true)}
							disabled={!settings.isEnabled}
						>
							Set PIN
						</button>
					</div>
				)}

				{showPinSetup && (
					<div className="pin-setup-container">
						<div className="pin-setup-fields">
							<input
								type="password"
								value={newPin}
								onChange={(e) => {
									setNewPin(e.target.value.replace(/\D/g, ""));
									setPinError("");
								}}
								placeholder="New PIN (4+ digits)"
								maxLength={8}
								className="pin-setup-input"
							/>
							<input
								type="password"
								value={confirmPin}
								onChange={(e) => {
									setConfirmPin(e.target.value.replace(/\D/g, ""));
									setPinError("");
								}}
								placeholder="Confirm PIN"
								maxLength={8}
								className="pin-setup-input"
							/>
						</div>
						{pinError && <p className="error-text">{pinError}</p>}
						<div className="pin-setup-actions">
							<button
								type="button"
								className="btn btn-primary btn-sm"
								onClick={onSetupPin}
							>
								<Save size={16} /> Save PIN
							</button>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={() => {
									setShowPinSetup(false);
									setNewPin("");
									setConfirmPin("");
									setPinError("");
								}}
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</section>

			{/* Content Rating Filters */}
			<section className="settings-section">
				<h3>Content Rating Filters</h3>
				<p className="section-description">
					Select which content ratings are allowed
				</p>
				<div className="rating-grid">
					{ALL_RATINGS.map((rating) => (
						<button
							key={rating}
							type="button"
							className={`rating-btn ${settings.allowedRatings.includes(rating) ? "selected" : ""}`}
							onClick={() => onToggleRating(rating)}
							disabled={!settings.isEnabled}
						>
							{rating}
						</button>
					))}
				</div>
			</section>

			{/* Watch Time Limits */}
			<section className="settings-section">
				<h3>Watch Time Limits</h3>
				<div className="setting-row time-limit-row">
					<div className="setting-info">
						<span className="setting-label">Daily Limit (minutes)</span>
						<p className="setting-description">Maximum watch time per day</p>
					</div>
					<div className="time-limit-controls">
						<button
							type="button"
							className="btn btn-secondary btn-sm"
							onClick={() =>
								onUpdateTimeLimit(Math.max(15, settings.watchTimeLimit - 15))
							}
							disabled={!settings.isEnabled}
						>
							-
						</button>
						<span className="time-limit-value">
							{settings.watchTimeLimit} min
						</span>
						<button
							type="button"
							className="btn btn-secondary btn-sm"
							onClick={() => onUpdateTimeLimit(settings.watchTimeLimit + 15)}
							disabled={!settings.isEnabled}
						>
							+
						</button>
					</div>
				</div>
				<div className="time-usage-display">
					<div className="time-used">
						<Clock size={16} />
						Today: {getTodayTimeUsed()} / {settings.watchTimeLimit} minutes
					</div>
					{isTimeLimitExceeded() && (
						<span className="time-exceeded-warning">
							<AlertTriangle size={14} /> Limit exceeded
						</span>
					)}
				</div>
			</section>

			{/* Block Unapproved Content */}
			<section className="settings-section">
				<h3>Content Approval</h3>
				<div className="setting-row">
					<div className="setting-info">
						<span className="setting-label">Block Unapproved Content</span>
						<p className="setting-description">
							Only allow videos from the approved list
						</p>
					</div>
					<button
						type="button"
						className="toggle-btn"
						onClick={onToggleBlockUnapproved}
						disabled={!settings.isEnabled}
						aria-pressed={settings.blockUnapproved}
					>
						{settings.blockUnapproved ? (
							<ToggleRight className="enabled" />
						) : (
							<ToggleLeft className="disabled" />
						)}
					</button>
				</div>
			</section>
		</div>
	);
}

// ─── History Tab ────────────────────────────────────────────────────────────

interface HistoryTabProps {
	viewingHistory: ViewingHistoryEntry[];
	onClearHistory: () => void;
	onRemoveEntry: (videoKey: string) => void;
}

function HistoryTab({
	viewingHistory,
	onClearHistory,
	onRemoveEntry,
}: HistoryTabProps) {
	const navigate = useNavigate();
	const [videos, setVideos] = useState<Record<string, Video>>({});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadVideos = async () => {
			const videoMap: Record<string, Video> = {};
			for (const entry of viewingHistory) {
				if (!videos[entry.videoKey]) {
					const video = await getVideo(entry.videoKey);
					if (video) {
						videoMap[entry.videoKey] = video;
					}
				}
			}
			if (Object.keys(videoMap).length > 0) {
				setVideos((prev) => ({ ...prev, ...videoMap }));
			}
			setLoading(false);
		};
		loadVideos();
	}, [viewingHistory, videos]);

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleString("en-US", {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDuration = (seconds: number) => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		}
		return `${minutes}m`;
	};

	const groupByDate = () => {
		const groups: Record<string, ViewingHistoryEntry[]> = {};
		viewingHistory.forEach((entry) => {
			const date = new Date(entry.watchedAt).toISOString().split("T")[0];
			if (!groups[date]) {
				groups[date] = [];
			}
			groups[date].push(entry);
		});
		return groups;
	};

	const groupedHistory = groupByDate();

	return (
		<div className="history-tab">
			<div className="history-header">
				<h3>Viewing History</h3>
				{viewingHistory.length > 0 && (
					<button
						type="button"
						className="btn btn-danger btn-sm"
						onClick={onClearHistory}
					>
						<Trash2 size={16} /> Clear All
					</button>
				)}
			</div>

			{loading ? (
				<div className="loading-state">Loading history...</div>
			) : viewingHistory.length === 0 ? (
				<div className="empty-state">
					<History size={48} />
					<p>No viewing history yet</p>
				</div>
			) : (
				<div className="history-list">
					{Object.entries(groupedHistory).map(([date, entries]) => (
						<div key={date} className="history-date-group">
							<h4 className="history-date">
								{new Date(date).toLocaleDateString("en-US", {
									weekday: "long",
									month: "long",
									day: "numeric",
								})}
							</h4>
							{entries.map((entry) => (
								<div key={entry.videoKey} className="history-entry">
									<div className="history-entry-info">
										{videos[entry.videoKey]?.thumbnailUrl && (
											<img
												src={videos[entry.videoKey].thumbnailUrl}
												alt=""
												className="history-thumbnail"
											/>
										)}
										<div className="history-details">
											<h4
												className="history-title"
												onClick={() => navigate(`/video/${entry.videoKey}`)}
											>
												{entry.videoTitle}
											</h4>
											<p className="history-meta">
												<span className={`watcher-badge ${entry.watchedBy}`}>
													{entry.watchedBy === "child" ? (
														<Baby size={12} />
													) : entry.watchedBy === "parent" ? (
														<Shield size={12} />
													) : null}
													{entry.watchedBy}
												</span>
												<span>{formatDate(entry.watchedAt)}</span>
												<span>{formatDuration(entry.duration)}</span>
											</p>
										</div>
									</div>
									<button
										type="button"
										className="remove-history-btn"
										onClick={() => onRemoveEntry(entry.videoKey)}
										title="Remove from history"
									>
										<X size={16} />
									</button>
								</div>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Approved Content Tab ───────────────────────────────────────────────────

interface ApprovedContentTabProps {
	approvedContent: string[];
	onRemoveContent: (videoKey: string) => void;
	onAddContent: (videoKey: string) => void;
}

function ApprovedContentTab({
	approvedContent,
	onRemoveContent,
	onAddContent,
}: ApprovedContentTabProps) {
	const [videos, setVideos] = useState<Record<string, Video>>({});
	const [loading, setLoading] = useState(true);
	const [addVideoKey, setAddVideoKey] = useState("");

	useEffect(() => {
		const loadVideos = async () => {
			const videoMap: Record<string, Video> = {};
			for (const key of approvedContent) {
				const video = await getVideo(key);
				if (video) {
					videoMap[key] = video;
				}
			}
			setVideos(videoMap);
			setLoading(false);
		};
		loadVideos();
	}, [approvedContent]);

	const handleAdd = () => {
		if (addVideoKey.trim() && !approvedContent.includes(addVideoKey.trim())) {
			onAddContent(addVideoKey.trim());
			setAddVideoKey("");
		}
	};

	return (
		<div className="approved-content-tab">
			<div className="approved-header">
				<h3>Approved Content List</h3>
				<p className="section-description">
					Videos in this list are always allowed, regardless of rating filters
				</p>
			</div>

			<div className="add-approved-container">
				<input
					type="text"
					value={addVideoKey}
					onChange={(e) => setAddVideoKey(e.target.value)}
					placeholder="Enter video key to approve"
					className="add-approved-input"
					onKeyPress={(e) => e.key === "Enter" && handleAdd()}
				/>
				<button
					type="button"
					className="btn btn-primary btn-sm"
					onClick={handleAdd}
					disabled={!addVideoKey.trim()}
				>
					<Plus size={16} /> Add
				</button>
			</div>

			{loading ? (
				<div className="loading-state">Loading approved content...</div>
			) : approvedContent.length === 0 ? (
				<div className="empty-state">
					<CheckCircle size={48} />
					<p>No approved content yet</p>
					<p className="empty-hint">
						Add video keys to create an approved list
					</p>
				</div>
			) : (
				<div className="approved-list">
					{approvedContent.map((key) => (
						<div key={key} className="approved-item">
							<div className="approved-item-info">
								{videos[key]?.thumbnailUrl ? (
									<img
										src={videos[key].thumbnailUrl}
										alt=""
										className="approved-thumbnail"
									/>
								) : (
									<div className="approved-thumbnail-placeholder">
										<CheckCircle size={24} />
									</div>
								)}
								<div className="approved-details">
									<h4>{videos[key]?.title || key}</h4>
									<p className="approved-key">{key}</p>
								</div>
							</div>
							<button
								type="button"
								className="remove-approved-btn"
								onClick={() => onRemoveContent(key)}
								title="Remove from approved list"
							>
								<X size={16} />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Helper Functions for Content Filtering ─────────────────────────────────

/**
 * Check if a video should be filtered based on parental settings
 */
export function shouldFilterVideo(
	video: Video & { rating?: ContentRating },
	settings: ParentalSettings,
): boolean {
	// If parental controls disabled, don't filter
	if (!settings.isEnabled) return false;

	// If kids mode is on, only allow kids ratings
	if (settings.kidsMode) {
		if (!video.rating || !KIDS_RATINGS.includes(video.rating)) {
			return true;
		}
	}

	// If block unapproved is on, check approved list first
	if (settings.blockUnapproved) {
		if (settings.approvedContent.includes(video.key)) {
			return false; // Approved content always allowed
		}
		return true; // Unapproved content blocked
	}

	// Check rating filter
	if (video.rating && !settings.allowedRatings.includes(video.rating)) {
		return true;
	}

	return false;
}

/**
 * Filter a list of videos based on parental settings
 */
export function filterVideosByParentalControls(
	videos: Video[],
	settings: ParentalSettings,
): Video[] {
	if (!settings.isEnabled) return videos;

	return videos.filter((video) => !shouldFilterVideo(video as any, settings));
}

/**
 * Check if watch time limit has been exceeded
 */
export function isWatchTimeExceeded(settings: ParentalSettings): boolean {
	const today = getTodayKey();
	const used = settings.watchTimeUsed[today] || 0;
	return settings.isEnabled && used >= settings.watchTimeLimit;
}

// ─── Export Settings Management ─────────────────────────────────────────────

/**
 * Export parental settings for backup
 */
export function exportParentalSettings(): string {
	const settings = loadSettings();
	return JSON.stringify(settings, null, 2);
}

/**
 * Import parental settings from backup
 */
export function importParentalSettings(json: string): boolean {
	try {
		const settings = JSON.parse(json) as ParentalSettings;
		// Validate required fields
		if (typeof settings !== "object") return false;
		saveSettings(settings);
		return true;
	} catch {
		return false;
	}
}

/**
 * Reset all parental settings to default
 */
export function resetParentalSettings(): void {
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(PIN_HASH_KEY);
}
