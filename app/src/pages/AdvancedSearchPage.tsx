import { Calendar, Clock, Filter, Mic, MicOff, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VideoCard } from "../components/VideoCard";
import {
	getCategories,
	searchVideos as searchVideosApi,
} from "../services/api";
import {
	addRecentSearch,
	getRecentSearches,
	getTrendingSearches,
	isSpeechRecognitionAvailable,
	startVoiceSearch,
} from "../services/search";
import type {
	Category,
	SearchFilters,
	SearchHistoryEntry,
	SearchSuggestion,
	Video,
} from "../types";

export function AdvancedSearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const [query, setQuery] = useState(searchParams.get("q") || "");
	const [searchResults, setSearchResults] = useState<Video[]>([]);
	const [categories, setCategories] = useState<Category[]>([]);
	const [recentSearches, setRecentSearches] = useState<SearchHistoryEntry[]>(
		[],
	);
	const [trendingSearches, setTrendingSearches] = useState<SearchSuggestion[]>(
		[],
	);
	const [isListening, setIsListening] = useState(false);

	// Filters
	const [filters, setFilters] = useState<SearchFilters>({
		categoryKey: searchParams.get("category") || undefined,
		minDuration: searchParams.get("minDuration")
			? parseInt(searchParams.get("minDuration")!, 10)
			: undefined,
		maxDuration: searchParams.get("maxDuration")
			? parseInt(searchParams.get("maxDuration")!, 10)
			: undefined,
		dateFrom: searchParams.get("dateFrom") || undefined,
		dateTo: searchParams.get("dateTo") || undefined,
		mediaType: searchParams.get("mediaType") || undefined,
	});

	const [hasSearched, setHasSearched] = useState(!!searchParams.get("q"));

	// Load categories
	useEffect(() => {
		getCategories().then((cats) =>
			setCategories(cats.filter((c) => !c.parentKey)),
		);
	}, []);

	// Load recent and trending
	useEffect(() => {
		setRecentSearches(getRecentSearches());
		setTrendingSearches(getTrendingSearches());
	}, []);

	// Perform search when params change
	useEffect(() => {
		const q = searchParams.get("q");
		if (q) {
			doSearch(q, {
				categoryKey: searchParams.get("category") || undefined,
				minDuration: searchParams.get("minDuration")
					? parseInt(searchParams.get("minDuration")!, 10)
					: undefined,
				maxDuration: searchParams.get("maxDuration")
					? parseInt(searchParams.get("maxDuration")!, 10)
					: undefined,
				dateFrom: searchParams.get("dateFrom") || undefined,
				dateTo: searchParams.get("dateTo") || undefined,
				mediaType: searchParams.get("mediaType") || undefined,
			});
		}
	}, [searchParams, doSearch]);

	const doSearch = async (
		q: string,
		searchFilters?: SearchFilters,
	): Promise<void> => {
		if (q.length < 2) {
			setSearchResults([]);
			return;
		}

		const allVideos = await searchVideosApi(q);
		let filtered = allVideos;

		// Apply filters
		if (searchFilters) {
			if (searchFilters.categoryKey) {
				filtered = filtered.filter(
					(v) => v.categoryKey === searchFilters.categoryKey,
				);
			}
			if (searchFilters.minDuration !== undefined) {
				filtered = filtered.filter(
					(v) => v.duration >= (searchFilters.minDuration as number),
				);
			}
			if (searchFilters.maxDuration !== undefined) {
				filtered = filtered.filter(
					(v) => v.duration <= (searchFilters.maxDuration as number),
				);
			}
			if (searchFilters.dateFrom) {
				const fromDate = new Date(searchFilters.dateFrom);
				filtered = filtered.filter((v) => {
					if (!v.firstPublished) return false;
					return new Date(v.firstPublished) >= fromDate;
				});
			}
			if (searchFilters.dateTo) {
				const toDate = new Date(searchFilters.dateTo);
				filtered = filtered.filter((v) => {
					if (!v.firstPublished) return false;
					return new Date(v.firstPublished) <= toDate;
				});
			}
			if (searchFilters.mediaType) {
				filtered = filtered.filter(
					(v) => v.mediaType === searchFilters.mediaType,
				);
			}
		}

		setSearchResults(filtered);
		setHasSearched(true);

		// Save to recent searches
		if (filtered.length > 0) {
			addRecentSearch(q, filtered.length);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (query.trim()) {
			updateSearchParams({ q: query, page: "1" });
		}
	};

	const updateSearchParams = (updates: Record<string, string | undefined>) => {
		const newParams = new URLSearchParams(searchParams);
		Object.entries(updates).forEach(([key, value]) => {
			if (value) {
				newParams.set(key, value);
			} else {
				newParams.delete(key);
			}
		});
		setSearchParams(newParams);
	};

	const handleFilterChange = (
		key: keyof SearchFilters,
		value: string | number | undefined,
	) => {
		const newFilters = { ...filters, [key]: value };
		setFilters(newFilters);

		// Update URL params
		const params: Record<string, string | undefined> = {
			q: query,
			category: filters.categoryKey,
			minDuration: filters.minDuration?.toString(),
			maxDuration: filters.maxDuration?.toString(),
			dateFrom: filters.dateFrom,
			dateTo: filters.dateTo,
			mediaType: filters.mediaType,
		};
		params[key] = value?.toString();

		updateSearchParams(params);
	};

	const clearFilters = () => {
		setFilters({});
		setSearchParams(new URLSearchParams({ q: query }));
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
				updateSearchParams({ q: result.transcript });
			}
			setIsListening(false);
		});

		setTimeout(stopListening, 10000);
	};

	const handleSuggestionClick = (suggestion: string) => {
		setQuery(suggestion);
		updateSearchParams({ q: suggestion });
	};

	const durationOptions = [
		{ label: "Any length", value: "" },
		{ label: "Under 5 minutes", value: "0-300" },
		{ label: "5-15 minutes", value: "300-900" },
		{ label: "15-30 minutes", value: "900-1800" },
		{ label: "Over 30 minutes", value: "1800-" },
	];

	return (
		<div className="page advanced-search-page">
			<div className="search-page-header">
				<form onSubmit={handleSubmit} className="advanced-search-form">
					<div className="advanced-search-input-wrap">
						<Search size={20} />
						<input
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search videos..."
							className="advanced-search-input"
						/>
						<button
							type="button"
							onClick={handleVoiceSearch}
							className={`voice-search-btn ${isListening ? "listening" : ""}`}
							aria-label="Voice search"
						>
							{isListening ? <MicOff size={20} /> : <Mic size={20} />}
						</button>
						<button type="submit" className="search-submit-btn">
							Search
						</button>
					</div>
				</form>
			</div>

			<div className="advanced-search-content">
				{/* Filters Sidebar */}
				<aside className="search-filters">
					<div className="filters-header">
						<Filter size={18} />
						<h2>Filters</h2>
						<button
							type="button"
							onClick={clearFilters}
							className="clear-filters-btn"
						>
							<X size={14} />
							Clear
						</button>
					</div>

					{/* Category Filter */}
					<div className="filter-group">
						<h3>Category</h3>
						<select
							value={filters.categoryKey || ""}
							onChange={(e) =>
								handleFilterChange("categoryKey", e.target.value || undefined)
							}
							className="filter-select"
						>
							<option value="">All Categories</option>
							{categories.map((cat) => (
								<option key={cat.key} value={cat.key}>
									{cat.name}
								</option>
							))}
						</select>
					</div>

					{/* Duration Filter */}
					<div className="filter-group">
						<h3>
							<Clock size={16} />
							Duration
						</h3>
						<div className="filter-radio-group">
							{durationOptions.map((opt) => {
								const [min, max] = opt.value.split("-");
								const isSelected =
									(min && filters.minDuration === parseInt(min, 10)) ||
									(max && filters.maxDuration === parseInt(max, 10)) ||
									(!opt.value && !filters.minDuration && !filters.maxDuration);

								return (
									<label key={opt.value} className="filter-radio">
										<input
											type="radio"
											name="duration"
											checked={isSelected}
											onChange={() => {
												if (!opt.value) {
													handleFilterChange("minDuration", undefined);
													handleFilterChange("maxDuration", undefined);
												} else if (max && !min) {
													handleFilterChange("minDuration", parseInt(min, 10));
												} else if (min && max) {
													handleFilterChange("minDuration", parseInt(min, 10));
													handleFilterChange("maxDuration", parseInt(max, 10));
												}
											}}
										/>
										<span>{opt.label}</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Date Filter */}
					<div className="filter-group">
						<h3>
							<Calendar size={16} />
							Date Published
						</h3>
						<div className="date-filter-group">
							<label>
								From:
								<input
									type="date"
									value={filters.dateFrom || ""}
									onChange={(e) =>
										handleFilterChange("dateFrom", e.target.value || undefined)
									}
									className="filter-date-input"
								/>
							</label>
							<label>
								To:
								<input
									type="date"
									value={filters.dateTo || ""}
									onChange={(e) =>
										handleFilterChange("dateTo", e.target.value || undefined)
									}
									className="filter-date-input"
								/>
							</label>
						</div>
					</div>

					{/* Media Type Filter */}
					<div className="filter-group">
						<h3>Media Type</h3>
						<select
							value={filters.mediaType || ""}
							onChange={(e) =>
								handleFilterChange("mediaType", e.target.value || undefined)
							}
							className="filter-select"
						>
							<option value="">All Types</option>
							<option value="ondemand">On Demand</option>
							<option value="live">Live</option>
							<option value="clip">Clip</option>
						</select>
					</div>
				</aside>

				{/* Search Results */}
				<main className="search-results-main">
					{!hasSearched && !query && (
						<div className="search-start-screen">
							<h2>Start Your Search</h2>
							<p>Enter a search term or use filters to find videos</p>

							{trendingSearches.length > 0 && (
								<div className="trending-section">
									<h3>Trending Searches</h3>
									<div className="trending-chips">
										{trendingSearches.map((s, idx) => (
											<button
												key={idx}
												type="button"
												className="trending-chip"
												onClick={() => handleSuggestionClick(s.text)}
											>
												{s.text}
											</button>
										))}
									</div>
								</div>
							)}

							{recentSearches.length > 0 && (
								<div className="recent-section">
									<h3>Recent Searches</h3>
									<div className="recent-list">
										{recentSearches.map((entry, idx) => (
											<button
												key={idx}
												type="button"
												className="recent-item"
												onClick={() => handleSuggestionClick(entry.query)}
											>
												{entry.query}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					)}

					{hasSearched && searchResults.length === 0 && (
						<div className="no-results">
							<Search size={48} />
							<h2>No results found</h2>
							<p>Try adjusting your search or filters</p>
							<button
								type="button"
								onClick={clearFilters}
								className="clear-filters-action"
							>
								Clear all filters
							</button>
						</div>
					)}

					{searchResults.length > 0 && (
						<div className="search-results-content">
							<div className="results-header">
								<h2>
									{searchResults.length} result
									{searchResults.length !== 1 ? "s" : ""} for "{query}"
								</h2>
								{(filters.categoryKey ||
									filters.minDuration ||
									filters.dateFrom) && (
									<span className="active-filters-count">Filters applied</span>
								)}
							</div>
							<div className="video-grid">
								{searchResults.map((video) => (
									<VideoCard
										key={video.key}
										video={video}
										onPlay={(v) => navigate(`/video/${v.key}`)}
									/>
								))}
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
