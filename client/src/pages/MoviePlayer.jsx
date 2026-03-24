import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Hls from "hls.js";
import "./MoviePlayer.css";
import {
  saveContinueWatching,
  getContinueWatching,
  removeContinueWatching,
} from "../utils/continueWatching";
import { API_URL } from "../utils/api";

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);

  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s}`;
  return `${m}:${s}`;
}

const FALLBACK_POSTER = "https://placehold.co/280x420?text=Poster";
const FALLBACK_BACKDROP = "https://placehold.co/1280x720?text=Backdrop";

export default function MoviePlayer() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const hideTimerRef = useRef(null);

  const [movie, setMovie] = useState(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadMovie = async () => {
      try {
        setLoading(true);
        setError("");

        const movieRes = await fetch(`${API_URL}/movies/${id}`);
        const movieData = await movieRes.json();
        if (!movieData.success) {
          throw new Error(movieData.message || "Không lấy được movie");
        }

        const currentMovie = movieData.movie;
        setMovie(currentMovie);

        const streamRes = await fetch(`${API_URL}/movies/${id}/stream`);
        const streamData = await streamRes.json();
        if (!streamData.success) {
          throw new Error(streamData.message || "Không lấy được stream URL");
        }
        setStreamUrl(streamData.signedUrl);

        const relatedRes = await fetch(`${API_URL}/movies?type=all`);
        const relatedData = await relatedRes.json();
        if (relatedData.success) {
          const currentGenres = currentMovie?.genre || currentMovie?.genres || [];
          const items = (relatedData.items || [])
            .filter((m) => m._id !== currentMovie._id)
            .map((m) => {
              const itemGenres = m.genre || m.genres || [];
              const sameGenreCount = itemGenres.filter((g) =>
                currentGenres.includes(g)
              ).length;

              return {
                ...m,
                _score: sameGenreCount,
              };
            })
            .sort((a, b) => b._score - a._score)
            .slice(0, 12);

          setRelatedMovies(items);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Lỗi load video");
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [id]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
      });
    } else {
      setError("Trình duyệt không hỗ trợ HLS");
      return;
    }

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
      setVolume(video.volume);
      setIsMuted(video.muted);

      const list = getContinueWatching();
      const currentMovie = list.find((item) => item._id === id);

      if (
        currentMovie &&
        Number.isFinite(currentMovie.currentTime) &&
        currentMovie.currentTime > 0 &&
        currentMovie.currentTime < video.duration - 5
      ) {
        video.currentTime = currentMovie.currentTime;
        setCurrent(currentMovie.currentTime);
      }
    };

    const onTimeUpdate = () => {
      setCurrent(video.currentTime || 0);

      try {
        if (video.buffered.length > 0) {
          const last = video.buffered.end(video.buffered.length - 1);
          setBuffered(last);
        }
      } catch {
        setBuffered(0);
      }

      if (movie) {
        saveContinueWatching({
          _id: movie._id,
          title: movie.title,
          poster: movie.poster,
          backdrop: movie.backdrop,
          genre: movie.genre || movie.genres || [],
          year: movie.year,
          duration: video.duration,
          currentTime: video.currentTime,
        });
      }
    };

    const onEnded = () => {
      removeContinueWatching(id);
      setIsPlaying(false);
    };

    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("fullscreenchange", onFullscreenChange);

      if (hls) hls.destroy();
    };
  }, [streamUrl, movie, id]);

  const kickAutoHide = () => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2200);
    }
  };

  useEffect(() => {
    kickAutoHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.error(e);
      }
    } else {
      video.pause();
    }
  };

  const seekTo = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;

    const value = Number(e.target.value);
    video.currentTime = value;
    setCurrent(value);
  };

  const rewind10 = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const forward10 = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(
      duration || video.duration || 0,
      video.currentTime + 10
    );
  };

  const changeVolume = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const value = Number(e.target.value);
    video.volume = value;
    video.muted = value === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (!document.fullscreenElement) {
      await wrap.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSave = () => {
    setSaved((prev) => !prev);
  };

  const progressPercent = duration ? (current / duration) * 100 : 0;
  const bufferedPercent = duration
    ? Math.min((buffered / duration) * 100, 100)
    : 0;

  const genres = useMemo(() => movie?.genre || movie?.genres || [], [movie]);

  if (loading) {
    return (
      <div className="movie-page">
        <div className="movie-container">
          <div className="mp-skeleton mp-skeleton--player" />
          <div className="mp-skeleton-grid">
            <div className="mp-skeleton mp-skeleton--meta" />
            <div className="mp-skeleton mp-skeleton--side" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="movie-page">
        <div className="movie-container">
          <div className="mp-error-box">
            <h2>Không thể phát video</h2>
            <p>{error}</p>
            <Link to="/" className="mp-primary-btn">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="movie-page">
      <div className="movie-page__backdrop">
        <img
          src={movie?.backdrop || movie?.poster || FALLBACK_BACKDROP}
          alt={movie?.title || "backdrop"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="movie-container">
        <div className="movie-breadcrumbs">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Xem phim</span>
          <span>/</span>
          <strong>{movie?.title}</strong>
        </div>

        <div className="movie-layout">
          <main className="movie-main">
            <div
              ref={wrapRef}
              className="nf-player"
              onMouseMove={kickAutoHide}
              onMouseLeave={() => isPlaying && setShowControls(false)}
            >
              <video
                ref={videoRef}
                className="nf-video"
                playsInline
                onClick={togglePlay}
                poster={movie?.backdrop || movie?.poster || FALLBACK_BACKDROP}
              />

              <div className={`nf-overlay ${showControls ? "show" : ""}`}>
                <div className="nf-topbar">
                  <div>
                    <div className="nf-title">{movie?.title || "Movie"}</div>
                    <div className="nf-subtitle">
                      {movie?.year || "N/A"} • ⭐ {movie?.rating || "N/A"} •{" "}
                      {movie?.duration || "N/A"} phút
                    </div>
                  </div>
                </div>

                <div className="nf-center">
                  <button className="nf-bigplay" onClick={togglePlay}>
                    {isPlaying ? "❚❚" : "▶"}
                  </button>
                </div>

                <div className="nf-bottombar">
                  <div className="nf-progress-wrap">
                    <div
                      className="nf-buffered"
                      style={{ width: `${bufferedPercent}%` }}
                    />
                    <div
                      className="nf-played"
                      style={{ width: `${progressPercent}%` }}
                    />
                    <input
                      className="nf-progress"
                      type="range"
                      min="0"
                      max={duration || 0}
                      step="0.1"
                      value={current}
                      onChange={seekTo}
                    />
                  </div>

                  <div className="nf-controls-row">
                    <div className="nf-left">
                      <button onClick={togglePlay}>
                        {isPlaying ? "❚❚" : "▶"}
                      </button>
                      <button onClick={rewind10}>« 10</button>
                      <button onClick={forward10}>10 »</button>
                      <button onClick={toggleMute}>
                        {isMuted || volume === 0 ? "🔇" : "🔊"}
                      </button>

                      <input
                        className="nf-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={changeVolume}
                      />

                      <span className="nf-time">
                        {formatTime(current)} / {formatTime(duration)}
                      </span>
                    </div>

                    <div className="nf-right">
                      <button onClick={toggleFullscreen}>
                        {isFullscreen ? "🡼" : "⛶"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {movie && (
              <>
                <section className="movie-info-card">
                  <div className="movie-info-card__header">
                    <div className="movie-info-card__title-wrap">
                      <h1>{movie.title}</h1>
                      <div className="movie-badges">
                        <span className="movie-badge movie-badge--accent">
                          HD
                        </span>
                        <span className="movie-badge">
                          {movie.year || "N/A"}
                        </span>
                        <span className="movie-badge">
                          ⭐ {movie.rating || "N/A"}
                        </span>
                        <span className="movie-badge">
                          {movie.duration || "N/A"} phút
                        </span>
                      </div>
                    </div>

                    <div className="movie-actions">
                      <button
                        className="movie-action movie-action--primary"
                        onClick={togglePlay}
                      >
                        {isPlaying ? "Tạm dừng" : "Phát"}
                      </button>
                      <button className="movie-action" onClick={toggleSave}>
                        {saved ? "Đã lưu" : "Lưu phim"}
                      </button>
                      <button className="movie-action" onClick={copyLink}>
                        {copied ? "Đã copy" : "Chia sẻ"}
                      </button>
                    </div>
                  </div>

                  <div className="movie-meta-grid">
                    <div className="movie-poster-wrap">
                      <img
                        src={movie.poster || FALLBACK_POSTER}
                        alt={movie.title}
                        className="movie-poster"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_POSTER;
                        }}
                      />
                    </div>

                    <div className="movie-meta-content">
                      <p className="movie-description">
                        {movie.description || "Chưa có mô tả cho phim này."}
                      </p>

                      <div className="movie-facts">
                        <div className="movie-fact">
                          <span className="label">Thể loại</span>
                          <span className="value">
                            {genres.length > 0 ? genres.join(", ") : "N/A"}
                          </span>
                        </div>
                        <div className="movie-fact">
                          <span className="label">Ngôn ngữ</span>
                          <span className="value">
                            {movie.original_language || "N/A"}
                          </span>
                        </div>
                        <div className="movie-fact">
                          <span className="label">Lượt xem</span>
                          <span className="value">{movie.views || "N/A"}</span>
                        </div>
                        <div className="movie-fact">
                          <span className="label">Năm phát hành</span>
                          <span className="value">{movie.year || "N/A"}</span>
                        </div>
                      </div>

                      {genres.length > 0 && (
                        <div className="movie-tags">
                          {genres.map((tag) => (
                            <Link
                              key={tag}
                              to={`/genres?genres=${encodeURIComponent(tag)}`}
                              className="movie-tag"
                            >
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="movie-recommend-card">
                  <div className="section-head">
                    <h2>Có thể bạn sẽ thích</h2>
                    <Link to="/top-viewed">Xem thêm</Link>
                  </div>

                  <div className="recommend-grid">
                    {relatedMovies.slice(0, 6).map((item) => (
                      <Link
                        to={`/movie/${item._id}`}
                        key={item._id}
                        className="recommend-card"
                      >
                        <img
                          src={item.poster || item.backdrop || FALLBACK_POSTER}
                          alt={item.title}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_POSTER;
                          }}
                        />
                        <div className="recommend-card__body">
                          <h4>{item.title}</h4>
                          <p>
                            {item.year || "N/A"} • ⭐ {item.rating || "N/A"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            )}
          </main>

          <aside className="movie-sidebar">
            <div className="related-card">
              <div className="section-head">
                <h3>Video liên quan</h3>
              </div>

              <div className="related-list">
                {relatedMovies.length > 0 ? (
                  relatedMovies.map((item) => (
                    <Link
                      key={item._id}
                      to={`/movie/${item._id}`}
                      className="related-item"
                    >
                      <img
                        src={item.poster || item.backdrop || FALLBACK_POSTER}
                        alt={item.title}
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_POSTER;
                        }}
                      />

                      <div className="related-item__info">
                        <h4>{item.title}</h4>
                        <p>
                          {item.year || "N/A"} • {item.duration || "N/A"} phút
                        </p>
                        <span>
                          {(item.genre || item.genres || [])
                            .slice(0, 2)
                            .join(" • ") || "Phim liên quan"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="related-empty">
                    Chưa có nội dung liên quan.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}