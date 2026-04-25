import {
	Baby,
	Check,
	Edit2,
	Film,
	History,
	Plus,
	Shield,
	Star,
	Switch,
	Trash2,
	X,
} from "lucide-react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { getVideo, removeFromHistory } from "../services/api";
import type { Video } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
	id: string;
	name: string;
	avatar: AvatarType;
	isKidsProfile: boolean;
	watchHistory: WatchHistoryEntry[];
	favorites: string[]; // video keys
	recommendations: string[]; // video keys
	createdAt: number;
	lastActiveAt?: number;
	parentalPin?: string; // for kids profiles
	allowedRatings?: string[]; // for kids profiles
	dailyWatchLimit?: number; // minutes, for kids profiles
	todayWatchTime?: number; // minutes watched today
}

export type AvatarType =
	| "avatar1"
	| "avatar2"
	| "avatar3"
	| "avatar4"
	| "avatar5"
	| "avatar6"
	| "avatar7"
	| "avatar8";

export interface WatchHistoryEntry {
	videoKey: string;
	watchedAt: number;
	progress: number;
	lastPosition: number;
	duration: number;
}

export interface ProfileContextType {
	currentProfile: UserProfile | null;
	allProfiles: UserProfile[];
	selectProfile: (profileId: string) => void;
	createProfile: (
		name: string,
		avatar: AvatarType,
		isKids: boolean,
	) => UserProfile;
	updateProfile: (profileId: string, updates: Partial<UserProfile>) => void;
	deleteProfile: (profileId: string) => void;
	addToWatchHistory: (profileId: string, entry: WatchHistoryEntry) => void;
	addToFavorites: (profileId: string, videoKey: string) => void;
	removeFromFavorites: (profileId: string, videoKey: string) => void;
	getRecommendations: (profileId: string) => Video[];
	isKidsMode: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "jw-video-profiles";
const CURRENT_PROFILE_KEY = "jw-video-current-profile";

const AVATAR_COLORS: Record<AvatarType, string> = {
	avatar1: "bg-gradient-to-br from-red-400 to-red-600",
	avatar2: "bg-gradient-to-br from-blue-400 to-blue-600",
	avatar3: "bg-gradient-to-br from-green-400 to-green-600",
	avatar4: "bg-gradient-to-br from-yellow-400 to-yellow-600",
	avatar5: "bg-gradient-to-br from-purple-400 to-purple-600",
	avatar6: "bg-gradient-to-br from-pink-400 to-pink-600",
	avatar7: "bg-gradient-to-br from-indigo-400 to-indigo-600",
	avatar8: "bg-gradient-to-br from-orange-400 to-orange-600",
};

const AVATAR_ICONS: Record<AvatarType, string> = {
	avatar1: "🎬",
	avatar2: "🍿",
	avatar3: "🎭",
	avatar4: "⭐",
	avatar5: "🎪",
	avatar6: "🎨",
	avatar7: "🎯",
	avatar8: "🚀",
};

const DEFAULT_KIDS_RATINGS = ["G", "TV-Y", "TV-Y7", "TV-G"];
const DEFAULT_DAILY_LIMIT = 120; // 2 hours

// ─── Context ────────────────────────────────────────────────────────────────

const ProfileContext = createContext<ProfileContextType | null>(null);

export function useUserProfile(): ProfileContextType {
	const context = useContext(ProfileContext);
	if (!context) {
		throw new Error("useUserProfile must be used within UserProfileProvider");
	}
	return context;
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function generateId(): string {
	return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getTodayKey(): string {
	return new Date().toISOString().split("T")[0];
}

function loadProfiles(): UserProfile[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error("Failed to load profiles:", error);
	}
	return [];
}

function saveProfiles(profiles: UserProfile[]): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
	} catch (error) {
		console.error("Failed to save profiles:", error);
	}
}

function loadCurrentProfileId(): string | null {
	return localStorage.getItem(CURRENT_PROFILE_KEY);
}

