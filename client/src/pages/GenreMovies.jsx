import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/GenreMovies.scss";
import { API_URL } from "../utils/api";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Backdrop";

function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function getTimelineFrames(movie, count = 3) {
  const items = Array.isArray(movie?.previewTimeline?.items)
    ? movie.previewTimeline.items
    : [];
  const urls = [...new Set(items.map((i) => normalizeImage(i?.url)).filter(Boolean))];
  if (!urls.length) return [];
  if (urls.length <= count) return urls.slice(0, count);
  const ratios = count === 3 ? [0.15, 0.48, 0.8] : [0.12, 0.38, 0.66, 0.88];
  return ratios
    .map((r) => urls[Math.min(urls.length - 1, Math.floor((urls.length - 1) * r))])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, count);
}

function getCardImages(movie) {
  const backdrop = normalizeImage(movie?.backdrop);
  const poster = normalizeImage(movie?.poster);
  const frames = getTimelineFrames(movie, 2);
  const primary = backdrop || frames[0] || poster || FALLBACK_POSTER;
  const secondary = frames[1] || poster || primary;
  const tertiary = frames[0] || backdrop || poster || primary;
  return [primary, secondary, tertiary];
}

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
    let active = true;

    const loadMovies = async () => {
      try {
        setLoading(true);

        const query = encodeURIComponent(genreList.join(","));
        const res = await fetch(`${API_URL}/movies?genre=${query}`);
        const data = await res.json();

        if (!active) return;

        if (data.success) {
          setMovies(data.items || []);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error("GenreMovies error:", err);
        if (active) setMovies([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (genreList.length > 0) {
      loadMovies();
    } else {
      setMovies([]);
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [genreList]);

  const heroMovie = useMemo(() => movies?.[0] || null, [movies]);
  const heroImage =
    heroMovie?.backdrop || heroMovie?.poster || FALLBACK_BACKDROP;

  useEffect(() => {
    if (!heroImage) return;
    const img = new Image();
    img.src = heroImage;
  }, [heroImage]);

  return (
    <div className="genre-page">
      <Navbar isScrolled={true} />

      <div className="genre-page__backdrop">
        <img
          src={heroImage}
          alt={heroMovie?.title || "genre-backdrop"}
          decoding="async"
          fetchPriority="high"
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
            {movies.map((movie, index) => (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="genre-card"
              >
                <div className="genre-card__image-wrap">
                  <div className="genre-card__strip">
                    {getCardImages(movie).map((src, i) => (
                      <div key={i} className={`genre-card__pane genre-card__pane--${i + 1}`}>
                        <img
                          src={src}
                          alt={i === 1 ? movie.title : ""}
                          loading={index < 4 ? "eager" : "lazy"}
                          decoding="async"
                          onError={(e) => { e.currentTarget.src = FALLBACK_POSTER; }}
                        />
                      </div>
                    ))}
                  </div>

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