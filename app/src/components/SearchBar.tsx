import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { searchVideos } from "../services/api";
import type { Video } from "../types";

interface SearchBarProps {
  onResultClick?: (video: Video) => void;
}

export function SearchBar({ onResultClick }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Video[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const matches = await searchVideos(q);
    setResults(matches.slice(0, 12));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button onClick={handleOpen} className="search-trigger" aria-label="Search">
        <Search size={20} />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="search-bar open">
      <div className="search-input-wrap">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search videos..."
          className="search-input"
        />
        {query && (
          <button onClick={handleClose} className="search-clear" aria-label="Close search">
            <X size={18} />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="search-results">
          {results.map((v) => (
            <button key={v.key} className="search-result-item" onClick={() => onResultClick?.(v)}>
              {v.thumbnailUrl && (
                <img src={v.thumbnailUrl} alt="" className="search-result-thumb" loading="lazy" />
              )}
              <div className="search-result-info">
                <span className="search-result-title">{v.title}</span>
                {v.durationFormatted && <span className="search-result-duration">{v.durationFormatted}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}