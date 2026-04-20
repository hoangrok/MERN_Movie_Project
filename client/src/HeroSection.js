import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";

function formatViews(views) {
  if (!views) return "0 lượt xem";
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M lượt xem`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K lượt xem`;
  return `${views} lượt xem`;
}

export default function HeroSection({ movie, priority = false }) {
  const videoRef = useRef(null);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const title = movie?.title || "Nội dung nổi bật";
  const description =
    movie?.description?.trim() || "Nội dung đang được cập nhật.";
  const year = movie?.year || "2024";
  const rating = movie?.rating || "8";
  const views = formatViews(movie?.views || 0);
  const genres = Array.isArray(movie?.genre) ? movie.genre : [];
  const badge = movie?.featured ? "Nổi bật hôm nay" : "Đề xuất cho bạn";

  const heroImage = useMemo(() => {
    return movie?.backdrop || movie?.poster || "/placeholder-backdrop.jpg";
  }, [movie]);

  const heroVideo = useMemo(() => {
    return movie?.heroVideo || movie?.trailerUrl || "";
  }, [movie]);

  const detailHref = movie?.slug ? `/movie/${movie.slug}` : "#";
  const watchHref = movie?.slug ? `/watch/${movie.slug}` : "#";

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !heroVideo) return;

    setCanPlayVideo(false);

    const onCanPlay = () => setCanPlayVideo(true);
    const onError = () => setCanPlayVideo(false);

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("loadeddata", onCanPlay);
    el.addEventListener("error", onError);

    const playPromise = el.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        setCanPlayVideo(false);
      });
    }

    return () => {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("loadeddata", onCanPlay);
      el.removeEventListener("error", onError);
    };
  }, [heroVideo]);

  if (!movie) return null;

  return (
    <section className="hero-section">
      <div className="hero-media">
        {heroVideo ? (
          <video
            ref={videoRef}
            className={`hero-video ${canPlayVideo ? "show" : ""}`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroImage}
          >
            <source src={heroVideo} />
          </video>
        ) : null}

        <img
          src={heroImage}
          alt={title}
          className={`hero-image ${imageLoaded ? "loaded" : ""}`}
          onLoad={() => setImageLoaded(true)}
          loading={priority ? "eager" : "lazy"}
        />

        <div className="hero-overlay-left" />
        <div className="hero-overlay-bottom" />
        <div className="hero-overlay-top" />
        <div className="hero-overlay-vignette" />
      </div>

      <div className="hero-content">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          {badge}
        </div>

        <h1 className="hero-title">{title}</h1>

        <div className="hero-meta">
          <span className="meta-pill">{year}</span>
          <span className="meta-pill">★ {rating}</span>
          <span className="meta-pill">{views}</span>
          <span className="meta-pill">HD</span>
        </div>

        <p className="hero-description">{description}</p>

        {genres.length > 0 ? (
          <div className="hero-tags">
            {genres.slice(0, 3).map((item) => (
              <span key={item} className="hero-tag">
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="hero-actions">
          <Link to={watchHref} className="hero-btn hero-btn-primary">
            ▶ Xem ngay
          </Link>

          <Link to={detailHref} className="hero-btn hero-btn-secondary">
            👁 Khám phá thêm
          </Link>
        </div>
      </div>
    </section>
  );
}