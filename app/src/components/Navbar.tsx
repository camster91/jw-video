import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchBar } from "./SearchBar";
import type { Video } from "../types";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchResult = (video: Video) => {
    navigate(`/video/${video.key}`);
  };

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <span className="logo-jw">JW</span>
            <span className="logo-video">VIDEO</span>
          </Link>
          <div className="navbar-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/browse" className="nav-link">Browse</Link>
            <Link to="/favorites" className="nav-link">My List</Link>
          </div>
        </div>
        <div className="navbar-right">
          <SearchBar onResultClick={handleSearchResult} />
        </div>
      </div>
    </nav>
  );
}