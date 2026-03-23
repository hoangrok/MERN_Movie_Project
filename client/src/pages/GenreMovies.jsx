import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/GenreMovies.scss";
import { API_URL } from "../utils/api";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

export default function GenreMovies() {
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const genreList = useMemo(() => {
    const raw = searchParams.get("genres") || "";
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [searchParams]);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        setLoading(true);

        const query = encodeURIComponent(genreList.join(","));
        const res = await fetch(`${API_URL}/movies?genre=${query}`);
        const data = await res.json();

        if (data.success) {
          setMovies(data.items || []);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error("GenreMovies error:", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    if (genreList.length > 0) {
      loadMovies();
    } else {
      setMovies([]);
      setLoading(false);
    }
  }, [genreList]);

  const heroMovie = useMemo(() => movies?.[0] || null, [movies]);

  return (
    <div className="genre-page">
      <Navbar isScrolled={true} />

      <div className="genre-page__backdrop">
        <img
          src={heroMovie?.backdrop || heroMovie?.poster || FALLBACK_BACKDROP}
          alt={heroMovie?.title || "genre-backdrop"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="genre-shell">
        <div className="genre-hero">
          <div className="genre-hero__badge">THỂ LOẠI</div>
          <h1 className="genre-hero__title">Lọc theo thể loại</h1>
          <p className="genre-hero__desc">
            {genreList.length > 0
              ? `Đang lọc theo: ${genreList.join(", ")}`
              : "Chưa chọn thể loại nào."}
          </p>

          {genreList.length > 0 && (
            <div className="genre-selected">
              {genreList.map((genre) => (
                <span key={genre} className="genre-selected__chip">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="genre-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="genre-card genre-card--skeleton">
                <div className="genre-card__image skeleton" />
                <div className="genre-card__body">
                  <div className="skeleton skeleton--line lg" />
                  <div className="skeleton skeleton--line md" />
                </div>
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className="genre-empty">
            <h2>Không có phim phù hợp</h2>
            <p>Hãy thử chọn thể loại khác.</p>
          </div>
        ) : (
          <div className="genre-grid">
            {movies.map((movie) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="genre-card"
              >
                <div className="genre-card__image-wrap">
                  <img
                    className="genre-card__image"
                    src={movie.poster || movie.backdrop || FALLBACK_POSTER}
                    alt={movie.title}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_POSTER;
                    }}
                  />

                  <div className="genre-card__overlay">
                    <span className="genre-card__watch">Xem chi tiết</span>
                  </div>
                </div>

                <div className="genre-card__body">
                  <h3 className="genre-card__title">{movie.title}</h3>

                  <div className="genre-card__meta">
                    {(movie.genre || []).slice(0, 2).join(" • ") || "N/A"}
                  </div>

                  <div className="genre-card__submeta">
                    {movie.year ? `${movie.year} • ` : ""}
                    {movie.views || 0} lượt xem
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}