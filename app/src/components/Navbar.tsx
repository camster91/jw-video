import { Link } from "react-router-dom";
import type { Video } from "../types";
import { SearchBar } from "./SearchBar";

interface NavbarProps {
	onSearchResult?: (video: Video) => void;
}

export function Navbar({ onSearchResult }: NavbarProps) {
	return (
		<nav className="navbar">
			<div className="navbar-inner">
				<div className="navbar-left">
					<Link to="/" className="navbar-logo">
						<span className="logo-jw">JW</span>
						<span className="logo-video">VIDEO</span>
					</Link>
					<div className="navbar-links">
						<Link to="/" className="nav-link">
							Home
						</Link>
						<Link to="/browse" className="nav-link">
							Browse
						</Link>
						<Link to="/favorites" className="nav-link">
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
