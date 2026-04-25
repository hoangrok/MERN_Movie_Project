import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import "../assets/styles/LatestMovies.scss";
import { API_URL } from "../utils/api";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

function formatDate(dateString) {
  if (!dateString) return "Moi cap nhat";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN");
  } catch {
    return "Moi cap nhat";
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

function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function getTimelineFrames(movie, count = 4) {
  const items = Array.isArray(movie?.previewTimeline?.items)
    ? movie.previewTimeline.items
    : [];
  const seen = new Set();
  const urls = items
    .map((item) => normalizeImage(item?.url))
    .filter((url) => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });

  if (urls.length <= count) return urls;

  return [0.08, 0.34, 0.62, 0.88]
    .slice(0, count)
    .map((ratio) => urls[Math.floor((urls.length - 1) * ratio)])
    .filter(Boolean);
}

function LatestMovieCard({ movie, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);

  const imageSrc = movie.backdrop || movie.poster || FALLBACK_POSTER;
  const previewUrl = getDirectPreviewUrl(movie);
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

  return (
    <Link
      to={`/movie/${movie._id}`}
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
          <span className="latest-card__watch">Xem chi tiet</span>
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
            `${movie.views || 0} luot xem`}
        </div>
      </div>
    </Link>
  );
}

export default function LatestMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

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
          <div className="latest-hero__badge">MOI CAP NHAT</div>
          <h1 className="latest-hero__title">Phim moi cap nhat</h1>
          <p className="latest-hero__desc">
            Danh sach video moi duoc them vao he thong, tai nhanh va ho tro
            preview khi hover nhu YouTube.
          </p>
        </div>

        <AdSlot placement="latest_top" variant="banner" />

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
            <h2>Chua co phim moi</h2>
            <p>Hien chua co noi dung moi duoc cap nhat.</p>
          </div>
        )}
      </div>
    </div>
  );
}
