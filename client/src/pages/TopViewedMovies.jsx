import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import "../assets/styles/TopViewedMovies.scss";
import { API_URL } from "../utils/api";
import { setSEO } from "../utils/seo";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

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

function TopViewedCard({ movie, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);

  const imageSrc = movie.backdrop || movie.poster || FALLBACK_POSTER;
  const previewUrl = getDirectPreviewUrl(movie);
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

  return (
    <Link
      to={`/movie/${movie._id}`}
      className="rank-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCanPlayPreview(false);
      }}
    >
      <div className="rank-card__image-wrap">
        <img
          className={`rank-card__image ${canPlayPreview ? "is-hidden" : ""}`}
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
          className="rank-card__video"
          poster={imageSrc}
          onVisibleChange={setCanPlayPreview}
        />

        <span className="rank-card__badge">#{index + 1}</span>

        <div className="rank-card__overlay">
          <span className="rank-card__watch">Xem chi tiet</span>
        </div>
      </div>

      <div className="rank-card__body">
        <h3 className="rank-card__title">{movie.title}</h3>

        <div className="rank-card__meta">
          <span>{movie.views || 0} luot xem</span>
          {movie.year ? <span>{movie.year}</span> : null}
        </div>

        <div className="rank-card__submeta">
          {(movie.genre || []).slice(0, 2).join(" - ") || "Phim noi bat"}
        </div>
      </div>
    </Link>
  );
}

export default function TopViewedMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSEO({
      title: "Top luot xem | Dam17+1",
      description: "Nhung video duoc xem nhieu nhat tren Dam17+1.",
      url: window.location.href,
      image: "https://www.clipdam18.com/og-image.jpg",
    });
  }, []);

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/top-viewed`, {
          cache: "no-store",
        });
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
          <h1 className="rank-hero__title">Top luot xem</h1>
          <p className="rank-hero__desc">
            Nhung phim dang duoc nguoi xem quan tam nhieu nhat tren he thong.
          </p>
        </div>

        <AdSlot placement="top_viewed_top" variant="banner" />

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
              <TopViewedCard key={movie._id} movie={movie} index={index} />
            ))}
          </div>
        ) : (
          <div className="rank-empty">
            <h2>Chua co du lieu</h2>
            <p>Hien chua co phim noi bat theo luot xem.</p>
          </div>
        )}
      </div>
    </div>
  );
}
