import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/TopViewedMovies.scss";
import { API_URL } from "../utils/api";
import { setSEO } from "../utils/seo";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

export default function TopViewedMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO({
      title: "Top phim lượt xem cao | ClipDam18",
      description: "Những phim hot nhất theo lượt xem.",
      url: window.location.href,
      image: "https://clipdam18.com/og-image.jpg",
    });
  }, []);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/top-viewed`);
        const data = await res.json();

        if (data.success) {
          setMovies(data.items || []);
        }
      } catch (err) {
        console.error("TopViewedMovies error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  const heroMovie = useMemo(() => movies?.[0] || null, [movies]);

  return (
    <div className="rank-page">
      <Navbar isScrolled={true} />

      <div className="rank-page__backdrop">
        <img
          src={heroMovie?.backdrop || heroMovie?.poster || FALLBACK_BACKDROP}
          alt={heroMovie?.title || "top-viewed-backdrop"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="rank-shell">
        <div className="rank-hero">
          <div className="rank-hero__badge">TOP VIEWED</div>
          <h1 className="rank-hero__title">Top lượt xem</h1>
          <p className="rank-hero__desc">
            Những phim đang được người xem quan tâm nhiều nhất trên hệ thống.
          </p>
        </div>

        {loading ? (
          <div className="rank-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="rank-card rank-card--skeleton">
                <div className="rank-card__image skeleton" />
                <div className="rank-card__body">
                  <div className="skeleton skeleton--line lg" />
                  <div className="skeleton skeleton--line md" />
                </div>
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="rank-grid">
            {movies.map((movie, index) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="rank-card"
              >
                <div className="rank-card__image-wrap">
                  <img
                    className="rank-card__image"
                    src={movie.poster || movie.backdrop || FALLBACK_POSTER}
                    alt={movie.title}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_POSTER;
                    }}
                  />

                  <span className="rank-card__badge">#{index + 1}</span>

                  <div className="rank-card__overlay">
                    <span className="rank-card__watch">Xem chi tiết</span>
                  </div>
                </div>

                <div className="rank-card__body">
                  <h3 className="rank-card__title">{movie.title}</h3>

                  <div className="rank-card__meta">
                    <span>{movie.views || 0} lượt xem</span>
                    {movie.year ? <span>{movie.year}</span> : null}
                  </div>

                  <div className="rank-card__submeta">
                    {(movie.genre || []).slice(0, 2).join(" • ") ||
                      "Phim nổi bật"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rank-empty">
            <h2>Chưa có dữ liệu</h2>
            <p>Hiện chưa có phim nổi bật theo lượt xem.</p>
          </div>
        )}
      </div>
    </div>
  );
}