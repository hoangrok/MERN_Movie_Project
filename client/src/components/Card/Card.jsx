import React, { memo, useMemo, useState } from "react";
import "./Card.scss";
import { Link } from "react-router-dom";
import HoverPreviewVideo from "../HoverPreview/HoverPreviewVideo";
import { getPreviewFrames, normalizeImage } from "../../utils/previewTimeline";
import { getContinueWatching } from "../../utils/continueWatching";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/222/ffffff&text=Poster";

function getBestThumb(movie) {
  return (
    normalizeImage(movie?.backdrop) ||
    normalizeImage(Array.isArray(movie?.images) ? movie.images[0] : "") ||
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
  const previewFrames = useMemo(() => getPreviewFrames(movie, 4), [movie]);

  const watchProgress = useMemo(() => {
    const list = getContinueWatching();
    const item = list.find((i) => i._id === movie._id);
    return item ? item.progress : 0;
  }, [movie._id]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCanPlayPreview(false);
  };

  return (
    <Link
      to={`/movie/${movie.slug || movie._id}`}
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

        {watchProgress > 1 && watchProgress < 97 && (
          <div className="movieCard__progress-bar">
            <div className="movieCard__progress-fill" style={{ width: `${watchProgress}%` }} />
          </div>
        )}
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
