import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { VideoCarousel } from "./components/VideoCarousel";
import { VideoCard } from "./components/VideoCard";
import { VideoDetail } from "./components/VideoDetail";
import { VideoPlayer } from "./components/VideoPlayer";
import { CategoryCard } from "./components/CategoryCard";
import {
  getFeatured,
  getRecentlyPublished,
  getCategories,
  getVideosByCategory,
  getVideo,
  getSubcategories,
  getFavorites,
  getWatchHistory,
  isFavorite as checkIsFavorite,
} from "./services/api";
import type { Video, Category } from "./types";

// ─── Home Page ──────────────────────────────────────────────────────────────

function HomePage() {
  const [featured, setFeatured] = useState<Video | null>(null);
  const [recent, setRecent] = useState<Video[]>([]);
  const [categoryRows, setCategoryRows] = useState<{ name: string; videos: Video[] }[]>([]);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [feat, recent, categories] = await Promise.all([
        getFeatured(),
        getRecentlyPublished(20),
        getCategories(),
      ]);
      setFeatured(feat);
      setRecent(recent);

      // Build category rows with videos
      const topCats = categories.filter((c) => !c.parentKey);
      const rows: { name: string; videos: Video[] }[] = [];

      for (const cat of topCats.slice(0, 10)) {
        const vids = await getVideosByCategory(cat.key);
        if (vids.length > 0) rows.push({ name: cat.name, videos: vids });
      }

      setCategoryRows(rows);
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

  return (
    <div className="page home-page">
      {featured && <HeroSection video={featured} onPlay={setPlayingVideo} />}
      <div className="home-content">
        <VideoCarousel title="Recently Published" videos={recent} onPlay={setPlayingVideo} />
        {categoryRows.map((row) => (
          <VideoCarousel key={row.name} title={row.name} videos={row.videos} onPlay={setPlayingVideo} />
        ))}
      </div>
    </div>
  );
}

// ─── Browse Page ────────────────────────────────────────────────────────────

function BrowsePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((cats) => setCategories(cats.filter((c) => !c.parentKey)));
  }, []);

  return (
    <div className="page browse-page">
      <div className="page-header">
        <h1>Browse Videos</h1>
      </div>
      <div className="category-grid">
        {categories.map((cat) => (
          <CategoryCard key={cat.key} category={cat} />
        ))}
      </div>
    </div>
  );
}

// ─── Category Page ──────────────────────────────────────────────────────────

function CategoryPage() {
  const { key } = useParams<{ key: string }>();
  const [videos, setVideos] = useState<Video[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!key) return;
    Promise.all([getVideosByCategory(key), getSubcategories(key)]).then(([vids, subs]) => {
      setVideos(vids);
      setSubcategories(subs);
    });
  }, [key]);

  if (playingVideo) {
    return <VideoPlayer video={playingVideo} onBack={() => setPlayingVideo(null)} autoPlay />;
  }

  return (
    <div className="page category-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{category?.name ?? key}</h1>
      </div>
      {subcategories.length > 0 && (
        <div className="subcategory-list">
          {subcategories.map((sub) => (
            <Link key={sub.key} to={`/category/${sub.key}`} className="subcategory-pill">
              {sub.name}
            </Link>
          ))}
        </div>
      )}
      <div className="video-grid">
        {videos.map((v) => (
          <VideoCard key={v.key} video={v} onPlay={setPlayingVideo} />
        ))}
      </div>
      {videos.length === 0 && <p className="empty-text">No videos found in this category.</p>}
    </div>
  );
}

// ─── Video Detail Page ─────────────────────────────────────────────────────

function VideoPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [suggested, setSuggested] = useState<Video[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!key) return;
    getVideo(key).then(async (v) => {
      if (v) {
        setVideo(v);
        const catVids = v.categoryKey ? await getVideosByCategory(v.categoryKey) : [];
        setSuggested(catVids.filter((sv) => sv.key !== v.key));
      }
    });
  }, [key]);

  if (!video) return <div className="page"><p>Loading...</p></div>;

  if (isPlaying) {
    return <VideoPlayer video={video} onBack={() => setIsPlaying(false)} autoPlay />;
  }

  return (
    <VideoDetail
      video={video}
      suggestedVideos={suggested}
      onPlay={() => setIsPlaying(true)}
    />
  );
}

// ─── Favorites Page ────────────────────────────────────────────────────────

function FavoritesPage() {
  const [favorites, setFavorites] = useState<Video[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const favKeys = getFavorites();
      const vids: Video[] = [];
      for (const k of favKeys) {
        const v = await getVideo(k);
        if (v) vids.push(v);
      }
      setFavorites(vids);
    }
    load();
  }, []);

  return (
    <div className="page favorites-page">
      <div className="page-header">
        <h1>My List</h1>
      </div>
      {favorites.length === 0 ? (
        <p className="empty-text">Videos you add to My List will appear here.</p>
      ) : (
        <div className="video-grid">
          {favorites.map((v) => (
            <VideoCard key={v.key} video={v} onPlay={(vid) => navigate(`/video/${vid.key}`)} />
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
          <Route path="/category/:key" element={<CategoryPage />} />
          <Route path="/video/:key" element={<VideoPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}