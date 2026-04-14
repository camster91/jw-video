import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Category } from "../types";

interface CategoryCardProps {
	category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
	return (
		<Link to={`/category/${category.key}`} className="category-card">
			<div className="category-card-image">
				{category.squareImageUrl ? (
					<img
						src={category.squareImageUrl}
						alt={category.name}
						loading="lazy"
					/>
				) : (
					<div className="category-card-placeholder">
						<svg
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="currentColor"
							opacity="0.4"
							aria-label={category.name}
						>
							<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
							<path d="M10 15l5-3-5-3v6z" opacity="0.6" />
						</svg>
					</div>
				)}
			</div>
			<div className="category-card-info">
				<h3>{category.name}</h3>
				{category.videoCount !== undefined && (
					<span className="category-count">{category.videoCount} videos</span>
				)}
			</div>
			<ChevronRight size={18} className="category-arrow" />
		</Link>
	);
}