function saveCurrentProfileId(profileId: string | null): void {
	if (profileId) {
		localStorage.setItem(CURRENT_PROFILE_KEY, profileId);
	} else {
		localStorage.removeItem(CURRENT_PROFILE_KEY);
	}
}

// ─── Provider Component ─────────────────────────────────────────────────────

interface UserProfileProviderProps {
	children: React.ReactNode;
}

export function UserProfileProvider({ children }: UserProfileProviderProps) {
	const [profiles, setProfiles] = useState<UserProfile[]>([]);
	const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		const storedProfiles = loadProfiles();
		const storedCurrentId = loadCurrentProfileId();

		if (storedProfiles.length === 0) {
			// Create default profile if none exist
			const defaultProfile: UserProfile = {
				id: generateId(),
				name: "Default",
				avatar: "avatar1",
				isKidsProfile: false,
				watchHistory: [],
				favorites: [],
				recommendations: [],
				createdAt: Date.now(),
				lastActiveAt: Date.now(),
			};
			setProfiles([defaultProfile]);
			setCurrentProfileId(defaultProfile.id);
			saveProfiles([defaultProfile]);
			saveCurrentProfileId(defaultProfile.id);
		} else {
			setProfiles(storedProfiles);
			if (
				storedCurrentId &&
				storedProfiles.find((p) => p.id === storedCurrentId)
			) {
				setCurrentProfileId(storedCurrentId);
			} else {
				setCurrentProfileId(storedProfiles[0].id);
				saveCurrentProfileId(storedProfiles[0].id);
			}
		}
		setIsLoaded(true);
	}, []);

	const selectProfile = useCallback((profileId: string) => {
		setCurrentProfileId(profileId);
		saveCurrentProfileId(profileId);
		setProfiles((prev) =>
			prev.map((p) =>
				p.id === profileId ? { ...p, lastActiveAt: Date.now() } : p,
			),
		);
	}, []);

	const createProfile = useCallback(
		(name: string, avatar: AvatarType, isKids: boolean): UserProfile => {
			const newProfile: UserProfile = {
				id: generateId(),
				name,
				avatar,
				isKidsProfile: isKids,
				watchHistory: [],
				favorites: [],
				recommendations: [],
				createdAt: Date.now(),
				lastActiveAt: Date.now(),
				...(isKids && {
					parentalPin: undefined,
					allowedRatings: DEFAULT_KIDS_RATINGS,
					dailyWatchLimit: DEFAULT_DAILY_LIMIT,
					todayWatchTime: 0,
				}),
			};
			setProfiles((prev) => {
				const updated = [...prev, newProfile];
				saveProfiles(updated);
				return updated;
			});
			return newProfile;
		},
		[],
	);

	const updateProfile = useCallback(
		(profileId: string, updates: Partial<UserProfile>) => {
			setProfiles((prev) => {
				const updated = prev.map((p) =>
					p.id === profileId ? { ...p, ...updates } : p,
				);
				saveProfiles(updated);
				return updated;
			});
		},
		[],
	);

	const deleteProfile = useCallback(
		(profileId: string) => {
			if (profiles.length <= 1) {
				alert("Cannot delete the last profile");
				return;
			}
			setProfiles((prev) => {
				const updated = prev.filter((p) => p.id !== profileId);
				saveProfiles(updated);
				return updated;
			});
			if (currentProfileId === profileId) {
				const remaining = profiles.filter((p) => p.id !== profileId);
				setCurrentProfileId(remaining[0]?.id || null);
				saveCurrentProfileId(remaining[0]?.id || null);
			}
		},
		[profiles, currentProfileId],
	);

	const addToWatchHistory = useCallback(
		(profileId: string, entry: WatchHistoryEntry) => {
			setProfiles((prev) => {
				const updated = prev.map((p) => {
					if (p.id !== profileId) return p;

					// Remove existing entry for same video
					const filteredHistory = p.watchHistory.filter(
						(h) => h.videoKey !== entry.videoKey,
					);
					// Add new entry at the beginning
					const newHistory = [entry, ...filteredHistory].slice(0, 100); // Keep last 100

					// Update today's watch time for kids profiles
					let todayWatchTime = p.todayWatchTime || 0;
					if (p.isKidsProfile) {
						const todayKey = getTodayKey();
						const todayEntry = p.watchHistory.find((h) => {
							const entryDate = new Date(h.watchedAt)
								.toISOString()
								.split("T")[0];
							return entryDate === todayKey;
						});
						if (!todayEntry || todayEntry.videoKey !== entry.videoKey) {
							// Only add if it's a new video or rewatch
							todayWatchTime += Math.floor(entry.duration / 60);
						}
					}

					return {
						...p,
						watchHistory: newHistory,
						todayWatchTime,
					};
				});
				saveProfiles(updated);
				return updated;
			});
		},
		[],
	);

	const addToFavorites = useCallback((profileId: string, videoKey: string) => {
		setProfiles((prev) => {
			const updated = prev.map((p) => {
				if (p.id !== profileId) return p;
				if (p.favorites.includes(videoKey)) return p;
				return { ...p, favorites: [...p.favorites, videoKey] };
			});
			saveProfiles(updated);
			return updated;
		});
	}, []);

	const removeFromFavorites = useCallback(
		(profileId: string, videoKey: string) => {
			setProfiles((prev) => {
				const updated = prev.map((p) => {
					if (p.id !== profileId) return p;
					return {
						...p,
						favorites: p.favorites.filter((key) => key !== videoKey),
					};
				});
				saveProfiles(updated);
				return updated;
			});
		},
		[],
	);

	const getRecommendations = useCallback(
		(profileId: string): Video[] => {
			// This would normally fetch from an API based on watch history
			// For now, return empty array - can be enhanced with actual recommendation logic
			const profile = profiles.find((p) => p.id === profileId);
			if (!profile) return [];

			// Simple recommendation based on watch history categories
			// In production, this would call an actual recommendation service
			return [];
		},
		[profiles],
	);

	const currentProfile =
		profiles.find((p) => p.id === currentProfileId) || null;
	const isKidsMode = currentProfile?.isKidsProfile || false;

	if (!isLoaded) {
		return null;
	}

	return (
		<ProfileContext.Provider
			value={{
				currentProfile,
				allProfiles: profiles,
				selectProfile,
				createProfile,
				updateProfile,
				deleteProfile,
				addToWatchHistory,
				addToFavorites,
				removeFromFavorites,
				getRecommendations,
				isKidsMode,
			}}
		>
			{children}
		</ProfileContext.Provider>
	);
}

