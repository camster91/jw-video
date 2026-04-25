import { useEffect, useState } from "react";
import {
	BrowserRouter,
	Link,
	Route,
	Routes,
	useNavigate,
	useParams,
} from "react-router-dom";
import { CategoryCard } from "./components/CategoryCard";
import { HeroSection } from "./components/HeroSection";
import { Navbar } from "./components/Navbar";
import { VideoCard } from "./components/VideoCard";
import { VideoCarousel } from "./components/VideoCarousel";
import { VideoDetail } from "./components/VideoDetail";
import { VideoPlayer } from "./components/VideoPlayer";
import { AdvancedSearchPage } from "./pages/AdvancedSearchPage";
import { LivePage } from "./pages/LivePage";
import {
	getCategories,
	getFeatured,
	getRecentlyPublished,
	getSubcategories,
	getVideo,
	getVideos,
	getVideosByCategory,
} from "./services/api";
import type { Category, Video } from "./types";

// ─── Home Page ──────────────────────────────────────────────────────────────

function HomePage() {
	const [featured, setFeatured] = useState<Video | null>(null);
	const [recent, setRecent] = useState<Video[]>([]);
	const [categoryRows, setCategoryRows] = useState<
		{ name: string; videos: Video[] }[]
	>([]);
	const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function load() {
			setLoading(true);
			const [feat, recent, categories] = await Promise.all([
				getFeatured(),
				getRecentlyPublished(20),
				getCategories(),
			]);
			setFeatured(feat);
			setRecent(recent);

			const topCats = categories.filter((c) => !c.parentKey);
			const rows: { name: string; videos: Video[] }[] = [];

			for (const cat of topCats.slice(0, 10)) {
				const vids = await getVideosByCategory(cat.key);
				if (vids.length > 0) rows.push({ name: cat.name, videos: vids });
			}

			setCategoryRows(rows);
			setLoading(false);
		}
		load();
	}, []);

	if (playingVideo) {
		return (
			<VideoPlayer
				video={playingVideo}
				onBack={() => setPlayingVideo(null)}
				autoPlay
			/>
		);
	}

	if (loading) {
		return (
			<div className="page">
				<div className="skeleton-hero" />
				<div className="skeleton-grid">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="skeleton-card" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="page home-page">
			{featured && <HeroSection video={featured} onPlay={setPlayingVideo} />}
			<div className="home-content">
				<VideoCarousel
					title="Recently Published"
					videos={recent}
					onPlay={setPlayingVideo}
				/>
				{categoryRows.map((row) => (
					<VideoCarousel
						key={row.name}
						title={row.name}
						videos={row.videos}
						onPlay={setPlayingVideo}
					/>
				))}
			</div>
		</div>
	);
}

// ─── Browse Page ────────────────────────────────────────────────────────────

function BrowsePage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getCategories().then((cats) => {
			setCategories(cats.filter((c) => !c.parentKey));
			setLoading(false);
		});
	}, []);

	return (
		<div className="page browse-page">
			<div className="page-header">
				<h1>Browse Videos</h1>
			</div>
			{loading ? (
				<div className="skeleton-grid">
					{[...Array(8)].map((_, i) => (
						<div key={i} className="skeleton-card" />
					))}
				</div>
			) : (
				<div className="category-grid">
					{categories.map((cat) => (
						<CategoryCard key={cat.key} category={cat} />
					))}
				</div>
			)}
		</div>
	);
}

// ─── Category Page ──────────────────────────────────────────────────────────

