import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Hls from "hls.js";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/MovieDetailPlayer.css";
import {
  saveContinueWatching,
  getContinueWatching,
  removeContinueWatching,
} from "../utils/continueWatching";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1280x720/111/ffffff&text=Backdrop";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function MovieDetail() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const skipTimerRef = useRef(null);

  const [movie, setMovie] = useState(null);
  const [related, setRelated] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [skipIndicator, setSkipIndicator] = useState("");
  const [skipSide, setSkipSide] = useState("");

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setError("");

        const movieRes = await fetch(`http://localhost:5000/api/movies/${id}`);
        const movieData = await movieRes.json();

        if (!movieData.success) {
          setError(movieData.message || "Không tải được movie");
          return;
        }

        setMovie(movieData.movie);

        const relatedRes = await fetch(
          `http://localhost:5000/api/movies/${id}/related`
        );
        const relatedData = await relatedRes.json();

        if (relatedData.success) {
          setRelated(relatedData.items || []);
        }

        const streamRes = await fetch(
          `http://localhost:5000/api/movies/${id}/stream`
        );
        const streamData = await streamRes.json();

        if (streamData.success) {
          setStreamUrl(streamData.signedUrl);
        } else {
          setError(streamData.message || "Không lấy được stream");
        }
      } catch (err) {
        console.error("MovieDetail loadData error:", err);
        setError("Lỗi tải dữ liệu movie");
      }
    }

    loadData();
  }, [id]);

  useEffect(() => {
    if (!streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    let hls = null;
    let cancelled = false;

    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setBufferedTime(0);
    setDuration(0);

    const markReady = () => {
      if (cancelled) return;
      setDuration(video.duration || 0);
      setVolume(video.volume ?? 1);
      setIsMuted(video.muted);
      setIsReady(true);
    };

    const onLoadedMetadata = () => {
      markReady();

      const list = getContinueWatching();
      const currentMovie = list.find((item) => item._id === id);

      if (
        currentMovie &&
        Number.isFinite(currentMovie.currentTime) &&
        currentMovie.currentTime > 0 &&
        currentMovie.currentTime < video.duration - 5
      ) {
        video.currentTime = currentMovie.currentTime;
        setCurrentTime(currentMovie.currentTime);
      }
    };

    const onCanPlay = () => {
      markReady();
    };

    const onTimeUpdate = () => {
      if (cancelled) return;

      setCurrentTime(video.currentTime || 0);

      try {
        if (video.buffered && video.buffered.length > 0) {
          const lastBuffered = video.buffered.end(video.buffered.length - 1);
          setBufferedTime(lastBuffered);
        }
      } catch {
        setBufferedTime(0);
      }

      if (movie) {
        saveContinueWatching({
          _id: movie._id,
          title: movie.title,
          poster: movie.poster,
          backdrop: movie.backdrop,
          duration: video.duration || movie.duration,
          currentTime: video.currentTime || 0,
          year: movie.year,
          rating: movie.rating,
          genre: movie.genre || movie.genres || [],
        });
      }
    };

    const onDurationChange = () => {
      if (cancelled) return;
      setDuration(video.duration || 0);
    };

    const onPlay = () => {
      if (cancelled) return;
      setIsPlaying(true);
      kickAutoHide();
    };

    const onPause = () => {
      if (cancelled) return;
      setIsPlaying(false);
      setShowControls(true);
    };

    const onVolumeChange = () => {
      if (cancelled) return;
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    const onEnded = () => {
      if (cancelled) return;
      removeContinueWatching(id);
      setIsPlaying(false);
      setShowControls(true);
    };

    const onError = (e) => {
      console.error("video element error:", e);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.load();
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        markReady();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
      });
    }

    return () => {
      cancelled = true;

      try {
        video.pause();
      } catch {}

      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);

      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, movie, id]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, []);

  const kickAutoHide = () => {
    setShowControls(true);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2200);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (video.paused) {
      try {
        await video.play();
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("play error:", err);
        }
      }
    } else {
      video.pause();
    }
  };

  const handleProgressChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const value = Number(e.target.value);
    video.currentTime = value;
    setCurrentTime(value);
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      duration || video.duration || 0
    );

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const showSkipFeedback = (seconds) => {
    setSkipIndicator(seconds > 0 ? `+${seconds}s` : `${seconds}s`);
    setSkipSide(seconds > 0 ? "right" : "left");

    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);

    skipTimerRef.current = setTimeout(() => {
      setSkipIndicator("");
      setSkipSide("");
    }, 700);
  };

  const handleDoubleClickVideo = (e) => {
    if (!isReady) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const isLeft = e.clientX < rect.left + rect.width / 2;

    if (isLeft) {
      skip(-10);
      showSkipFeedback(-10);
    } else {
      skip(10);
      showSkipFeedback(10);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;

    const value = Number(e.target.value);
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setIsMuted(value === 0);
  };

  const toggleFullscreen = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (!document.fullscreenElement) {
        await player.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("fullscreen error:", err);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("copy error:", err);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (!isReady) return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        skip(-5);
        showSkipFeedback(-5);
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        skip(5);
        showSkipFeedback(5);
      }

      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMute();
      }

      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration, isReady, isPlaying]);

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration
    ? Math.min((bufferedTime / duration) * 100, 100)
    : 0;

  if (error) {
    return (
      <div className="movie-detail-page">
        <Navbar isScrolled={true} />
        <div className="movie-detail-shell" style={{ paddingTop: 110 }}>
          <div className="movie-error-box">{error}</div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="movie-detail-page">
        <Navbar isScrolled={true} />
        <div className="movie-detail-shell" style={{ paddingTop: 110 }}>
          <div className="movie-loading-box">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-detail-page">
      <Navbar isScrolled={true} />

      <div className="movie-detail-backdrop">
        <img
          src={movie.backdrop || movie.poster || FALLBACK_BACKDROP}
          alt={movie.title}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="movie-detail-shell">
        <div className="movie-detail-breadcrumbs">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Xem phim</span>
          <span>/</span>
          <strong>{movie.title}</strong>
        </div>

        <div className="movie-detail-layout">
          <main className="movie-detail-main">
            <div
              ref={playerRef}
              className="nf-player"
              onMouseMove={kickAutoHide}
              onMouseEnter={() => setShowControls(true)}
              onMouseLeave={() => isPlaying && setShowControls(false)}
            >
              <video
                ref={videoRef}
                className="nf-video"
                playsInline
                poster={movie.backdrop || movie.poster || FALLBACK_BACKDROP}
                onClick={togglePlay}
                onDoubleClick={handleDoubleClickVideo}
              />

              {skipIndicator && (
                <div className={`nf-skip-indicator ${skipSide}`}>
                  {skipIndicator}
                </div>
              )}

              {!isReady && (
                <div className="nf-loader">
                  <div className="nf-loader__spinner" />
                  <span>Đang tải video...</span>
                </div>
              )}

              <div
                className={`nf-overlay ${showControls ? "show" : ""}`}
                onClick={() => {
                  if (isReady) togglePlay();
                }}
              >
                <div className="nf-topbar">
                  <div>
                    <div className="nf-topbar__title">{movie.title}</div>
                    <div className="nf-topbar__sub">
                      {movie.year || "N/A"} • ⭐ {movie.rating || "N/A"} •{" "}
                      {movie.duration || "N/A"} phút
                    </div>
                  </div>
                </div>

                {isReady && !isPlaying && (
                  <div className="nf-center">
                    <button
                      className="nf-center__play"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                    >
                      ▶
                    </button>
                  </div>
                )}

                <div className="nf-bottombar">
                  <div className="nf-progress-wrap">
                    <div
                      className="nf-progress__buffered"
                      style={{ width: `${bufferedPercent}%` }}
                    />
                    <div
                      className="nf-progress__played"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <input
                      className="nf-progress"
                      type="range"
                      min="0"
                      max={duration || 0}
                      step="0.1"
                      value={currentTime}
                      onClick={(e) => e.stopPropagation()}
                      onChange={handleProgressChange}
                    />
                  </div>

                  <div className="nf-controls">
                    <div className="nf-controls__left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                        title="Play / Pause"
                      >
                        {isPlaying ? "❚❚" : "▶"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(-5);
                          showSkipFeedback(-5);
                        }}
                        title="Lùi 5 giây"
                      >
                        « 5
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(5);
                          showSkipFeedback(5);
                        }}
                        title="Tới 5 giây"
                      >
                        5 »
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        title="Mute / Unmute"
                      >
                        {isMuted || volume === 0 ? "🔇" : "🔊"}
                      </button>

                      <input
                        className="nf-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onClick={(e) => e.stopPropagation()}
                        onChange={handleVolumeChange}
                      />

                      <span className="nf-time">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="nf-controls__right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                        title="Fullscreen"
                      >
                        {isFullscreen ? "🡼" : "⛶"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="movie-info-card">
              <div className="movie-info-card__header">
                <div className="movie-info-card__left">
                  <h1 className="movie-title">{movie.title}</h1>

                  <div className="movie-tags">
                    {movie.year ? <span>📅 {movie.year}</span> : null}
                    {movie.rating ? <span>⭐ {movie.rating}</span> : null}
                    {movie.duration ? <span>⏱ {movie.duration} phút</span> : null}
                    <span>HD</span>
                  </div>
                </div>

                <div className="movie-actions">
                  <button
                    className="movie-action movie-action--primary"
                    onClick={togglePlay}
                  >
                    {isPlaying ? "Tạm dừng" : "Phát"}
                  </button>
                  <button
                    className="movie-action"
                    onClick={() => setSaved((prev) => !prev)}
                  >
                    {saved ? "Đã lưu" : "Lưu phim"}
                  </button>
                  <button className="movie-action" onClick={copyLink}>
                    {copied ? "Đã copy" : "Chia sẻ"}
                  </button>
                </div>
              </div>

              <div className="movie-meta-grid">
                <img
                  src={movie.poster || FALLBACK_POSTER}
                  alt={movie.title}
                  className="movie-poster"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_POSTER;
                  }}
                />

                <div className="movie-meta-content">
                  {movie.genre?.length > 0 && (
                    <div className="movie-genre">
                      <strong>Thể loại:</strong> {movie.genre.join(", ")}
                    </div>
                  )}

                  <div className="movie-desc">
                    {movie.description || "Chưa có mô tả."}
                  </div>

                  {movie.genre?.length > 0 && (
                    <div className="movie-click-tags">
                      {movie.genre.map((tag) => (
                        <Link
                          key={tag}
                          to={`/genres?genres=${encodeURIComponent(tag)}`}
                          className="movie-click-tag"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {related.length > 0 && (
              <section className="movie-recommend-card">
                <div className="movie-section-head">
                  <h2>Có thể bạn sẽ thích</h2>
                  <Link to="/top-viewed">Xem thêm</Link>
                </div>

                <div className="related-grid">
                  {related.slice(0, 6).map((item) => (
                    <Link
                      key={item._id}
                      to={`/movie/${item._id}`}
                      className="related-card"
                    >
                      <img
                        src={item.poster || FALLBACK_POSTER}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_POSTER;
                        }}
                      />
                      <div className="related-card__body">
                        <div className="related-card__title">{item.title}</div>
                        <div className="related-card__meta">
                          {item.year || "N/A"} • ⭐ {item.rating || "N/A"}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </main>

          <aside className="movie-detail-side">
            <div className="movie-side-card">
              <div className="movie-section-head">
                <h3>Video liên quan</h3>
              </div>

              <div className="movie-side-list">
                {related.length > 0 ? (
                  related.map((item) => (
                    <Link
                      key={item._id}
                      to={`/movie/${item._id}`}
                      className="movie-side-item"
                    >
                      <img
                        src={item.poster || FALLBACK_POSTER}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_POSTER;
                        }}
                      />
                      <div className="movie-side-item__info">
                        <h4>{item.title}</h4>
                        <p>
                          {item.year || "N/A"} • {item.duration || "N/A"} phút
                        </p>
                        <span>
                          {(item.genre || []).slice(0, 2).join(" • ") ||
                            "Phim liên quan"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="movie-side-empty">Chưa có nội dung liên quan.</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}