// ─── Profile Avatar Component ───────────────────────────────────────────────

interface ProfileAvatarProps {
	avatar: AvatarType;
	size?: "sm" | "md" | "lg" | "xl";
	showKidsBadge?: boolean;
}

export function ProfileAvatar({
	avatar,
	size = "md",
	showKidsBadge,
}: ProfileAvatarProps) {
	const sizeClasses = {
		sm: "w-8 h-8 text-xs",
		md: "w-12 h-12 text-lg",
		lg: "w-16 h-16 text-2xl",
		xl: "w-24 h-24 text-4xl",
	};

	return (
		<div
			className={`${AVATAR_COLORS[avatar]} ${sizeClasses[size]} rounded-full flex items-center justify-center relative shadow-lg`}
		>
			<span className="select-none">{AVATAR_ICONS[avatar]}</span>
			{showKidsBadge && (
				<div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-md">
					<Baby size={12} className="text-white" />
				</div>
			)}
		</div>
	);
}

// ─── Profile Selector Modal ─────────────────────────────────────────────────

interface ProfileSelectorModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectProfile: (profileId: string) => void;
	profiles: UserProfile[];
	currentProfileId?: string | null;
}

function ProfileSelectorModal({
	isOpen,
	onClose,
	onSelectProfile,
	profiles,
	currentProfileId,
}: ProfileSelectorModalProps) {
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newProfileName, setNewProfileName] = useState("");
	const [newProfileAvatar, setNewProfileAvatar] =
		useState<AvatarType>("avatar1");
	const [newProfileIsKids, setNewProfileIsKids] = useState(false);

	if (!isOpen) return null;

	const handleCreateProfile = () => {
		if (!newProfileName.trim()) return;
		// This will be handled by the parent component
		onSelectProfile(
			"create:" +
				JSON.stringify({
					name: newProfileName,
					avatar: newProfileAvatar,
					isKids: newProfileIsKids,
				}),
		);
		setNewProfileName("");
		setNewProfileAvatar("avatar1");
		setNewProfileIsKids(false);
		setShowCreateForm(false);
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-2xl font-bold text-white">Who's Watching?</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-white transition-colors"
						>
							<X size={24} />
						</button>
					</div>

					{showCreateForm ? (
						<div className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Profile Name
								</label>
								<input
									type="text"
									value={newProfileName}
									onChange={(e) => setNewProfileName(e.target.value)}
									placeholder="Enter profile name"
									className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-300 mb-3">
									Choose Avatar
								</label>
								<div className="grid grid-cols-4 gap-3">
									{(Object.keys(AVATAR_COLORS) as AvatarType[]).map(
										(avatarType) => (
											<button
												key={avatarType}
												onClick={() => setNewProfileAvatar(avatarType)}
												className={`p-3 rounded-xl transition-all ${
													newProfileAvatar === avatarType
														? "bg-gray-700 ring-2 ring-blue-500"
														: "bg-gray-800 hover:bg-gray-700"
												}`}
											>
												<div
													className={`${AVATAR_COLORS[avatarType]} w-12 h-12 rounded-full flex items-center justify-center mx-auto`}
												>
													<span>{AVATAR_ICONS[avatarType]}</span>
												</div>
											</button>
										),
									)}
								</div>
							</div>

							<div>
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={newProfileIsKids}
										onChange={(e) => setNewProfileIsKids(e.target.checked)}
										className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
									/>
									<div className="flex items-center gap-2 text-gray-300">
										<Baby size={20} className="text-green-500" />
										<span>Kids Profile (with parental controls)</span>
									</div>
								</label>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									onClick={() => setShowCreateForm(false)}
									className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={handleCreateProfile}
									disabled={!newProfileName.trim()}
									className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Create Profile
								</button>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
							{profiles.map((profile) => (
								<button
									key={profile.id}
									onClick={() => onSelectProfile(profile.id)}
									className={`flex flex-col items-center p-4 rounded-xl transition-all ${
										currentProfileId === profile.id
											? "bg-blue-900/50 ring-2 ring-blue-500"
											: "bg-gray-800 hover:bg-gray-700"
									}`}
								>
									<ProfileAvatar
										avatar={profile.avatar}
										size="lg"
										showKidsBadge={profile.isKidsProfile}
									/>
									<span className="mt-3 text-white font-medium truncate w-full text-center">
										{profile.name}
									</span>
									{profile.isKidsProfile && (
										<span className="text-xs text-green-500 flex items-center gap-1 mt-1">
											<Shield size={12} /> Kids
										</span>
									)}
								</button>
							))}

							<button
								onClick={() => setShowCreateForm(true)}
								className="flex flex-col items-center p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all border-2 border-dashed border-gray-600 hover:border-gray-500"
							>
								<div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
									<Plus size={32} className="text-gray-400" />
								</div>
								<span className="mt-3 text-gray-400 font-medium">
									Add Profile
								</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Quick Profile Switcher ─────────────────────────────────────────────────

interface QuickProfileSwitcherProps {
	onOpenSelector: () => void;
}

export function QuickProfileSwitcher({
	onOpenSelector,
}: QuickProfileSwitcherProps) {
	const { currentProfile, allProfiles, selectProfile } = useUserProfile();
	const [showDropdown, setShowDropdown] = useState(false);

	if (!currentProfile) return null;

	return (
		<div className="relative">
			<button
				onClick={() => setShowDropdown(!showDropdown)}
				className="flex items-center gap-2 hover:bg-gray-800 rounded-full p-2 transition-colors"
			>
				<ProfileAvatar
					avatar={currentProfile.avatar}
					size="sm"
					showKidsBadge={currentProfile.isKidsProfile}
				/>
				<span className="text-sm text-gray-300 hidden sm:block">
					{currentProfile.name}
				</span>
				<Switch size={16} className="text-gray-400" />
			</button>

			{showDropdown && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setShowDropdown(false)}
					/>
					<div className="absolute right-0 mt-2 w-64 bg-gray-900 rounded-xl shadow-xl border border-gray-700 z-50 overflow-hidden">
						<div className="p-3 border-b border-gray-700">
							<span className="text-sm font-medium text-gray-400">
								Switch Profile
							</span>
						</div>
						<div className="max-h-64 overflow-y-auto p-2">
							{allProfiles.map((profile) => (
								<button
									key={profile.id}
									onClick={() => {
										selectProfile(profile.id);
										setShowDropdown(false);
									}}
									className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
										currentProfile.id === profile.id
											? "bg-blue-900/50"
											: "hover:bg-gray-800"
									}`}
								>
									<ProfileAvatar
										avatar={profile.avatar}
										size="sm"
										showKidsBadge={profile.isKidsProfile}
									/>
									<div className="flex-1 text-left">
										<span className="text-white text-sm block truncate">
											{profile.name}
										</span>
										{profile.isKidsProfile && (
											<span className="text-xs text-green-500 flex items-center gap-1">
												<Shield size={10} /> Kids Profile
											</span>
										)}
									</div>
									{currentProfile.id === profile.id && (
										<Check size={16} className="text-blue-500" />
									)}
								</button>
							))}
						</div>
						<div className="p-2 border-t border-gray-700">
							<button
								onClick={onOpenSelector}
								className="w-full flex items-center justify-center gap-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-sm"
							>
								<Plus size={16} />
								Manage Profiles
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

// ─── Profile Watch History ──────────────────────────────────────────────────

interface ProfileWatchHistoryProps {
	profileId: string;
	limit?: number;
	onVideoSelect?: (videoKey: string) => void;
}

export function ProfileWatchHistory({
	profileId,
	limit = 10,
	onVideoSelect,
}: ProfileWatchHistoryProps) {
	const [videos, setVideos] = useState<
		(Video & { progress: number; lastPosition: number })[]
	>([]);
	const [loading, setLoading] = useState(true);
	const { watchHistory } = useUserProfile();

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	const loadHistory = async () => {
		setLoading(true);
		try {
			const profiles = loadProfiles();
			const profile = profiles.find((p) => p.id === profileId);
			if (!profile) {
				setLoading(false);
				return;
			}

			const historyEntries = profile.watchHistory.slice(0, limit);
			const videoPromises = historyEntries.map(async (entry) => {
				const video = await getVideo(entry.videoKey);
				if (video) {
					return {
						...video,
						progress: entry.progress,
						lastPosition: entry.lastPosition,
					};
				}
				return null;
			});

			const loadedVideos = await Promise.all(videoPromises);
			setVideos(loadedVideos.filter(Boolean) as typeof videos);
		} catch (error) {
			console.error("Failed to load watch history:", error);
		}
		setLoading(false);
	};

	const handleRemove = async (videoKey: string) => {
		await removeFromHistory(videoKey);
		loadHistory();
	};

	if (loading) {
		return (
			<div className="p-4 bg-gray-800 rounded-xl">
				<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<History size={20} />
					Watch History
				</h3>
				<p className="text-gray-400">Loading...</p>
			</div>
		);
	}

	if (videos.length === 0) {
		return (
			<div className="p-4 bg-gray-800 rounded-xl">
				<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<History size={20} />
					Watch History
				</h3>
				<p className="text-gray-400">No watch history yet</p>
			</div>
		);
	}

	return (
		<div className="p-4 bg-gray-800 rounded-xl">
			<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
				<History size={20} />
				Watch History
			</h3>
			<div className="space-y-3">
				{videos.map((video) => (
					<div
						key={video.key}
						className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
						onClick={() => onVideoSelect?.(video.key)}
					>
						{video.thumbnailUrl && (
							<img
								src={video.thumbnailUrl}
								alt={video.title}
								className="w-20 h-12 object-cover rounded"
							/>
						)}
						<div className="flex-1 min-w-0">
							<h4 className="text-white text-sm font-medium truncate">
								{video.title}
							</h4>
							<div className="flex items-center gap-2 mt-1">
								<div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
									<div
										className="h-full bg-blue-500 rounded-full"
										style={{ width: `${video.progress}%` }}
									/>
								</div>
								<span className="text-xs text-gray-400">
									{Math.round(video.progress)}%
								</span>
							</div>
						</div>
						<button
							onClick={(e) => {
								e.stopPropagation();
								handleRemove(video.key);
							}}
							className="p-1 text-gray-400 hover:text-red-500 transition-colors"
						>
							<X size={16} />
						</button>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Personalized Recommendations ───────────────────────────────────────────

interface ProfileRecommendationsProps {
	profileId: string;
	onVideoSelect?: (video: Video) => void;
}

export function ProfileRecommendations({
	profileId,
	onVideoSelect,
}: ProfileRecommendationsProps) {
	const { getRecommendations } = useUserProfile();
	const [recommendations, setRecommendations] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadRecommendations();
	}, [loadRecommendations]);

	const loadRecommendations = async () => {
		setLoading(true);
		try {
			// In production, this would fetch from a recommendation API
			// For now, we'll show some sample recommendations
			const recs = getRecommendations(profileId);
			setRecommendations(recs);
		} catch (error) {
			console.error("Failed to load recommendations:", error);
		}
		setLoading(false);
	};

	if (loading) {
		return (
			<div className="p-4">
				<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<Star size={20} className="text-yellow-500" />
					Recommended For You
				</h3>
				<p className="text-gray-400">Loading recommendations...</p>
			</div>
		);
	}

	if (recommendations.length === 0) {
		return (
			<div className="p-4">
				<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
					<Star size={20} className="text-yellow-500" />
					Recommended For You
				</h3>
				<p className="text-gray-400">
					Watch more videos to get personalized recommendations
				</p>
			</div>
		);
	}

	return (
		<div className="p-4">
			<h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
				<Star size={20} className="text-yellow-500" />
				Recommended For You
			</h3>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
				{recommendations.map((video) => (
					<div
						key={video.key}
						className="cursor-pointer group"
						onClick={() => onVideoSelect?.(video)}
					>
						<div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
							{video.thumbnailUrl ? (
								<img
									src={video.thumbnailUrl}
									alt={video.title}
									className="w-full h-full object-cover group-hover:scale-105 transition-transform"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center">
									<Film size={32} className="text-gray-600" />
								</div>
							)}
						</div>
						<h4 className="mt-2 text-sm text-white font-medium truncate group-hover:text-blue-400 transition-colors">
							{video.title}
						</h4>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Kids Profile Restrictions Banner ───────────────────────────────────────

export function KidsRestrictionsBanner() {
	const { currentProfile } = useUserProfile();

	if (!currentProfile?.isKidsProfile) return null;

	return (
		<div className="bg-green-900/50 border border-green-700 rounded-lg p-3 flex items-center gap-3">
			<Baby size={20} className="text-green-400 flex-shrink-0" />
			<div className="flex-1">
				<p className="text-green-200 text-sm">
					<strong>Kids Mode Active</strong> - Only age-appropriate content is
					shown.
					{currentProfile.dailyWatchLimit && (
						<span className="ml-2">
							Daily limit:{" "}
							{Math.floor(
								(currentProfile.dailyWatchLimit -
									(currentProfile.todayWatchTime || 0)) /
									60,
							)}
							h{" "}
							{(currentProfile.dailyWatchLimit -
								(currentProfile.todayWatchTime || 0)) %
								60}
							m remaining
						</span>
					)}
				</p>
			</div>
			<Shield size={16} className="text-green-400" />
		</div>
	);
}

// ─── Profile Manager Modal (Full Management) ────────────────────────────────

interface ProfileManagerModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function ProfileManagerModal({
	isOpen,
	onClose,
}: ProfileManagerModalProps) {
	const {
		allProfiles,
		currentProfile,
		selectProfile,
		createProfile,
		updateProfile,
		deleteProfile,
	} = useUserProfile();
	const [editingProfile, setEditingProfile] = useState<UserProfile | null>(
		null,
	);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		avatar: "avatar1" as AvatarType,
		isKids: false,
	});

	if (!isOpen) return null;

	const handleCreate = () => {
		if (!formData.name.trim()) return;
		createProfile(formData.name, formData.avatar, formData.isKids);
		setFormData({ name: "", avatar: "avatar1", isKids: false });
		setShowCreateForm(false);
	};

	const handleUpdate = () => {
		if (!editingProfile || !formData.name.trim()) return;
		updateProfile(editingProfile.id, {
			name: formData.name,
			avatar: formData.avatar,
			isKidsProfile: formData.isKids,
		});
		setEditingProfile(null);
	};

	const startEdit = (profile: UserProfile) => {
		setEditingProfile(profile);
		setFormData({
			name: profile.name,
			avatar: profile.avatar,
			isKids: profile.isKidsProfile,
		});
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
			<div className="bg-gray-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex justify-between items-center mb-6">
						<h2 className="text-2xl font-bold text-white">Manage Profiles</h2>
						<button
							onClick={onClose}
							className="text-gray-400 hover:text-white"
						>
							<X size={24} />
						</button>
					</div>

					{showCreateForm || editingProfile ? (
						<div className="space-y-6">
							<h3 className="text-lg font-semibold text-white">
								{editingProfile ? "Edit Profile" : "Create Profile"}
							</h3>

							<div>
								<label className="block text-sm font-medium text-gray-300 mb-2">
									Profile Name
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-300 mb-3">
									Avatar
								</label>
								<div className="grid grid-cols-4 gap-3">
									{(Object.keys(AVATAR_COLORS) as AvatarType[]).map(
										(avatarType) => (
											<button
												key={avatarType}
												onClick={() =>
													setFormData({ ...formData, avatar: avatarType })
												}
												className={`p-3 rounded-xl transition-all ${
													formData.avatar === avatarType
														? "bg-gray-700 ring-2 ring-blue-500"
														: "bg-gray-800 hover:bg-gray-700"
												}`}
											>
												<div
													className={`${AVATAR_COLORS[avatarType]} w-12 h-12 rounded-full flex items-center justify-center mx-auto`}
												>
													<span>{AVATAR_ICONS[avatarType]}</span>
												</div>
											</button>
										),
									)}
								</div>
							</div>

							<div>
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={formData.isKids}
										onChange={(e) =>
											setFormData({ ...formData, isKids: e.target.checked })
										}
										className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
									/>
									<div className="flex items-center gap-2 text-gray-300">
										<Baby size={20} className="text-green-500" />
										<span>Kids Profile (with parental controls)</span>
									</div>
								</label>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									onClick={() => {
										setShowCreateForm(false);
										setEditingProfile(null);
									}}
									className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
								>
									Cancel
								</button>
								<button
									onClick={editingProfile ? handleUpdate : handleCreate}
									disabled={!formData.name.trim()}
									className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
								>
									{editingProfile ? "Save Changes" : "Create Profile"}
								</button>
							</div>
						</div>
					) : (
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
							{allProfiles.map((profile) => (
								<div
									key={profile.id}
									className={`p-4 rounded-xl bg-gray-800 ${
										currentProfile?.id === profile.id
											? "ring-2 ring-blue-500"
											: ""
									}`}
								>
									<div className="flex flex-col items-center">
										<ProfileAvatar
											avatar={profile.avatar}
											size="lg"
											showKidsBadge={profile.isKidsProfile}
										/>
										<span className="mt-3 text-white font-medium truncate w-full text-center">
											{profile.name}
										</span>
										{profile.isKidsProfile && (
											<span className="text-xs text-green-500 flex items-center gap-1 mt-1">
												<Shield size={12} /> Kids
											</span>
										)}
										{currentProfile?.id === profile.id && (
											<span className="text-xs text-blue-400 mt-2 flex items-center gap-1">
												<Check size={12} /> Active
											</span>
										)}
									</div>
									<div className="flex gap-2 mt-4">
										<button
											onClick={() => startEdit(profile)}
											className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 text-sm transition-colors"
										>
											<Edit2 size={14} /> Edit
										</button>
										<button
											onClick={() => {
												if (allProfiles.length > 1) {
													deleteProfile(profile.id);
												} else {
													alert("Cannot delete the last profile");
												}
											}}
											disabled={allProfiles.length <= 1}
											className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-900/50 text-red-400 rounded-lg hover:bg-red-900 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<Trash2 size={14} /> Delete
										</button>
									</div>
									{currentProfile?.id !== profile.id && (
										<button
											onClick={() => selectProfile(profile.id)}
											className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
										>
											<Switch size={14} /> Switch
										</button>
									)}
								</div>
							))}

							<button
								onClick={() => setShowCreateForm(true)}
								className="p-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all border-2 border-dashed border-gray-600 hover:border-gray-500 flex flex-col items-center justify-center"
							>
								<div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
									<Plus size={32} className="text-gray-400" />
								</div>
								<span className="mt-3 text-gray-400 font-medium">
									Add Profile
								</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// ─── Main UserProfileManager Component ──────────────────────────────────────

interface UserProfileManagerProps {
	onVideoSelect?: (video: Video) => void;
	showInNavbar?: boolean;
}

export function UserProfileManager({
	onVideoSelect,
	showInNavbar = true,
}: UserProfileManagerProps) {
	const [showSelector, setShowSelector] = useState(false);
	const [showManager, setShowManager] = useState(false);
	const { currentProfile, selectProfile, createProfile } = useUserProfile();

	const handleProfileSelect = (profileId: string) => {
		if (profileId.startsWith("create:")) {
			const data = JSON.parse(profileId.slice(7));
			createProfile(data.name, data.avatar, data.isKids);
		} else {
			selectProfile(profileId);
		}
	};

	if (!showInNavbar) {
		return (
			<>
				<ProfileSelectorModal
					isOpen={showSelector}
					onClose={() => setShowSelector(false)}
					onSelectProfile={handleProfileSelect}
					profiles={useUserProfile().allProfiles}
					currentProfileId={currentProfile?.id}
				/>
				<ProfileManagerModal
					isOpen={showManager}
					onClose={() => setShowManager(false)}
				/>
			</>
		);
	}

	return (
		<>
			<QuickProfileSwitcher onOpenSelector={() => setShowSelector(true)} />
			<ProfileSelectorModal
				isOpen={showSelector}
				onClose={() => setShowSelector(false)}
				onSelectProfile={handleProfileSelect}
				profiles={useUserProfile().allProfiles}
				currentProfileId={currentProfile?.id}
			/>
			<ProfileManagerModal
				isOpen={showManager}
				onClose={() => setShowManager(false)}
			/>
		</>
	);
}
