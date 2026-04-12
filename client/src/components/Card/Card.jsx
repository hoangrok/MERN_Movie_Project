import React, { memo, useRef, useState } from "react";
import "./Card.scss";
import { Link } from "react-router-dom";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";

function CardComponent({ movie }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);

  if (!movie?._id) return null;

  const poster = movie?.poster || movie?.backdrop || FALLBACK_POSTER;
  const title = movie?.title || "Untitled";
  const year = movie?.year || "";
  const rating = movie?.rating || "";
  const genreText = Array.isArray(movie?.genre)
    ? movie.genre.slice(0, 3).join(" • ")
    : movie?.genre || "";

  const rawPreviewUrl = movie?.previewUrl || movie?.trailer || movie?.trailerUrl || "";
  const isDirectVideoFile =
    typeof rawPreviewUrl === "string" &&
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(rawPreviewUrl.trim());

  const previewUrl = isDirectVideoFile ? rawPreviewUrl.trim() : "";

  const resetPreview = () => {
    setCanPlayPreview(false);

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);

    if (!previewUrl || previewFailed) return;

    hoverTimerRef.current = setTimeout(async () => {
      try {
        if (!videoRef.current) return;

        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();

        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }

        setCanPlayPreview(true);
      } catch (err) {
        console.log("Preview autoplay blocked:", err);
        setCanPlayPreview(false);
      }
    }, 450);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    resetPreview();
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
        <img
          className={`movieCard__image ${canPlayPreview ? "is-hidden" : ""}`}
          src={poster}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        {previewUrl && !previewFailed ? (
          <video
            ref={videoRef}
            className={`movieCard__video ${canPlayPreview ? "is-visible" : ""}`}
            src={previewUrl}
            muted
            playsInline
            loop
            preload="none"
            poster={poster}
            onWaiting={() => setCanPlayPreview(false)}
            onCanPlay={() => {
              if (isHovered) setCanPlayPreview(true);
            }}
            onPlaying={() => setCanPlayPreview(true)}
            onError={() => {
              setPreviewFailed(true);
              resetPreview();
            }}
          />
        ) : null}

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