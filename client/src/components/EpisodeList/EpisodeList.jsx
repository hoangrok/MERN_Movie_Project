import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { API_URL } from "../../utils/api";
import HlsPlayer from "../../HlsPlayer";
import {
  getPrefetchedStream,
  prefetchMovieStream,
} from "../../utils/streamPrefetch";
import "./EpisodeList.css";

export default function EpisodeList({ movie, variant = "default" }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [episodes, setEpisodes] = useState([]);
  const activeRef = useRef(null);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [activeStreamUrl, setActiveStreamUrl] = useState("");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [deletingEpisodeId, setDeletingEpisodeId] = useState("");

  useEffect(() => {
    if (!movie?.seriesId) return;

    fetch(`${API_URL}/movies/series/${movie.seriesId}?ts=${Date.now()}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setEpisodes(d.episodes || []); })
      .catch(() => {});
  }, [movie?.seriesId]);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [episodes]);

  useEffect(() => {
    if (variant !== "world" || episodes.length === 0) return;

    const warmup = async () => {
      const priority = episodes.slice(0, 3);
      await Promise.all(
        priority.map(async (ep) => {
          try {
            await prefetchMovieStream(ep._id || ep.slug);
          } catch {}
        })
      );

      for (const ep of episodes.slice(3, 6)) {
        try {
          await prefetchMovieStream(ep._id || ep.slug);
        } catch {}
      }
    };

    warmup();
  }, [episodes, variant]);

  const ensureEpisodePrefetched = async (ep) => {
    const movieKey = ep?._id || ep?.slug;
    if (!movieKey) return;
    if (getPrefetchedStream(movieKey)) return;

    try {
      await prefetchMovieStream(movieKey);
    } catch {}
  };

  useEffect(() => {
    if (!playerOpen) return;
    const id = requestAnimationFrame(() => setPlayerVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
    };
  }, [playerOpen]);

  const closePlayer = () => {
    setPlayerVisible(false);
    window.setTimeout(() => {
      setPlayerOpen(false);
      setActiveEpisode(null);
      setActiveStreamUrl("");
    }, 220);
  };

  const openWorldEpisode = async (ep) => {
    setActiveEpisode(ep);
    setPlayerOpen(true);

    const movieKey = ep._id || ep.slug;
    const cached = getPrefetchedStream(movieKey);
    if (cached) {
      setActiveStreamUrl(cached);
      return;
    }

    try {
      const nextUrl = await prefetchMovieStream(movieKey);
      setActiveStreamUrl(nextUrl);
    } catch {
      setActiveStreamUrl("");
    }
  };

  const handleDeleteEpisode = async (ep) => {
    if (!user?.isAdmin || !user?.token || !ep?._id) return;

    const confirmed = window.confirm(
      `Xoa nhanh video "${ep.episodeTitle || ep.title || ep.episodeLabel || ep._id}"?`
    );
    if (!confirmed) return;

    const isCurrentRoute = ep.slug === movie.slug || ep._id === movie._id;
    const remainingEpisodes = normalizedEpisodes.filter(
      (item) => String(item._id) !== String(ep._id)
    );
    const redirectEpisode = remainingEpisodes[0] || null;

    try {
      setDeletingEpisodeId(String(ep._id));

      const res = await fetch(`${API_URL}/movies/${ep._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Xoa video that bai");
      }

      setEpisodes((prev) =>
        prev.filter((item) => String(item._id) !== String(ep._id))
      );

      if (activeEpisode?._id === ep._id || activeEpisode?.slug === ep.slug) {
        closePlayer();
      }

      if (!isCurrentRoute) return;

      if (redirectEpisode) {
        navigate(`/movie/${redirectEpisode.slug || redirectEpisode._id}`, {
          replace: true,
          state: {
            prefetchedMovie: redirectEpisode,
            prefetchedStreamUrl: getPrefetchedStream(
              redirectEpisode._id || redirectEpisode.slug
            ),
          },
        });
        return;
      }

      navigate(movie?.contentArea === "world" ? "/the-gioi" : "/latest", {
        replace: true,
      });
    } catch (err) {
      window.alert(err.message || "Xoa video that bai");
    } finally {
      setDeletingEpisodeId("");
    }
  };

  const normalizedEpisodes = useMemo(() => {
    return episodes.map((ep) => {
      const width = Number(ep?.videoWidth) || 0;
      const height = Number(ep?.videoHeight) || 0;
      const ratio =
        width > 0 && height > 0 ? `${width} / ${height}` : "16 / 9";
      const thumb =
        ep?.backdrop ||
        ep?.previewTimeline?.items?.[0]?.url ||
        ep?.poster ||
        "";

      return {
        ...ep,
        __thumb: thumb,
        __ratio: ratio,
        __isPortrait: width > 0 && height > width,
        __frameMode:
          width > 0 && height > 0
            ? height > width
              ? "portrait"
              : Math.abs(width - height) <= Math.max(width, height) * 0.1
                ? "square"
                : "landscape"
            : "landscape",
      };
    });
  }, [episodes]);

  if (!movie?.seriesId || normalizedEpisodes.length < 2) return null;

  return (
    <section
      className={`epList ${variant === "world" ? "epList--world" : ""}`}
    >
      <div className="epList__head">
        <span className="epList__title">📺 {movie.seriesTitle || "Danh sách tập"}</span>
        <span className="epList__count">{normalizedEpisodes.length} tập</span>
      </div>

      <div className="epList__row">
        {normalizedEpisodes.map((ep) => {
          const isRouteActive = ep.slug === movie.slug || ep._id === movie._id;
          const isActive =
            variant === "world"
              ? !!activeEpisode &&
                (ep._id === activeEpisode._id || ep.slug === activeEpisode.slug)
              : isRouteActive;
          const episodeLabel =
            (typeof ep.episodeLabel === "string" && ep.episodeLabel.trim()) ||
            `Tập ${ep.episode}`;

          return (
            <div
              key={ep._id}
              ref={isActive ? activeRef : null}
              className={`epList__itemWrap ${isActive ? "epList__itemWrap--active" : ""}`}
            >
              <button
              type="button"
              className={`epList__btn ${isActive ? "epList__btn--active" : ""}`}
              onClick={() => {
                if (variant === "world") {
                  openWorldEpisode(ep);
                  return;
                }

                if (!isRouteActive) {
                  navigate(`/movie/${ep.slug || ep._id}`, {
                    state: {
                      prefetchedMovie: ep,
                      prefetchedStreamUrl: getPrefetchedStream(ep._id || ep.slug),
                    },
                  });
                }
              }}
              onMouseEnter={() => {
                if (variant === "world") ensureEpisodePrefetched(ep);
              }}
              onFocus={() => {
                if (variant === "world") ensureEpisodePrefetched(ep);
              }}
              title={ep.episodeTitle || episodeLabel}
              style={variant === "world" ? { "--ep-ratio": ep.__ratio } : undefined}
              >
              {variant === "world" ? (
                <>
                  <div className={`epList__thumb ${ep.__isPortrait ? "is-portrait" : ""}`}>
                    {ep.__thumb ? (
                      <img src={ep.__thumb} alt={ep.episodeTitle || episodeLabel} loading="lazy" />
                    ) : (
                      <div className="epList__thumbFallback">{episodeLabel}</div>
                    )}
                    <div className="epList__thumbShade" />
                    <span className="epList__chip">{isActive ? "Đang phát" : "Mở video"}</span>
                  </div>
                  <div className="epList__meta">
                    <div className="epList__metaTop">
                      <span className="epList__num">{episodeLabel}</span>
                      {ep.duration ? <span className="epList__dur">{ep.duration}p</span> : null}
                    </div>
                    {ep.episodeTitle ? (
                      <span className="epList__name">{ep.episodeTitle}</span>
                    ) : (
                      <span className="epList__name">
                        {ep.__isPortrait ? "Video dọc" : "Video ngang"}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {isActive && <span className="epList__playing">▶</span>}
                  <span className="epList__num">{episodeLabel}</span>
                  {ep.episodeTitle && (
                    <span className="epList__name">{ep.episodeTitle}</span>
                  )}
                </>
              )}
              </button>
              {user?.isAdmin && ep?._id ? (
                <button
                  type="button"
                  className="epList__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEpisode(ep);
                  }}
                  disabled={deletingEpisodeId === String(ep._id)}
                  aria-label={`Xoa ${episodeLabel}`}
                  title="Xoa nhanh"
                >
                  {deletingEpisodeId === String(ep._id) ? "..." : "x"}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {variant === "world" && playerOpen && activeEpisode && (
        <div
          className={`epList__playerOverlay${playerVisible ? " is-visible" : ""}`}
          onClick={closePlayer}
        >
          <div
            className={`epList__playerDialog epList__playerDialog--${
              activeEpisode.__frameMode || "landscape"
            }${playerVisible ? " is-visible" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="epList__playerClose"
              onClick={closePlayer}
              aria-label="Dong video"
            >
              ×
            </button>

            <div
              className="epList__playerShell"
              style={{ "--player-ratio": activeEpisode.__ratio || "16 / 9" }}
            >
              {activeStreamUrl ? (
                <HlsPlayer
                  src={activeStreamUrl}
                  poster=""
                  title={activeEpisode.episodeTitle || activeEpisode.title || "Video"}
                  autoPlay={true}
                  aspectRatio={activeEpisode.__ratio || "16 / 9"}
                />
              ) : (
                <div className="epList__playerLoading">Dang mo video...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
