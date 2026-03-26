import React from "react";
import "./Card.scss";
import { Link } from "react-router-dom";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";

const Card = ({ movie }) => {
  const img = movie?.poster || movie?.backdrop || FALLBACK_POSTER;

  if (!movie?._id) return null;

  return (
    <Link to={`/movie/${movie._id}`} className="movieCard">
      <div className="cardImage">
        <img
          src={img}
          alt={movie?.title || "movie"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        <div className="overlay">
          <div className="overlay__content">
            <h3>{movie?.title || "Untitled"}</h3>
            <span>{movie?.genre?.[0] || "Phim lẻ"}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Card;