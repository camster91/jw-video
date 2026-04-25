import { Link, useLocation } from "react-router-dom";
import type { Video } from "../types";
import { SearchBar } from "./SearchBar";

interface NavbarProps {
	onSearchResult?: (video: Video) => void;
}

export function Navbar({ onSearchResult }: NavbarProps) {
	const location = useLocation();

	return (
		<nav className="navbar">
			<div className="navbar-inner">
				<div className="navbar-left">
					<Link to="/" className="navbar-logo">
						<span className="logo-jw">JW</span>
						<span className="logo-video">VIDEO</span>
					</Link>
					<div className="navbar-links">
						<Link
							to="/"
							className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
						>
							Home
						</Link>
						<Link
							to="/browse"
							className={`nav-link ${location.pathname === "/browse" ? "active" : ""}`}
						>
							Browse
						</Link>
						<Link
							to="/search"
							className={`nav-link ${location.pathname === "/search" ? "active" : ""}`}
						>
							Search
						</Link>
						<Link
							to="/live"
							className={`nav-link ${location.pathname === "/live" ? "active" : ""}`}
						>
							Live
						</Link>
						<Link
							to="/favorites"
							className={`nav-link ${location.pathname === "/favorites" ? "active" : ""}`}
						>
							My List
						</Link>
					</div>
				</div>
				<div className="navbar-right">
					<SearchBar onResultClick={onSearchResult} />
				</div>
			</div>
		</nav>
	);
}
