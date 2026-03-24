import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Hls from "hls.js";
import axios from "axios";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/MovieDetailPlayer.css";
import {
  saveContinueWatching,
  getContinueWatching,
  removeContinueWatching,
} from "../utils/continueWatching";
import { API_URL } from "../utils/api";
import { updateLikedMovies } from "../store/Slice/auth-slice";

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

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.72)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalStyle = {
  width: "100%",
  maxWidth: 920,
  maxHeight: "90vh",
  overflowY: "auto",
  background: "#0f1117",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 18,
  padding: 24,
  boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
};

const adminGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const adminFieldStyle = {
  display: "grid",
  gap: 8,
};

const adminLabelStyle = {
  fontSize: 14,
  color: "rgba(255,255,255,0.72)",
};

const adminInputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.05)",
  color: "#fff",
  outline: "none",
};

const adminTextareaStyle = {
  ...adminInputStyle,
  minHeight: 120,
  resize: "vertical",
};

const adminActionsStyle = {
  display: "flex",
  gap: 12,
  justifyContent: "flex-end",
  marginTop: 20,
  flexWrap: "wrap",
};

const adminButtonStyle = {
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

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
  const [saving, setSaving] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    year: "",
    rating: "",
    duration: "",
    genre: "",
    poster: "",
    backdrop: "",
    hlsUrl: "",
    isPublished: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        setError("");

        const movieRes = await fetch(`${API_URL}/movies/${id}`);
        const movieData = await movieRes.json();

        if (!movieData.success) {
          setError(movieData.message || "Không tải được movie");
          return;
        }

        setMovie(movieData.movie);

        const relatedRes = await fetch(`${API_URL}/movies/${id}/related`);
        const relatedData = await relatedRes.json();

        if (relatedData.success) {
          setRelated(relatedData.items || []);
        }

        const streamRes = await fetch(`${API_URL}/movies/${id}/stream`);
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
    if (!movie || !user?.likedMovies) {
      setSaved(false);
      return;
    }

    const exists = user.likedMovies.some(
      (item) => String(item.id || item._id) === String(movie._id)
    );

    setSaved(exists);
  }, [movie, user]);

  useEffect(() => {
    if (!movie) return;

    setEditForm({
      title: movie.title || "",
      description: movie.description || "",
      year: movie.year || "",
      rating: movie.rating || "",
      duration: movie.duration || "",
      genre: Array.isArray(movie.genre) ? movie.genre.join(", ") : "",
      poster: movie.poster || "",
      backdrop: movie.backdrop || "",
      hlsUrl: movie.hlsUrl || "",
      isPublished:
        typeof movie.isPublished === "boolean" ? movie.isPublished : true,
    });
  }, [movie]);

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

  const handleToggleSave = async () => {
    if (!movie) return;

    if (!user || !user.token) {
      navigate("/login");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      if (saved) {
        const { data } = await axios.put(
          `${API_URL}/users/remove`,
          { movieId: movie._id },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        dispatch(updateLikedMovies(data.movies || []));
        setSaved(false);
      } else {
        const payloadMovie = {
          ...movie,
          id: movie._id,
        };

        const { data } = await axios.post(
          `${API_URL}/users/add`,
          { movie: payloadMovie },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        dispatch(updateLikedMovies(data.movies || []));
        setSaved(true);
      }
    } catch (err) {
      console.error(
        "handleToggleSave error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUploadImage = async (file, field) => {
    if (!file || !user?.token) return;

    try {
      if (field === "poster") setUploadingPoster(true);
      if (field === "backdrop") setUploadingBackdrop(true);

      const formData = new FormData();
      formData.append("image", file);

      const { data } = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (data?.success && data?.url) {
        setEditForm((prev) => ({
          ...prev,
          [field]: data.url,
        }));
      } else {
        alert("Upload ảnh thất bại");
      }
    } catch (err) {
      console.error(
        "handleUploadImage error:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Upload ảnh thất bại");
    } finally {
      if (field === "poster") setUploadingPoster(false);
      if (field === "backdrop") setUploadingBackdrop(false);
    }
  };

  const handleOpenAdminModal = () => {
    if (!user?.isAdmin) return;
    setAdminMessage("");
    setShowAdminModal(true);
  };

  const handleCloseAdminModal = () => {
    if (adminLoading) return;
    setShowAdminModal(false);
    setAdminMessage("");
  };

  const handleUpdateMovie = async (e) => {
    e.preventDefault();

    if (!user?.isAdmin || !user?.token || !movie?._id) return;

    try {
      setAdminLoading(true);
      setAdminMessage("");

      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        year: editForm.year === "" ? undefined : Number(editForm.year),
        rating: editForm.rating === "" ? undefined : Number(editForm.rating),
        duration:
          editForm.duration === "" ? undefined : Number(editForm.duration),
        genre: editForm.genre,
        poster: editForm.poster.trim(),
        backdrop: editForm.backdrop.trim(),
        hlsUrl: editForm.hlsUrl.trim(),
        isPublished: !!editForm.isPublished,
      };

      const { data } = await axios.put(
        `${API_URL}/movies/${movie._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (data?.success && data?.movie) {
        setMovie(data.movie);
        setAdminMessage("Cập nhật phim thành công.");
        setShowAdminModal(false);
      } else {
        setAdminMessage("Cập nhật thất bại.");
      }
    } catch (err) {
      console.error(
        "handleUpdateMovie error:",
        err.response?.data || err.message
      );
      setAdminMessage(err.response?.data?.message || "Cập nhật thất bại.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteMovie = async () => {
    if (!user?.isAdmin || !user?.token || !movie?._id) return;

    const confirmed = window.confirm(
      `Bạn chắc chắn muốn xóa phim "${movie.title}"?`
    );
    if (!confirmed) return;

    try {
      setAdminLoading(true);
      await axios.delete(`${API_URL}/movies/${movie._id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      alert("Xóa phim thành công.");
      navigate("/");
    } catch (err) {
      console.error(
        "handleDeleteMovie error:",
        err.response?.data || err.message
      );
      alert(err.response?.data?.message || "Xóa phim thất bại.");
    } finally {
      setAdminLoading(false);
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

        {adminMessage && (
          <div
            style={{
              marginBottom: 16,
              background: "rgba(0,255,163,0.08)",
              color: "#c9ffe8",
              border: "1px solid rgba(0,255,163,0.18)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            {adminMessage}
          </div>
        )}

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
                    {movie.duration ? (
                      <span>⏱ {movie.duration} phút</span>
                    ) : null}
                    <span>HD</span>
                    {movie.isPublished === false ? <span>Ẩn</span> : null}
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
                    onClick={handleToggleSave}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : saved ? "Bỏ lưu" : "Lưu phim"}
                  </button>

                  <button className="movie-action" onClick={copyLink}>
                    {copied ? "Đã copy" : "Chia sẻ"}
                  </button>

                  {user?.isAdmin && (
                    <>
                      <button
                        className="movie-action"
                        onClick={handleOpenAdminModal}
                        style={{ background: "#3b82f6", color: "#fff" }}
                      >
                        ✏️ Sửa phim
                      </button>

                      <button
                        className="movie-action"
                        onClick={handleDeleteMovie}
                        disabled={adminLoading}
                        style={{ background: "#dc2626", color: "#fff" }}
                      >
                        {adminLoading ? "Đang xử lý..." : "🗑 Xóa phim"}
                      </button>
                    </>
                  )}
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
                  <div className="movie-side-empty">
                    Chưa có nội dung liên quan.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {showAdminModal && user?.isAdmin && (
        <div style={modalOverlayStyle} onClick={handleCloseAdminModal}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: 28 }}>Sửa phim</h2>
                <p
                  style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.7)" }}
                >
                  Chỉnh sửa trực tiếp thông tin phim
                </p>
              </div>

              <button
                onClick={handleCloseAdminModal}
                style={{
                  ...adminButtonStyle,
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                }}
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleUpdateMovie}>
              <div style={adminGridStyle}>
                <div style={adminFieldStyle}>
                  <label style={adminLabelStyle}>Tên phim</label>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                    required
                  />
                </div>

                <div style={adminFieldStyle}>
                  <label style={adminLabelStyle}>Năm</label>
                  <input
                    type="number"
                    name="year"
                    value={editForm.year}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />
                </div>

                <div style={adminFieldStyle}>
                  <label style={adminLabelStyle}>Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    name="rating"
                    value={editForm.rating}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />
                </div>

                <div style={adminFieldStyle}>
                  <label style={adminLabelStyle}>Thời lượng (phút)</label>
                  <input
                    type="number"
                    name="duration"
                    value={editForm.duration}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />
                </div>

                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1" }}>
                  <label style={adminLabelStyle}>
                    Thể loại (cách nhau bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    name="genre"
                    value={editForm.genre}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                    placeholder="Action, Drama, Romance"
                  />
                </div>

                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1" }}>
                  <label style={adminLabelStyle}>Mô tả</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditInputChange}
                    style={adminTextareaStyle}
                  />
                </div>

                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1" }}>
                  <label style={adminLabelStyle}>Poster URL</label>
                  <input
                    type="text"
                    name="poster"
                    value={editForm.poster}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        ...adminButtonStyle,
                        background: "#1f2937",
                        color: "#fff",
                        display: "inline-block",
                      }}
                    >
                      {uploadingPoster ? "Đang upload..." : "Upload Poster"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleUploadImage(e.target.files?.[0], "poster")
                        }
                      />
                    </label>

                    {editForm.poster && (
                      <img
                        src={editForm.poster}
                        alt="poster preview"
                        style={{
                          width: 70,
                          height: 96,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1" }}>
                  <label style={adminLabelStyle}>Backdrop URL</label>
                  <input
                    type="text"
                    name="backdrop"
                    value={editForm.backdrop}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <label
                      style={{
                        ...adminButtonStyle,
                        background: "#1f2937",
                        color: "#fff",
                        display: "inline-block",
                      }}
                    >
                      {uploadingBackdrop ? "Đang upload..." : "Upload Backdrop"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleUploadImage(e.target.files?.[0], "backdrop")
                        }
                      />
                    </label>

                    {editForm.backdrop && (
                      <img
                        src={editForm.backdrop}
                        alt="backdrop preview"
                        style={{
                          width: 140,
                          height: 80,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      />
                    )}
                  </div>
                </div>

                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1" }}>
                  <label style={adminLabelStyle}>HLS URL</label>
                  <input
                    type="text"
                    name="hlsUrl"
                    value={editForm.hlsUrl}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  />
                </div>

                <div
                  style={{
                    ...adminFieldStyle,
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <input
                    id="isPublished"
                    type="checkbox"
                    name="isPublished"
                    checked={!!editForm.isPublished}
                    onChange={handleEditInputChange}
                  />
                  <label htmlFor="isPublished" style={adminLabelStyle}>
                    Hiển thị phim công khai
                  </label>
                </div>
              </div>

              <div style={adminActionsStyle}>
                <button
                  type="button"
                  onClick={handleCloseAdminModal}
                  style={{
                    ...adminButtonStyle,
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                  }}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={adminLoading}
                  style={{
                    ...adminButtonStyle,
                    background: "#2563eb",
                    color: "#fff",
                  }}
                >
                  {adminLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}