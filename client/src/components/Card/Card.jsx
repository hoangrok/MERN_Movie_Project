import React, { useRef, useState } from "react";
import "./Card.scss";
import { Link } from "react-router-dom";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";

const Card = ({ movie }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
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

  // Ưu tiên preview riêng, rồi trailer
  const previewUrl = movie?.previewUrl || movie?.trailer || "";

  const handleMouseEnter = () => {
    setIsHovered(true);

    if (previewUrl) {
      hoverTimerRef.current = setTimeout(async () => {
        setCanPlayPreview(true);

        try {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            await videoRef.current.play();
          }
        } catch (err) {
          console.log("Preview autoplay blocked:", err);
        }
      }, 450);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCanPlayPreview(false);

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
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
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        {previewUrl ? (
          <video
            ref={videoRef}
            className={`movieCard__video ${canPlayPreview ? "is-visible" : ""}`}
            src={previewUrl}
            muted
            playsInline
            loop
            preload="metadata"
            poster={poster}
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
};

export default Card;