function CategoryPage() {
	const { key } = useParams<{ key: string }>();
	const [videos, setVideos] = useState<Video[]>([]);
	const [subcategories, setSubcategories] = useState<Category[]>([]);
	const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		if (!key) return;
		setLoading(true);
		Promise.all([getVideosByCategory(key), getSubcategories(key)]).then(
			([vids, subs]) => {
				setVideos(vids);
				setSubcategories(subs);
				setLoading(false);
			},
		);
	}, [key]);

	if (playingVideo) {
		return (
			<VideoPlayer
				video={playingVideo}
				onBack={() => setPlayingVideo(null)}
				autoPlay
			/>
		);
	}

	return (
		<div className="page category-page">
			<div className="page-header">
				<button type="button" className="back-btn" onClick={() => navigate(-1)}>
					← Back
				</button>
				<h1>{key}</h1>
			</div>
			{subcategories.length > 0 && (
				<div className="subcategory-list">
					{subcategories.map((sub) => (
						<Link
							key={sub.key}
							to={`/category/${sub.key}`}
							className="subcategory-pill"
						>
							{sub.name}
						</Link>
					))}
				</div>
			)}
			{loading ? (
				<div className="skeleton-grid">
					{[...Array(6)].map((_, i) => (
						<div key={i} className="skeleton-card" />
					))}
				</div>
			) : videos.length > 0 ? (
				<div className="video-grid">
					{videos.map((v) => (
						<VideoCard key={v.key} video={v} onPlay={setPlayingVideo} />
					))}
				</div>
			) : (
				<p className="empty-text">No videos found in this category.</p>
			)}
		</div>
	);
}

// ─── Video Detail Page ─────────────────────────────────────────────────────

function VideoPage() {
	const { key } = useParams<{ key: string }>();
	const [video, setVideo] = useState<Video | null>(null);
	const [suggested, setSuggested] = useState<Video[]>([]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!key) return;
		setLoading(true);
		getVideo(key).then(async (v) => {
			if (v) {
				setVideo(v);
				const catVids = v.categoryKey
					? await getVideosByCategory(v.categoryKey)
					: [];
				setSuggested(catVids.filter((sv) => sv.key !== v.key));
			}
			setLoading(false);
		});
	}, [key]);

	if (loading) {
		return (
			<div className="page">
				<div className="skeleton-detail" />
			</div>
		);
	}

	if (!video) {
		return (
			<div className="page">
				<p>Video not found.</p>
			</div>
		);
	}

	if (isPlaying) {
		return (
			<VideoPlayer video={video} onBack={() => setIsPlaying(false)} autoPlay />
		);
	}

	return (
		<VideoDetail
			video={video}
			suggestedVideos={suggested}
			onPlay={() => setIsPlaying(true)}
		/>
	);
}

// ─── Favorites Page (N+1 fixed) ──────────────────────────────────────────

function FavoritesPage() {
	const [favorites, setFavorites] = useState<Video[]>([]);
	const [loading, setLoading] = useState(true);
	const navigate = useNavigate();

	useEffect(() => {
		async function load() {
			setLoading(true);
			const favKeys = getFavorites();
			// Batch load all videos once instead of N+1 queries
			const all = await getVideos(1, 10000);
			const favs = all.videos.filter((v) => favKeys.includes(v.key));
			setFavorites(favs);
			setLoading(false);
		}
		load();
	}, []);

	return (
		<div className="page favorites-page">
			<div className="page-header">
				<h1>My List</h1>
			</div>
			{loading ? (
				<div className="skeleton-grid">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="skeleton-card" />
					))}
				</div>
			) : favorites.length === 0 ? (
				<p className="empty-text">
					Videos you add to My List will appear here.
				</p>
			) : (
				<div className="video-grid">
					{favorites.map((v) => (
						<VideoCard
							key={v.key}
							video={v}
							onPlay={(vid) => navigate(`/video/${vid.key}`)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─── App Root ───────────────────────────────────────────────────────────────

export default function App() {
	return (
		<BrowserRouter>
			<Navbar />
			<main className="main-content">
				<Routes>
					<Route path="/" element={<HomePage />} />
					<Route path="/browse" element={<BrowsePage />} />
					<Route path="/search" element={<AdvancedSearchPage />} />
					<Route path="/live" element={<LivePage />} />
					<Route path="/category/:key" element={<CategoryPage />} />
					<Route path="/video/:key" element={<VideoPage />} />
					<Route path="/favorites" element={<FavoritesPage />} />
				</Routes>
			</main>
		</BrowserRouter>
	);
}
