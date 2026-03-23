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
      <img
        src={img}
        alt={movie?.title || "movie"}
        onError={(e) => {
          e.currentTarget.src = FALLBACK_POSTER;
        }}
      />
    </Link>
  );
};

export default Card;