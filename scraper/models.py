"""SQLAlchemy models for JW Video database."""

from sqlalchemy import Column, Float, Integer, String, Text, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(Text, unique=True, nullable=False, index=True)
    name = Column(Text, nullable=False)
    slug = Column(Text, nullable=False)
    parent_key = Column(Text, ForeignKey("categories.key"), nullable=True)
    type = Column(Text, nullable=False, default="ondemand")  # container or ondemand
    description = Column(Text, nullable=True)
    image_url = Column(Text, nullable=True)
    square_image_url = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)

    videos = relationship("Video", back_populates="category", cascade="all, delete-orphan")
    parent = relationship("Category", remote_side="Category.key", backref="children")

    def __repr__(self):
        return f"<Category(key={self.key}, name={self.name})>"


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(Text, unique=True, nullable=False, index=True)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    category_key = Column(Text, ForeignKey("categories.key"), nullable=True)
    duration = Column(Float, default=0)
    duration_formatted = Column(Text, nullable=True)
    first_published = Column(Text, nullable=True)
    media_type = Column(Text, default="video")
    thumbnail_url = Column(Text, nullable=True)
    poster_url = Column(Text, nullable=True)

    # Best video file for streaming
    stream_url = Column(Text, nullable=True)
    stream_resolution = Column(Text, nullable=True)
    stream_width = Column(Integer, nullable=True)
    stream_height = Column(Integer, nullable=True)

    # Subtitles
    subtitle_url = Column(Text, nullable=True)

    category = relationship("Category", back_populates="videos")
    files = relationship("VideoFile", back_populates="video", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Video(key={self.key}, title={self.title})>"


class VideoFile(Base):
    __tablename__ = "video_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    video_key = Column(Text, ForeignKey("videos.key"), nullable=False, index=True)
    label = Column(Text, nullable=True)  # e.g. "360p", "720p"
    frame_height = Column(Integer, nullable=True)
    subtitled = Column(Boolean, default=False)
    progressive_download_url = Column(Text, nullable=True)
    stream_url = Column(Text, nullable=True)  # m3u8 HLS URL if available
    file_size = Column(Integer, nullable=True)
    checksum = Column(Text, nullable=True)
    bitrate = Column(Float, nullable=True)
    frame_rate = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)

    video = relationship("Video", back_populates="files")

    def __repr__(self):
        return f"<VideoFile(video_key={self.video_key}, label={self.label})>"