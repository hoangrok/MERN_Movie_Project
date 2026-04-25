import React, { memo, useMemo, useState } from "react";
import "./Card.scss";
import { Link } from "react-router-dom";
import HoverPreviewVideo from "../HoverPreview/HoverPreviewVideo";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/222/ffffff&text=Poster";

function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function dedupeImages(list = []) {
  const seen = new Set();

  return list.filter((item) => {
    const key = normalizeImage(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTimelineFrames(movie, count = 3) {
  const items = Array.isArray(movie?.previewTimeline?.items)
    ? movie.previewTimeline.items
    : [];

  const urls = dedupeImages(
    items.map((item) => normalizeImage(item?.url)).filter(Boolean)
  );

  if (!urls.length) return [];
  if (urls.length <= count) return urls.slice(0, count);

  const ratios =
    count === 4 ? [0.12, 0.38, 0.66, 0.88] : [0.15, 0.48, 0.8];

  return dedupeImages(
    ratios.map((ratio) => {
      const index = Math.min(
        urls.length - 1,
        Math.floor((urls.length - 1) * ratio)
      );
      return urls[index];
    })
  ).slice(0, count);
}

function getBestThumb(movie) {
  return (
    normalizeImage(movie?.backdrop) ||
    getTimelineFrames(movie, 1)[0] ||
    normalizeImage(movie?.poster) ||
    FALLBACK_POSTER
  );
}

function getDirectPreviewUrl(movie) {
  const rawPreviewUrl =
    movie?.previewUrl || movie?.trailer || movie?.trailerUrl || "";

  if (
    typeof rawPreviewUrl === "string" &&
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(rawPreviewUrl.trim())
  ) {
    return rawPreviewUrl.trim();
  }

  return "";
}

function CardComponent({ movie }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);

  if (!movie?._id) return null;

  const title = movie?.title || "Untitled";
  const year = movie?.year || "";
  const rating = movie?.rating || "";
  const genreText = Array.isArray(movie?.genre)
    ? movie.genre.slice(0, 3).join(" • ")
    : movie?.genre || "";

  const imageSrc = useMemo(() => getBestThumb(movie), [movie]);
  const previewUrl = useMemo(() => getDirectPreviewUrl(movie), [movie]);
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCanPlayPreview(false);
  };

  return (
    <Link
      to={`/movie/${movie._id}`}
      className={`movieCard ${isHovered ? "is-hovered" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={title}
    >
      <div className="movieCard__media">
        <div
          className="movieCard__bgBlur"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${imageSrc || FALLBACK_POSTER})`,
          }}
        />

        <img
          className={`movieCard__image ${canPlayPreview ? "is-hidden" : ""}`}
          src={imageSrc}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        <HoverPreviewVideo
          active={isHovered}
          movieId={movie._id}
          directUrl={previewUrl}
          frames={previewFrames}
          className="movieCard__video"
          poster={imageSrc}
          onVisibleChange={setCanPlayPreview}
        />

        <div className="movieCard__gradient" />
      </div>

      <div className="movieCard__info">
        <h3>{title}</h3>

        <div className="movieCard__meta">
          {year ? <span>{year}</span> : null}
          {rating ? <span>⭐ {rating}</span> : null}
        </div>

        {genreText ? <p>{genreText}</p> : null}
      </div>
    </Link>
  );
}

const Card = memo(CardComponent);
export default Card;
