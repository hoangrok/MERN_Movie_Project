import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import "../assets/styles/LatestMovies.scss";
import { API_URL } from "../utils/api";
import { getPreviewFrames } from "../utils/previewTimeline";
import { setSEO } from "../utils/seo";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

function formatDate(dateString) {
  if (!dateString) return "Vừa cập nhật";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return "Vừa cập nhật";
  }
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

function LatestMovieCard({ movie, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);

  const imageSrc = movie.backdrop || movie.poster || FALLBACK_POSTER;
  const previewUrl = getDirectPreviewUrl(movie);
  const previewFrames = useMemo(() => getPreviewFrames(movie, 4), [movie]);

  return (
    <Link
      to={`/movie/${movie.slug || movie._id}`}
      className="latest-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCanPlayPreview(false);
      }}
    >
      <div className="latest-card__image-wrap">
        <img
          className={`latest-card__image ${canPlayPreview ? "is-hidden" : ""}`}
          src={imageSrc}
          alt={movie.title}
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
          className="latest-card__video"
          poster={imageSrc}
          onVisibleChange={setCanPlayPreview}
        />

        {index < 4 ? <span className="latest-card__badge">NEW</span> : null}

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
          {(movie.genre || []).slice(0, 2).join(" - ") ||
            `${movie.views || 0} lượt xem`}
        </div>
      </div>
    </Link>
  );
}

export default function LatestMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO({
      title: "Phim mới cập nhật - Dam17+1",
      description: "Danh sách video mới nhất được cập nhật hằng ngày trên Dam17+1.",
      url: "https://www.clipdam18.com/latest",
      image: "https://www.clipdam18.com/og-image.jpg",
    });
  }, []);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/latest`, {
          cache: "no-store",
        });
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
          src={heroMovie?.backdrop || heroMovie?.poster || FALLBACK_BACKDROP}
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
            Những clip vừa lên sóng — xem ngay trước khi ai kịp spoil cho bạn.
          </p>
        </div>

        <AdSlot placement="latest_top" variant="banner" defer />

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
              <LatestMovieCard key={movie._id} movie={movie} index={index} />
            ))}
          </div>
        ) : (
          <div className="latest-empty">
            <h2>Chưa có clip nào</h2>
            <p>Hệ thống đang cập nhật, quay lại sau nhé.</p>
          </div>
        )}
      </div>
    </div>
  );
}
