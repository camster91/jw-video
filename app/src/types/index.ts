export interface VideoFile {
  label: string;
  frameHeight: number;
  subtitled: boolean;
  progressiveDownloadUrl: string;
  fileSize: number;
  checksum?: string;
  bitrate?: number;
  frameRate?: number;
  width?: number;
  height?: number;
}

export interface Video {
  key: string;
  title: string;
  description?: string;
  categoryKey?: string;
  duration: number;
  durationFormatted?: string;
  firstPublished?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  streamUrl?: string;
  streamResolution?: string;
  subtitleUrl?: string;
  files?: VideoFile[];
}

export interface Category {
  key: string;
  name: string;
  slug: string;
  parentKey?: string;
  type: string; // "container" | "ondemand"
  description?: string;
  imageUrl?: string;
  squareImageUrl?: string;
  videoCount?: number;
  subcategories?: Category[];
}

export interface VideoData {
  categories: Category[];
  videos: Video[];
  exportedAt: string;
}