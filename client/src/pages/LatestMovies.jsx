import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/LatestMovies.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

function formatDate(dateString) {
  if (!dateString) return "Mới cập nhật";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return "Mới cập nhật";
  }
}

export default function LatestMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/movies/latest");
        const data = await res.json();

        if (data.success) {
          setMovies(data.items || []);
        }
      } catch (err) {
        console.error("LatestMovies error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  const heroMovie = useMemo(() => movies?.[0] || null, [movies]);

  return (
    <div className="latest-page">
      <Navbar isScrolled={true} />

      <div className="latest-page__backdrop">
        <img
          src={
            heroMovie?.backdrop ||
            heroMovie?.poster ||
            FALLBACK_BACKDROP
          }
          alt={heroMovie?.title || "latest-backdrop"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="latest-shell">
        <div className="latest-hero">
          <div className="latest-hero__badge">MỚI CẬP NHẬT</div>
          <h1 className="latest-hero__title">Phim mới cập nhật</h1>
          <p className="latest-hero__desc">
            Khám phá những nội dung vừa được thêm mới trên hệ thống, cập nhật
            nhanh và xem ngay với giao diện đồng bộ hơn.
          </p>
        </div>

        {loading ? (
          <div className="latest-grid">
            {Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="latest-card latest-card--skeleton">
                <div className="latest-card__image skeleton" />
                <div className="latest-card__body">
                  <div className="skeleton skeleton--line lg" />
                  <div className="skeleton skeleton--line md" />
                </div>
              </div>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <div className="latest-grid">
            {movies.map((movie, index) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="latest-card"
              >
                <div className="latest-card__image-wrap">
                  <img
                    className="latest-card__image"
                    src={movie.poster || movie.backdrop || FALLBACK_POSTER}
                    alt={movie.title}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_POSTER;
                    }}
                  />

                  {index < 4 && (
                    <span className="latest-card__badge">NEW</span>
                  )}

                  <div className="latest-card__overlay">
                    <span className="latest-card__watch">Xem chi tiết</span>
                  </div>
                </div>

                <div className="latest-card__body">
                  <h3 className="latest-card__title">{movie.title}</h3>

                  <div className="latest-card__meta">
                    <span>{formatDate(movie.updatedAt)}</span>
                    {movie.year ? <span>{movie.year}</span> : null}
                  </div>

                  <div className="latest-card__submeta">
                    {(movie.genre || []).slice(0, 2).join(" • ") ||
                      `${movie.views || 0} lượt xem`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="latest-empty">
            <h2>Chưa có phim mới</h2>
            <p>Hiện chưa có nội dung mới được cập nhật.</p>
          </div>
        )}
      </div>
    </div>
  );
}