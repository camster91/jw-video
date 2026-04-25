import {
	ChevronRight,
	Clock,
	Filter,
	Mic,
	MicOff,
	Search,
	TrendingUp,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
	getRecentSearches,
	getTrendingSearches,
	isSpeechRecognitionAvailable,
	removeRecentSearch,
	startVoiceSearch,
} from "../services/search";
import type { SearchHistoryEntry, SearchSuggestion, Video } from "../types";

interface EnhancedSearchBarProps {
	onSearch: (query: string) => void;
	onResultClick?: (video: Video) => void;
	onClose?: () => void;
	initialQuery?: string;
}

export function EnhancedSearchBar({
	onSearch,
	onResultClick,
	onClose,
	initialQuery = "",
}: EnhancedSearchBarProps) {
	const [query, setQuery] = useState(initialQuery);
	const [isOpen, setIsOpen] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>(
		[],
	);
	const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>(
		[],
	);
	const [isListening, setIsListening] = useState(false);
	const [searchResults, setSearchResults] = useState<Video[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load recent and trending searches when opening
	useEffect(() => {
		if (isOpen) {
			setRecentSearches(getRecentSearches());
			setTrendingSearches(getTrendingSearches());
		}
	}, [isOpen]);

	// Debounced search
	const doSearch = useCallback(async (q: string) => {
		if (q.length < 2) {
			setSearchResults([]);
			return;
		}
		// Import dynamically to avoid circular dependency
		const { searchVideos } = await import("../services/api");
		const matches = await searchVideos(q);
		setSearchResults(matches.slice(0, 12));
		setShowResults(true);
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => doSearch(value), 300);
		setShowResults(value.length >= 2);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (query.trim()) {
			onSearch(query);
			setShowResults(false);
		}
	};

	const handleSuggestionClick = (suggestion: string) => {
		setQuery(suggestion);
		onSearch(suggestion);
		setShowResults(false);
	};

	const handleRecentClick = (entry: SearchHistoryEntry) => {
		setQuery(entry.query);
		onSearch(entry.query);
		setShowResults(false);
	};

	const handleRemoveRecent = (e: React.MouseEvent, queryToRemove: string) => {
		e.stopPropagation();
		removeRecentSearch(queryToRemove);
		setRecentSearches(getRecentSearches());
	};

	const handleVoiceSearch = () => {
		if (!isSpeechRecognitionAvailable()) {
			alert("Voice search is not supported in your browser");
			return;
		}

		setIsListening(true);
		const stopListening = startVoiceSearch((result) => {
			if (result.success && result.transcript) {
				setQuery(result.transcript);
				doSearch(result.transcript);
			}
			setIsListening(false);
			if (result.error) {
				console.error("Voice search error:", result.error);
			}
		});

		// Auto-stop after 10 seconds
		setTimeout(stopListening, 10000);
	};

	const handleOpen = () => {
		setIsOpen(true);
		setTimeout(() => inputRef.current?.focus(), 100);
	};

	const handleClose = useCallback(() => {
		setIsOpen(false);
		setQuery("");
		setSearchResults([]);
		setShowResults(false);
		onClose?.();
	}, [onClose]);

	// Close on click outside
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				handleClose();
			}
		};
		if (isOpen) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [isOpen, handleClose]);

	// Close on Escape
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") handleClose();
		};
		if (isOpen) document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [isOpen, handleClose]);

	if (!isOpen) {
		return (
			<button
				type="button"
				onClick={handleOpen}
				className="search-trigger"
				aria-label="Search"
			>
				<Search size={20} />
			</button>
		);
	}

	return (
		<div ref={containerRef} className="search-bar open enhanced">
			<form onSubmit={handleSubmit} className="search-input-wrap">
				<Search size={18} className="search-icon" />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={handleChange}
					placeholder="Search videos..."
					className="search-input"
					autoComplete="off"
				/>
				<div className="search-actions">
					{query && (
						<button
							type="button"
							onClick={() => setQuery("")}
							className="search-action-btn"
							aria-label="Clear search"
						>
							<X size={16} />
						</button>
					)}
					<button
						type="button"
						onClick={handleVoiceSearch}
						className={`search-action-btn voice-btn ${isListening ? "listening" : ""}`}
						aria-label="Voice search"
						title={isListening ? "Listening..." : "Voice search"}
					>
						{isListening ? <MicOff size={16} /> : <Mic size={16} />}
					</button>
					<button
						type="button"
						onClick={handleClose}
						className="search-action-btn"
						aria-label="Close search"
					>
						<X size={18} />
					</button>
				</div>
			</form>

			{/* Search Results */}
			{showResults && searchResults.length > 0 && (
				<div className="search-results">
					<div className="search-results-header">
						<span>Videos</span>
						<Link
							to={`/search?q=${encodeURIComponent(query)}`}
							className="see-all-link"
							onClick={handleClose}
						>
							See all <ChevronRight size={14} />
						</Link>
					</div>
					{searchResults.map((v) => (
						<button
							type="button"
							key={v.key}
							className="search-result-item"
							onClick={() => {
								onResultClick?.(v);
								handleClose();
							}}
						>
							{v.thumbnailUrl && (
								<img
									src={v.thumbnailUrl}
									alt=""
									className="search-result-thumb"
									loading="lazy"
								/>
							)}
							<div className="search-result-info">
								<span className="search-result-title">{v.title}</span>
								{v.durationFormatted && (
									<span className="search-result-duration">
										{v.durationFormatted}
									</span>
								)}
							</div>
						</button>
					))}
				</div>
			)}

			{/* No query - show recent and trending */}
			{!showResults && query.length < 2 && (
				<div className="search-suggestions">
					{/* Recent Searches */}
					{recentSearches.length > 0 && (
						<div className="suggestion-section">
							<div className="suggestion-section-header">
								<Clock size={16} />
								<span>Recent Searches</span>
							</div>
							<div className="suggestion-list">
								{recentSearches.map((entry, idx) => (
									<button
										key={idx}
										type="button"
										className="suggestion-item"
										onClick={() => handleRecentClick(entry)}
									>
										<Clock size={14} className="suggestion-icon" />
										<span className="suggestion-text">{entry.query}</span>
										<button
											type="button"
											className="remove-recent-btn"
											onClick={(e) => handleRemoveRecent(e, entry.query)}
											aria-label="Remove from recent"
										>
											<X size={12} />
										</button>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Trending Searches */}
					<div className="suggestion-section">
						<div className="suggestion-section-header">
							<TrendingUp size={16} />
							<span>Trending Searches</span>
						</div>
						<div className="suggestion-list">
							{trendingSearches.map((suggestion, idx) => (
								<button
									key={idx}
									type="button"
									className="suggestion-item"
									onClick={() => handleSuggestionClick(suggestion.text)}
								>
									<TrendingUp size={14} className="suggestion-icon trending" />
									<span className="suggestion-text">{suggestion.text}</span>
									{suggestion.videoCount && (
										<span className="suggestion-count">
											{suggestion.videoCount} videos
										</span>
									)}
								</button>
							))}
						</div>
					</div>

					{/* Quick link to advanced search */}
					<div className="suggestion-section">
						<Link
							to="/search"
							className="advanced-search-link"
							onClick={handleClose}
						>
							<Filter size={16} />
							<span>Advanced Search</span>
							<ChevronRight size={14} />
						</Link>
					</div>
				</div>
			)}

			{/* Voice search status */}
			{isListening && (
				<div className="voice-search-status">
					<Mic size={24} className="listening-icon" />
					<span>Listening...</span>
				</div>
			)}
		</div>
	);
}
