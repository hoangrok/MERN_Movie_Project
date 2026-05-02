import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import "../assets/styles/LatestMovies.scss";
import { API_URL } from "../utils/api";
import { setSEO } from "../utils/seo";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/0f172a/ffffff&text=The+Gioi";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/020617/ffffff&text=The+Gioi";

const WORLD_COUNTRIES = [
  { value: "", label: "Tất cả" },
  { value: "Trung Quốc", label: "🇨🇳 Trung Quốc" },
  { value: "Nhật Bản", label: "🇯🇵 Nhật Bản" },
  { value: "Hàn Quốc", label: "🇰🇷 Hàn Quốc" },
  { value: "Thái Lan", label: "🇹🇭 Thái Lan" },
  { value: "Indonesia", label: "🇮🇩 Indonesia" },
  { value: "Malaysia", label: "🇲🇾 Malaysia" },
  { value: "Châu Âu", label: "🇪🇺 Châu Âu" },
  { value: "Khác", label: "Khác" },
];

function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function getFirstGalleryImage(movie) {
  return Array.isArray(movie?.images)
    ? normalizeImage(movie.images.find((item) => normalizeImage(item)))
    : "";
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

function WorldCard({ movie, index, isAdmin = false, isDeleting = false, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);

  const imageSrc =
    normalizeImage(movie.backdrop) ||
    getFirstGalleryImage(movie) ||
    normalizeImage(movie.poster) ||
    FALLBACK_POSTER;
  const previewUrl = getDirectPreviewUrl(movie);
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);
  return (
    <div
      className="latest-cardShell"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCanPlayPreview(false);
      }}
    >
      <Link
        to={`/movie/${movie.slug || movie._id}`}
        className="latest-card"
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

        <span className="latest-card__badge">
          {index < 3 ? "THE GIOI" : "WORLD"}
        </span>

        <div className="latest-card__overlay">
          <span className="latest-card__watch">Mo chi tiet</span>
        </div>
      </div>

      <div className="latest-card__body">
        <h3 className="latest-card__title">
          {movie.seriesTitle || movie.title}
        </h3>

        <div className="latest-card__meta">
          {movie.year ? <span>{movie.year}</span> : <span>Bo noi dung</span>}
          {movie.views ? <span>{movie.views} views</span> : null}
        </div>

        <div className="latest-card__submeta">
          {movie.seriesId
            ? "Bo anh di kem - nhieu tap"
            : (movie.genre || []).slice(0, 2).join(" - ") || "Video"}
        </div>
      </div>
      </Link>

      {isAdmin ? (
        <button
          type="button"
          className="latest-card__delete"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete?.(movie);
          }}
          disabled={isDeleting}
          aria-label={`Xoa ${movie.title}`}
          title="Xoa nhanh"
        >
          {isDeleting ? "..." : "x"}
        </button>
      ) : null}
    </div>
  );
}

export default function WorldHub() {
  const { user } = useSelector((state) => state.auth);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingMovieId, setDeletingMovieId] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  useEffect(() => {
    setSEO({
      title: "The gioi - Dam17+1",
      description:
        "Khu video The gioi: mot noi dung co the gom rat nhieu tap va bo anh di kem.",
      url: "https://www.clipdam18.com/the-gioi",
      image: "https://www.clipdam18.com/og-image.jpg",
    });
  }, []);

  const handleDeleteMovie = async (targetMovie) => {
    if (!user?.isAdmin || !user?.token || !targetMovie?._id) return;

    const confirmed = window.confirm(`Xoa nhanh "${targetMovie.title}"?`);
    if (!confirmed) return;

    try {
      setDeletingMovieId(String(targetMovie._id));
      const res = await fetch(`${API_URL}/movies/${targetMovie._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Xoa video that bai");
      }

      setMovies((prev) =>
        prev.filter((item) => String(item._id) !== String(targetMovie._id))
      );
    } catch (err) {
      window.alert(err.message || "Xoa video that bai");
    } finally {
      setDeletingMovieId("");
    }
  };

  useEffect(() => {
    const loadMovies = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/latest?area=world&limit=48`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (data.success) {
          setMovies(
            (data.items || []).filter((item) => item?.contentArea === "world")
          );
        }
      } catch (err) {
        console.error("WorldHub error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  const heroMovie = useMemo(() => movies?.[0] || null, [movies]);

  const filteredMovies = useMemo(() => {
    if (!selectedCountry) return movies;
    return movies.filter((m) => m.country === selectedCountry);
  }, [movies, selectedCountry]);

  return (
    <div className="latest-page">
      <Navbar isScrolled={true} />

      <div className="latest-page__backdrop">
        <img
          src={
            normalizeImage(heroMovie?.backdrop) ||
            getFirstGalleryImage(heroMovie) ||
            normalizeImage(heroMovie?.poster) ||
            FALLBACK_BACKDROP
          }
          alt={heroMovie?.title || "the-gioi-backdrop"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="latest-shell">
        <div className="latest-hero">
          <div className="latest-hero__badge">THE GIOI</div>
          <h1 className="latest-hero__title">Thu vien The gioi</h1>
          <p className="latest-hero__desc">
            Noi dung co nhieu tap, nhieu anh, mo vao la thay ngay danh sach de
            bam tung phan nhanh hon.
          </p>
          {user?.isAdmin ? (
            <Link
              to="/admin/the-gioi"
              className="latest-hero__cta"
              style={{
                display: "inline-flex",
                marginTop: 16,
                padding: "12px 16px",
                borderRadius: 999,
                background: "rgba(59,130,246,0.9)",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Admin upload The gioi
            </Link>
          ) : null}
        </div>

        <AdSlot placement="world_top" variant="banner" defer />

        {/* Country filter pills */}
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8,
          margin: "16px 0",
        }}>
          {WORLD_COUNTRIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setSelectedCountry(c.value)}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: selectedCountry === c.value
                  ? "2px solid #e50914"
                  : "1px solid rgba(255,255,255,0.18)",
                background: selectedCountry === c.value
                  ? "rgba(229,9,20,0.18)"
                  : "rgba(255,255,255,0.06)",
                color: selectedCountry === c.value ? "#ff4d57" : "rgba(255,255,255,0.75)",
                fontWeight: selectedCountry === c.value ? 700 : 400,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {c.label}
            </button>
          ))}
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
        ) : filteredMovies.length > 0 ? (
          <div className="latest-grid">
            {filteredMovies.map((movie, index) => (
              <WorldCard
                key={movie._id}
                movie={movie}
                index={index}
                isAdmin={!!user?.isAdmin}
                isDeleting={deletingMovieId === String(movie._id)}
                onDelete={handleDeleteMovie}
              />
            ))}
          </div>
        ) : (
          <div className="latest-empty">
            <h2>
              {selectedCountry
                ? `Chưa có nội dung ${selectedCountry}`
                : "Chưa có nội dung Thế giới"}
            </h2>
            <p>
              {selectedCountry
                ? "Thử chọn quốc gia khác hoặc xem tất cả."
                : "Khi upload ở admin thế giới, video sẽ hiện ở đây."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
