import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Hls from "hls.js";
import axios from "axios";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
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

function normalizeImage(url, fallback = "") {
  return typeof url === "string" && url.trim() ? url.trim() : fallback;
}

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
  const hlsRef = useRef(null);
  const lastContinueSaveRef = useRef(0);
  const progressWrapRef = useRef(null);
  const previewRafRef = useRef(null);
  const previewHideTimerRef = useRef(null);
  const previewCacheRef = useRef(new Map());
  const lastKnownTimeRef = useRef(0);
  const refreshingStreamRef = useRef(false);
  const activeStreamUrlRef = useRef("");
  const streamRefreshTimeRef = useRef(0);
  const currentMovieRef = useRef(null);
  const streamUrlRef = useRef("");
  const isMountedRef = useRef(false);
  const isSeekingRef = useRef(false);

  const [movie, setMovie] = useState(null);
  const [related, setRelated] = useState([]);
  const [recommend, setRecommend] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [posterHidden, setPosterHidden] = useState(false);
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

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLeft, setPreviewLeft] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewImage, setPreviewImage] = useState("");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [backdropSrc, setBackdropSrc] = useState(FALLBACK_BACKDROP);
  const [hlsLevels, setHlsLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

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
    currentMovieRef.current = movie;
  }, [movie]);

  useEffect(() => {
    streamUrlRef.current = streamUrl;
  }, [streamUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const kickAutoHide = useCallback(
    (forcePlaying = false) => {
      clearHideTimer();
      setShowControls(true);

      const video = videoRef.current;
      const shouldHide =
        forcePlaying || (!!video && !video.paused && !video.ended);

      if (!shouldHide || isSeekingRef.current || isBuffering) return;

      hideTimerRef.current = setTimeout(() => {
        const currentVideo = videoRef.current;
        if (
          currentVideo &&
          !currentVideo.paused &&
          !currentVideo.ended &&
          !isSeekingRef.current &&
          !isBuffering
        ) {
          setShowControls(false);
        }
      }, 2200);
    },
    [clearHideTimer, isBuffering]
  );

  const fetchSignedStream = useCallback(async () => {
    const streamRes = await fetch(`${API_URL}/movies/${id}/stream`, {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    });

    const streamData = await streamRes.json();

    if (streamRes.ok && streamData?.success && streamData?.signedUrl) {
      return streamData.signedUrl;
    }

    throw new Error(streamData?.message || "Không lấy được stream");
  }, [id, user?.token]);

  const preloadPreviewTimeline = (items = []) => {
    items.slice(0, 16).forEach((item) => {
      const url = normalizeImage(item?.url, "");
      if (!url || previewCacheRef.current.has(url)) return;

      const img = new Image();
      img.onload = () => {
        previewCacheRef.current.set(url, true);
      };
      img.onerror = () => {
        previewCacheRef.current.set(url, false);
      };
      img.src = url;
    });
  };

  const previewItems = useMemo(() => {
    const raw = Array.isArray(movie?.previewTimeline?.items)
      ? movie.previewTimeline.items
      : [];

    return raw
      .map((item) => ({
        second: Number(item?.second ?? item?.time ?? item?.at ?? 0),
        url: normalizeImage(item?.url, ""),
      }))
      .filter((item) => item.url)
      .sort((a, b) => a.second - b.second);
  }, [movie]);

  const backdropImage = useMemo(() => {
    return (
      normalizeImage(movie?.backdrop, "") ||
      normalizeImage(movie?.poster, "") ||
      FALLBACK_BACKDROP
    );
  }, [movie]);

  const posterImage = useMemo(() => {
    return (
      normalizeImage(movie?.poster, "") ||
      normalizeImage(movie?.backdrop, "") ||
      FALLBACK_POSTER
    );
  }, [movie]);

  // Auto-select best thumbnail: backdrop (cinematic) > timeline 30% > poster
  const cardThumbImage = useMemo(() => {
    const backdrop = normalizeImage(movie?.backdrop, "");
    if (backdrop) return backdrop;

    if (previewItems.length >= 3) {
      const frame = normalizeImage(
        previewItems[Math.floor(previewItems.length * 0.3)]?.url,
        ""
      );
      if (frame) return frame;
    }

    return normalizeImage(movie?.poster, "") || FALLBACK_POSTER;
  }, [movie, previewItems]);

  useEffect(() => {
    setBackdropSrc(backdropImage || FALLBACK_BACKDROP);
  }, [backdropImage]);

  const attachSourceToVideo = useCallback(
    async (url, { preserveTime = true, autoplay = false } = {}) => {
      const video = videoRef.current;
      if (!video || !url) return false;

      const previousTime = preserveTime
        ? lastKnownTimeRef.current || video.currentTime || 0
        : 0;

      const wasPlaying = autoplay || (!video.paused && !video.ended);

      activeStreamUrlRef.current = url;
      streamUrlRef.current = url;

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      clearHideTimer();
      video.pause();
      video.removeAttribute("src");

      try {
        video.load();
      } catch (e) {
        console.error("video reset load error:", e);
      }

      setIsReady(false);
      setIsBuffering(true);
      setIsPlaying(false);
      setError("");
      setBufferedTime(0);
      setHlsLevels([]);
      setCurrentQuality(-1);
      setShowQualityMenu(false);

      const restorePlaybackState = async () => {
        if (!videoRef.current) return;

        if (
          previousTime > 0 &&
          Number.isFinite(video.duration) &&
          previousTime < video.duration - 3
        ) {
          try {
            video.currentTime = previousTime;
            setCurrentTime(previousTime);
            lastKnownTimeRef.current = previousTime;
          } catch (e) {
            console.error("restore currentTime error:", e);
          }
        } else {
          const list = getContinueWatching();
          const currentMovie = list.find(
            (item) => String(item._id) === String(id)
          );

          if (
            currentMovie &&
            Number.isFinite(currentMovie.currentTime) &&
            currentMovie.currentTime > 0 &&
            Number.isFinite(video.duration) &&
            currentMovie.currentTime < video.duration - 5
          ) {
            try {
              video.currentTime = currentMovie.currentTime;
              setCurrentTime(currentMovie.currentTime);
              lastKnownTimeRef.current = currentMovie.currentTime;
            } catch (e) {
              console.error("restore continue watching error:", e);
            }
          }
        }

        if (wasPlaying) {
          try {
            await video.play();
          } catch (err) {
            if (err?.name !== "AbortError") {
              console.error("autoplay after attach error:", err);
            }
          }
        }
      };

      const markReady = async () => {
        if (!isMountedRef.current) return;
        setDuration(video.duration || 0);
        setVolume(video.volume ?? 1);
        setIsMuted(video.muted);
        setIsReady(true);
        setIsBuffering(false);
        await restorePlaybackState();
      };

      const isHls = /\.m3u8($|\?)/i.test(url);

      if (isHls) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.preload = "auto";

          const onLoadedMetadata = async () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            await markReady();
          };

          video.addEventListener("loadedmetadata", onLoadedMetadata, {
            once: true,
          });
          video.load();
          return true;
        }

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            maxBufferSize: 30 * 1000 * 1000,
            maxBufferHole: 1,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 8,
            fragLoadingRetryDelay: 1000,
            manifestLoadingRetryDelay: 1000,
            levelLoadingRetryDelay: 1000,
            capLevelToPlayerSize: true,
            abrEwmaDefaultEstimate: 5000000,
          });

          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            const levels = hls.levels
              .map((level, i) => ({ index: i, height: level.height || 0 }))
              .sort((a, b) => b.height - a.height);
            setHlsLevels(levels.length > 0 ? levels : [{ index: 0, height: 0 }]);
            setCurrentQuality(-1);
            await markReady();
          });

          hls.on(Hls.Events.ERROR, async (_, data) => {
            console.error("HLS error:", data);

            if (!data?.fatal) {
              if (
                data?.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
                data?.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE
              ) {
                setIsBuffering(true);
                try {
                  if (video.paused && !video.ended) {
                    await video.play();
                  }
                } catch (e) {
                  console.error("resume after non-fatal stall error:", e);
                }
              }
              return;
            }

            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              try {
                hls.recoverMediaError();
                setTimeout(async () => {
                  try {
                    if (
                      videoRef.current &&
                      videoRef.current.paused &&
                      !videoRef.current.ended
                    ) {
                      await videoRef.current.play();
                    }
                  } catch (e) {
                    console.error("resume after media recover error:", e);
                  }
                }, 120);
                return;
              } catch (e) {
                console.error("recoverMediaError error:", e);
              }
            }

            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR ||
              data?.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
              data?.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
              data?.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT
            ) {
              const current = video.currentTime || lastKnownTimeRef.current || 0;
              lastKnownTimeRef.current = current;

              try {
                if (refreshingStreamRef.current) return;

                const now = Date.now();
                if (now - streamRefreshTimeRef.current < 3000) return;

                refreshingStreamRef.current = true;
                streamRefreshTimeRef.current = now;

                const newUrl = await fetchSignedStream();

                if (!newUrl) {
                  setError("Không phát được stream HLS.");
                  return;
                }

                if (newUrl !== activeStreamUrlRef.current) {
                  setStreamUrl(newUrl);
                  return;
                }

                try {
                  hls.startLoad(-1);
                  if (video.paused && !video.ended) {
                    await video.play();
                  }
                } catch (e) {
                  console.error("restart load error:", e);
                }
              } catch (err) {
                console.error("refresh stream from HLS error:", err);
                setError("Không phát được stream HLS.");
              } finally {
                refreshingStreamRef.current = false;
              }

              return;
            }

            try {
              hls.destroy();
            } catch (e) {
              console.error("destroy hls error:", e);
            }

            setError("Không phát được stream HLS.");
          });

          return true;
        }

        setError("Trình duyệt không hỗ trợ HLS.");
        setIsBuffering(false);
        return false;
      }

      video.src = url;
      video.preload = "auto";

      const onLoadedMetadata = async () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        await markReady();
      };

      video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
      video.load();
      return true;
    },
    [clearHideTimer, fetchSignedStream, id]
  );

  const handleQualityChange = useCallback((levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  }, []);

  const refreshSignedStream = useCallback(async () => {
    if (refreshingStreamRef.current) return null;

    const now = Date.now();
    if (now - streamRefreshTimeRef.current < 3000) {
      return activeStreamUrlRef.current || null;
    }

    try {
      refreshingStreamRef.current = true;
      streamRefreshTimeRef.current = now;

      const newUrl = await fetchSignedStream();
      if (newUrl) {
        if (newUrl !== activeStreamUrlRef.current) {
          setStreamUrl(newUrl);
        }
        return newUrl;
      }

      return null;
    } catch (err) {
      console.error("refreshSignedStream error:", err);
      setError("Link phát đã hết hạn hoặc không thể làm mới stream.");
      return null;
    } finally {
      refreshingStreamRef.current = false;
    }
  }, [fetchSignedStream]);

  useEffect(() => {
    async function loadData() {
      try {
        setPageLoading(true);
        setError("");
        setMovie(null);
        setRelated([]);
        setRecommend([]);
        setStreamUrl("");
        activeStreamUrlRef.current = "";
        lastKnownTimeRef.current = 0;
        setIsReady(false);
        setIsPlaying(false);
        setIsBuffering(true);
        setPosterHidden(false);
        setCurrentTime(0);
        setDuration(0);
        setBufferedTime(0);

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const video = videoRef.current;
        if (video) {
          video.pause();
          video.removeAttribute("src");
          try {
            video.load();
          } catch (e) {
            console.error("video clear load error:", e);
          }
        }

        const movieRes = await fetch(`${API_URL}/movies/${id}`, {
          cache: "no-store",
        });
        const movieData = await movieRes.json();

        if (!movieRes.ok || !movieData?.success || !movieData?.movie) {
          removeContinueWatching(id);
          setError(movieData?.message || "Không tải được movie");
          setPageLoading(false);
          return;
        }

        setMovie(movieData.movie);

        try {
          const relatedRes = await fetch(`${API_URL}/movies/${id}/related`, {
            cache: "no-store",
          });
          const relatedData = await relatedRes.json();

          if (relatedData?.success) {
            const items = (relatedData.items || relatedData.movies || []).filter(
              (item) => String(item?._id) !== String(id)
            );
            setRelated(items);
          }
        } catch (err) {
          console.error("related error:", err);
        }

        try {
          const allRes = await fetch(`${API_URL}/movies?limit=12&page=1`, {
            cache: "no-store",
          });
          const allData = await allRes.json();

          const items = allData?.items || allData?.movies || [];
          if (Array.isArray(items)) {
            setRecommend(
              items.filter((item) => String(item?._id) !== String(id)).slice(0, 8)
            );
          }
        } catch (err) {
          console.error("recommend error:", err);
        }

        try {
          const signedUrl = await fetchSignedStream();
          activeStreamUrlRef.current = signedUrl;
          setStreamUrl(signedUrl);
        } catch (err) {
          console.error("stream error:", err);
          if (movieData.movie?.hlsUrl) {
            activeStreamUrlRef.current = movieData.movie.hlsUrl;
            setStreamUrl(movieData.movie.hlsUrl);
          } else {
            setError("Không lấy được stream");
            setIsBuffering(false);
          }
        }
      } catch (err) {
        console.error("MovieDetail loadData error:", err);
        setError("Lỗi tải dữ liệu movie");
        setIsBuffering(false);
      } finally {
        setPageLoading(false);
      }
    }

    loadData();
  }, [id, fetchSignedStream]);

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

    const firstTimelineImage = normalizeImage(
      movie?.previewTimeline?.items?.[0]?.url,
      ""
    );
    setPreviewImage(firstTimelineImage);
    setPreviewLoaded(false);
    preloadPreviewTimeline(movie?.previewTimeline?.items || []);
  }, [movie]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    attachSourceToVideo(streamUrl, {
      preserveTime: true,
      autoplay: false,
    });
  }, [streamUrl, attachSourceToVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const saveCurrentProgress = () => {
      const currentMovie = currentMovieRef.current;
      if (!currentMovie?._id) return;

      saveContinueWatching(
        currentMovie,
        video.currentTime || 0,
        video.duration || currentMovie.duration || 0
      );
    };

    const syncCurrentTime = () => {
      if (isSeekingRef.current) return;
      const nextTime = video.currentTime || 0;
      setCurrentTime(nextTime);
      lastKnownTimeRef.current = nextTime;
    };

    const syncBuffered = () => {
      try {
        if (video.buffered && video.buffered.length > 0) {
          const lastBuffered = video.buffered.end(video.buffered.length - 1);
          setBufferedTime(lastBuffered);
        } else {
          setBufferedTime(0);
        }
      } catch {
        setBufferedTime(0);
      }
    };

    const markReady = () => {
      setDuration(video.duration || 0);
      setVolume(video.volume ?? 1);
      setIsMuted(video.muted);
      setIsReady(true);
      setIsBuffering(false);
    };

    const onLoadedMetadata = () => {
      markReady();
      syncCurrentTime();
      syncBuffered();
    };

    const onLoadedData = () => {
      markReady();
      syncCurrentTime();
      syncBuffered();
    };

    const onCanPlay = () => {
      markReady();
      syncBuffered();
    };

    const onCanPlayThrough = () => {
      markReady();
      syncBuffered();
    };

    const onWaiting = () => {
      setIsBuffering(true);
      setShowControls(true);
      clearHideTimer();
    };

    const onPlaying = () => {
      setIsReady(true);
      setIsBuffering(false);
      setIsPlaying(true);
      kickAutoHide(true);
      setPosterHidden(true);
    };

    const onTimeUpdate = () => {
      syncCurrentTime();
      syncBuffered();

      const now = Date.now();
      if (now - lastContinueSaveRef.current < 5000) return;
      lastContinueSaveRef.current = now;

      saveCurrentProgress();
    };

    const onProgress = () => {
      syncBuffered();
    };

    const onSeeking = () => {
      isSeekingRef.current = true;
      setShowControls(true);
      clearHideTimer();
    };

    const onSeeked = () => {
      isSeekingRef.current = false;
      const nextTime = video.currentTime || 0;
      setCurrentTime(nextTime);
      lastKnownTimeRef.current = nextTime;
      syncBuffered();

      if (!video.paused) {
        kickAutoHide(true);
      }
    };

    const onDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      kickAutoHide(true);
    };

    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      setShowControls(true);
      clearHideTimer();
      saveCurrentProgress();
    };

    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };

    const onEnded = () => {
      removeContinueWatching(id);
      setIsPlaying(false);
      setIsBuffering(false);
      setShowControls(true);
      clearHideTimer();
    };

    const onError = async () => {
      console.error("video element error:", video.error);

      const currentUrl = streamUrlRef.current;
      if (!/m3u8($|\?)/i.test(currentUrl)) {
        setError("Không phát được video. Kiểm tra link stream hoặc quyền truy cập.");
        setIsBuffering(false);
        return;
      }

      const current = video.currentTime || lastKnownTimeRef.current || 0;
      lastKnownTimeRef.current = current;

      const refreshed = await refreshSignedStream();

      if (!refreshed) {
        setError("Không phát được video. Kiểm tra link stream hoặc quyền truy cập.");
        setIsBuffering(false);
      }
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlayThrough);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("progress", onProgress);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);

    return () => {
      try {
        saveCurrentProgress();
      } catch (err) {
        console.error("save continue watching cleanup error:", err);
      }

      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlayThrough);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
    };
  }, [clearHideTimer, id, kickAutoHide, refreshSignedStream]);

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
      clearHideTimer();
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
      if (previewHideTimerRef.current) clearTimeout(previewHideTimerRef.current);
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [clearHideTimer]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
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

    const nextDuration = duration || video.duration || 0;
    const value = Math.min(Math.max(0, Number(e.target.value)), nextDuration || 0);

    isSeekingRef.current = true;
    setCurrentTime(value);
    lastKnownTimeRef.current = value;
    video.currentTime = value;
  };

  const handleProgressCommit = () => {
    isSeekingRef.current = false;
    const video = videoRef.current;
    if (video && !video.paused) {
      kickAutoHide(true);
    }
  };

  const getPreviewImageByTime = (timeInSeconds) => {
    if (!previewItems.length) return "";

    let chosen = previewItems[0];

    for (const item of previewItems) {
      if (item.second <= timeInSeconds) {
        chosen = item;
      } else {
        break;
      }
    }

    return normalizeImage(chosen?.url, "");
  };

  const showPreviewAt = (clientX) => {
    if (!duration || !progressWrapRef.current || !previewItems.length) return;

    const rect = progressWrapRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const percent = rect.width ? x / rect.width : 0;
    const time = percent * duration;

    const previewHalfWidth = 98;
    const safeX = Math.min(
      Math.max(previewHalfWidth, x),
      Math.max(previewHalfWidth, rect.width - previewHalfWidth)
    );

    const nextPreview = getPreviewImageByTime(time);

    setPreviewLeft(safeX);
    setPreviewTime(time);

    if (!nextPreview) {
      setPreviewVisible(false);
      setPreviewImage("");
      setPreviewLoaded(false);
      return;
    }

    if (previewHideTimerRef.current) {
      clearTimeout(previewHideTimerRef.current);
      previewHideTimerRef.current = null;
    }

    setPreviewVisible(true);

    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
    }

    previewRafRef.current = requestAnimationFrame(() => {
      setPreviewLoaded(false);
      setPreviewImage(nextPreview);
    });
  };

  const handleProgressPreview = (e) => {
    const clientX =
      e.touches?.[0]?.clientX ??
      e.changedTouches?.[0]?.clientX ??
      e.clientX;

    if (!Number.isFinite(clientX)) return;
    showPreviewAt(clientX);
  };

  const hideProgressPreview = () => {
    if (previewHideTimerRef.current) {
      clearTimeout(previewHideTimerRef.current);
    }

    previewHideTimerRef.current = setTimeout(() => {
      setPreviewVisible(false);
      setPreviewLoaded(false);
    }, 60);
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video) return;

    const maxDuration = duration || video.duration || 0;
    const nextTime = Math.min(Math.max(0, video.currentTime + seconds), maxDuration);

    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    lastKnownTimeRef.current = nextTime;
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

  const handleOverlayClick = async (e) => {
    if (e.target !== e.currentTarget) return;
    await togglePlay();
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
      console.error("handleToggleSave error:", err.response?.data || err.message);

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
      console.error("handleUploadImage error:", err.response?.data || err.message);
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
        duration: editForm.duration === "" ? undefined : Number(editForm.duration),
        genre: editForm.genre,
        poster: editForm.poster.trim(),
        backdrop: editForm.backdrop.trim(),
        hlsUrl: editForm.hlsUrl.trim(),
        isPublished: !!editForm.isPublished,
      };

      const { data } = await axios.put(`${API_URL}/movies/${movie._id}`, payload, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (data?.success && data?.movie) {
        setMovie(data.movie);
        setAdminMessage("Cập nhật phim thành công.");
        setShowAdminModal(false);
      } else {
        setAdminMessage("Cập nhật thất bại.");
      }
    } catch (err) {
      console.error("handleUpdateMovie error:", err.response?.data || err.message);
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

      removeContinueWatching(movie._id);
      alert("Xóa phim thành công.");
      navigate("/");
    } catch (err) {
      console.error("handleDeleteMovie error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Xóa phim thất bại.");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

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
  }, [duration]);

  const multipleQualities = hlsLevels.filter((l) => l.height > 0).length > 1;
  const qualityLabel =
    currentQuality === -1
      ? hlsLevels[0]?.height > 0
        ? `${hlsLevels[0].height}p`
        : "Auto"
      : `${hlsLevels.find((l) => l.index === currentQuality)?.height || ""}p`;

  const safeDuration = Number.isFinite(duration) ? duration : 0;
  const safeCurrentTime = Math.min(currentTime || 0, safeDuration || 0);
  const progressPercent = safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0;
  const bufferedPercent = safeDuration
    ? Math.min((bufferedTime / safeDuration) * 100, 100)
    : 0;

  if (error && !movie) {
    return (
      <div className="movie-detail-page">
        <Navbar isScrolled={true} />
        <div className="movie-detail-shell" style={{ paddingTop: 110 }}>
          <div className="movie-error-box">{error}</div>
        </div>
      </div>
    );
  }

  if (pageLoading || !movie) {
    return (
      <div className="movie-detail-page">
        <Navbar isScrolled={true} />
        <div className="movie-detail-shell" style={{ paddingTop: 110 }}>
          <div className="movie-loading-box">Đang tải phim...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="movie-detail-page"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(5,7,12,.4), rgba(5,7,12,.95)), url(${backdropSrc || FALLBACK_BACKDROP})`,
      }}
    >
      <Navbar isScrolled={true} />

      <div className="movie-detail-backdrop">
        <img
          src={backdropSrc || FALLBACK_BACKDROP}
          alt={movie.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
          onError={(e) => {
            const fallback =
              normalizeImage(movie?.poster, "") || FALLBACK_BACKDROP;
            e.currentTarget.src = fallback;
            setBackdropSrc(fallback);
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
          <div className="movie-admin-message">{adminMessage}</div>
        )}

        <div className="movie-detail-layout">
          <main className="movie-detail-main">
            <div
              ref={playerRef}
              className="nf-player"
              onMouseMove={() => kickAutoHide()}
              onMouseEnter={() => kickAutoHide()}
              onMouseLeave={() => {
                hideProgressPreview();
                const video = videoRef.current;
                if (video && !video.paused && !isBuffering && !isSeekingRef.current) {
                  setShowControls(false);
                }
              }}
            >
              <video
                ref={videoRef}
                className="nf-video"
                playsInline
                preload="metadata"
                poster={posterImage || backdropSrc || FALLBACK_POSTER}
              />

              <div className={`nf-poster-layer${posterHidden ? " nf-poster-layer--hidden" : ""}`}>
                <img
                  src={backdropSrc || posterImage || FALLBACK_POSTER}
                  alt=""
                  draggable="false"
                />
                <div className="nf-poster-layer__vignette" />
              </div>

              {skipIndicator && (
                <div className={`nf-skip-indicator ${skipSide}`}>
                  {skipIndicator}
                </div>
              )}

              {(isBuffering || !isReady) && (
                <div className="nf-loader">
                  <div className="nf-loader__spinner" />
                  <span>{isReady ? "Đang buffer..." : "Đang tải video..."}</span>
                </div>
              )}

              <div
                className={`nf-overlay ${showControls ? "show" : ""}`}
                onClick={handleOverlayClick}
                onDoubleClick={handleDoubleClickVideo}
              >
                {isReady && !isPlaying && !isBuffering && (
                  <div className="nf-center">
                    <button
                      className="nf-bigplay"
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
                  <div
                    className="nf-progress-wrap"
                    ref={progressWrapRef}
                    onMouseMove={handleProgressPreview}
                    onMouseEnter={handleProgressPreview}
                    onMouseLeave={hideProgressPreview}
                    onTouchStart={handleProgressPreview}
                    onTouchMove={handleProgressPreview}
                    onTouchEnd={hideProgressPreview}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {previewVisible && !!previewImage && (
                      <div
                        className={`nf-progress-preview show ${
                          previewLoaded ? "is-loaded" : ""
                        }`}
                        style={{ left: `${previewLeft}px` }}
                      >
                        <div className="nf-preview-inner">
                          <img
                            src={previewImage}
                            alt=""
                            draggable="false"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "center",
                            }}
                            onLoad={() => setPreviewLoaded(true)}
                            onError={() => {
                              setPreviewLoaded(false);
                              setPreviewVisible(false);
                              setPreviewImage("");
                            }}
                          />
                          <span>{formatTime(previewTime)}</span>
                        </div>
                      </div>
                    )}

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
                      max={safeDuration || 0}
                      step="0.1"
                      value={safeCurrentTime}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        isSeekingRef.current = true;
                        clearHideTimer();
                        setShowControls(true);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        isSeekingRef.current = true;
                        clearHideTimer();
                        setShowControls(true);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onInput={handleProgressChange}
                      onChange={handleProgressChange}
                      onMouseUp={handleProgressCommit}
                      onTouchEnd={handleProgressCommit}
                    />
                  </div>

                  <div className="nf-controls" onClick={(e) => e.stopPropagation()}>
                    <div className="nf-controls__left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay();
                        }}
                      >
                        {isPlaying ? "❚❚" : "▶"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(-5);
                          showSkipFeedback(-5);
                        }}
                      >
                        « 5
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          skip(5);
                          showSkipFeedback(5);
                        }}
                      >
                        5 »
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
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
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onInput={handleVolumeChange}
                        onChange={handleVolumeChange}
                      />

                      <span className="nf-time">
                        {formatTime(safeCurrentTime)} / {formatTime(safeDuration)}
                      </span>

                      {hlsLevels.length > 0 && (
                        <div className="nf-quality-wrap">
                          {showQualityMenu && multipleQualities && (
                            <div className="nf-quality-menu">
                              <button
                                className={`nf-quality-option${currentQuality === -1 ? " active" : ""}`}
                                onClick={() => handleQualityChange(-1)}
                              >
                                Auto
                              </button>
                              {hlsLevels.filter((l) => l.height > 0).map((level) => (
                                <button
                                  key={level.index}
                                  className={`nf-quality-option${currentQuality === level.index ? " active" : ""}`}
                                  onClick={() => handleQualityChange(level.index)}
                                >
                                  {level.height}p
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            className="nf-quality-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (multipleQualities) setShowQualityMenu((prev) => !prev);
                            }}
                            style={{ cursor: multipleQualities ? "pointer" : "default" }}
                          >
                            {qualityLabel}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="nf-controls__right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFullscreen();
                        }}
                      >
                        {isFullscreen ? "🡼" : "⛶"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <AdSlot placement="movie_detail_below_player" variant="banner" />

            <section className="movie-info-card">
              <div className="movie-info-card__header">
                <div className="movie-info-card__left">
                  <h1 className="movie-title">{movie.title}</h1>

                  <div className="movie-tags">
                    {movie.year ? <span>📅 {movie.year}</span> : null}
                    {movie.rating ? <span>⭐ {movie.rating}</span> : null}
                    {movie.duration ? <span>⏱ {movie.duration} phút</span> : null}
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
                        className="movie-action movie-action--blue"
                        onClick={handleOpenAdminModal}
                      >
                        ✏️ Sửa phim
                      </button>

                      <button
                        className="movie-action movie-action--danger"
                        onClick={handleDeleteMovie}
                        disabled={adminLoading}
                      >
                        {adminLoading ? "Đang xử lý..." : "🗑 Xóa phim"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="movie-meta-grid">
                <div className="movie-poster-wrap">
                  {previewItems.length > 0 ? (
                    <GifPoster
                      previewItems={previewItems}
                      fallback={cardThumbImage || FALLBACK_POSTER}
                      alt={movie.title}
                    />
                  ) : (
                    <img
                      src={cardThumbImage}
                      alt={movie.title}
                      className="movie-poster"
                      onError={(e) => { e.currentTarget.src = FALLBACK_POSTER; }}
                    />
                  )}
                  <div className="movie-poster-overlay">
                    {movie.rating ? (
                      <span className="movie-poster-badge movie-poster-badge--rating">
                        ⭐ {movie.rating}
                      </span>
                    ) : null}
                    <span className="movie-poster-badge movie-poster-badge--hd">HD</span>
                  </div>
                </div>

                <div className="movie-meta-content">
                  {movie.genre?.length > 0 && (
                    <div className="movie-genre-block">
                      <div className="movie-genre-label">Thể loại</div>

                      <div className="movie-click-tags movie-click-tags--detail">
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
                    </div>
                  )}

                  <div className="movie-desc">
                    {movie.description || "Chưa có mô tả."}
                  </div>
                </div>
              </div>
            </section>

            <section className="movie-recommend-card">
              <div className="movie-section-head">
                <h2>Có thể bạn sẽ thích</h2>
                <Link to="/top-viewed">Xem thêm</Link>
              </div>

              <div className="related-grid">
                {(recommend.length > 0 ? recommend : related.slice(0, 8)).map(
                  (item) => (
                    <Link
                      key={item._id}
                      to={`/movie/${item._id}`}
                      className="related-card"
                    >
                      <div className="related-card__thumb">
                        <img
                          src={
                            normalizeImage(item.backdrop, "") ||
                            normalizeImage(item.poster, FALLBACK_POSTER)
                          }
                          alt={item.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: "center",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_POSTER;
                          }}
                        />
                      </div>

                      <div className="related-card__body">
                        <div className="related-card__title">{item.title}</div>
                        <div className="related-card__meta">
                          {item.year || "N/A"} • ⭐ {item.rating || "N/A"}
                        </div>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          </main>

          <aside className="movie-detail-side">
            <AdSlot placement="movie_detail_sidebar" variant="side" />

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
                        src={
                          normalizeImage(item.backdrop, "") ||
                          normalizeImage(item.poster, FALLBACK_POSTER)
                        }
                        alt={item.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                        }}
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

function GifPoster({ previewItems, fallback, alt }) {
  const frames = useMemo(() => {
    if (!previewItems.length) return [fallback];
    const total = previewItems.length;
    const count = Math.min(10, total);
    const picked = new Set();
    const result = [];

    // evenly spaced picks
    for (let i = 0; i < count; i++) {
      const idx = Math.floor((i / count) * total);
      picked.add(idx);
      result.push(previewItems[idx].url);
    }

    // shuffle for random feel
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result.filter(Boolean);
  }, [previewItems, fallback]);

  const [idx, setIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (frames.length <= 1) return;
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % frames.length);
      setAnimKey((prev) => prev + 1);
    }, 750);
    return () => clearInterval(timer);
  }, [frames]);

  return (
    <img
      key={animKey}
      src={frames[idx] || fallback}
      alt={alt}
      className="movie-poster gif-poster"
      onError={(e) => {
        e.currentTarget.src = fallback;
      }}
    />
  );
}
