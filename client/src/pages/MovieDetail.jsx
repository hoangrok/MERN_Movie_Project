import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import ExoBanner from "../components/Ads/ExoBanner";
import EpisodeList from "../components/EpisodeList/EpisodeList";
import StarRating from "../components/StarRating/StarRating";
import CommentSection from "../components/Comments/CommentSection";
import "../assets/styles/MovieDetailPlayer.css";
import { setSEO } from "../utils/seo";
import {
  saveContinueWatching,
  getContinueWatching,
  removeContinueWatching,
} from "../utils/continueWatching";
import { API_URL } from "../utils/api";
import { updateLikedMovies } from "../store/Slice/auth-slice";
import {
  cachePrefetchedStream,
  getPrefetchedStream,
} from "../utils/streamPrefetch";
import {
  getAllPreviewFrames,
  getPreviewAssetUrl,
  getPreviewFrameAtTime,
  getPreviewFrameStyle,
  normalizeImage,
} from "../utils/previewTimeline";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1280x720/111/ffffff&text=Backdrop";
let hlsModulePromise = null;

async function loadHlsModule() {
  if (!hlsModulePromise) {
    hlsModulePromise = import("hls.js").then((mod) => mod.default || mod);
  }

  return hlsModulePromise;
}

function getQualityPixels(width = 0, height = 0) {
  const values = [Number(width) || 0, Number(height) || 0].filter(
    (value) => value > 0
  );

  if (!values.length) return 0;
  return Math.min(...values);
}

function formatQualityLabel(pixels = 0, fallback = "HD") {
  const safePixels = Number(pixels) || 0;

  if (safePixels >= 2160) return "4K";
  if (safePixels >= 1440) return "1440p";
  if (safePixels >= 1080) return "1080p";
  if (safePixels >= 720) return "720p";
  if (safePixels >= 480) return "480p";
  if (safePixels > 0) return `${safePixels}p`;

  return fallback;
}

function getQualityTone(pixels = 0) {
  return Number(pixels) >= 1080 ? "high" : "low";
}

function getVideoFrameMode(width, height) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!w || !h) return "landscape";
  if (h > w) return "portrait";
  if (w === h) return "square";
  return "landscape";
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
  const location = useLocation();
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
  const adminStatusPollRef = useRef(null);

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
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState([]);
  const [seriesEditorLoading, setSeriesEditorLoading] = useState(false);
  const [seriesEditorSaving, setSeriesEditorSaving] = useState(false);
  const [seriesEditorItems, setSeriesEditorItems] = useState([]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLeft, setPreviewLeft] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [previewFrame, setPreviewFrame] = useState(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [backdropSrc, setBackdropSrc] = useState(FALLBACK_BACKDROP);
  const [hlsLevels, setHlsLevels] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [seriesImages, setSeriesImages] = useState([]);
  const [videoFrameMode, setVideoFrameMode] = useState("landscape");
  const isWorldMovie = movie?.contentArea === "world";

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
    contentArea: "default",
    isPublished: true,
    seriesId: "",
    seriesTitle: "",
    season: "",
    episode: "",
    episodeLabel: "",
    episodeTitle: "",
  });

  const seededMovie = useMemo(() => {
    const candidate = location.state?.prefetchedMovie;
    if (!candidate) return null;
    if (String(candidate?._id) === String(id) || String(candidate?.slug) === String(id)) {
      return candidate;
    }
    return null;
  }, [id, location.state]);

  const seededStreamUrl = useMemo(() => {
    if (!seededMovie) return "";
    return typeof location.state?.prefetchedStreamUrl === "string"
      ? location.state.prefetchedStreamUrl
      : "";
  }, [location.state, seededMovie]);

  useEffect(() => {
    currentMovieRef.current = movie;
  }, [movie]);

  useEffect(() => {
    const width = Number(movie?.videoWidth) || 0;
    const height = Number(movie?.videoHeight) || 0;
    if (!width || !height) return;

    setVideoFrameMode(getVideoFrameMode(width, height));
  }, [movie?.videoWidth, movie?.videoHeight, movie?._id]);

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
    const cached = getPrefetchedStream(id);
    if (cached) return cached;

    const streamRes = await fetch(`${API_URL}/movies/${id}/stream`, {
      headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
    });

    const streamData = await streamRes.json();

    if (streamRes.ok && streamData?.success && streamData?.signedUrl) {
      return cachePrefetchedStream(id, streamData.signedUrl);
    }

    throw new Error(streamData?.message || "Không lấy được stream");
  }, [id, user?.token]);

  const preloadPreviewTimeline = (frames = []) => {
    const assets = [
      ...new Set(frames.map((frame) => getPreviewAssetUrl(frame)).filter(Boolean)),
    ];

    assets.slice(0, 16).forEach((url) => {
      if (previewCacheRef.current.has(url)) return;

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

  const previewFrames = useMemo(() => {
    return getAllPreviewFrames(movie);
  }, [movie]);

  const backdropImage = useMemo(() => {
    return (
      normalizeImage(movie?.backdrop) ||
      normalizeImage(movie?.poster) ||
      FALLBACK_BACKDROP
    );
  }, [movie]);

  const posterImage = useMemo(() => {
    return (
      normalizeImage(movie?.poster) ||
      normalizeImage(movie?.backdrop) ||
      FALLBACK_POSTER
    );
  }, [movie]);

  const initialPlayerArtwork = useMemo(() => {
    if (videoFrameMode === "portrait" || videoFrameMode === "square") {
      return posterImage || backdropSrc || FALLBACK_POSTER;
    }
    return backdropSrc || posterImage || FALLBACK_POSTER;
  }, [backdropSrc, posterImage, videoFrameMode]);

  // Auto-select best thumbnail: backdrop (cinematic) > timeline 30% > poster
  const cardThumbImage = useMemo(() => {
    const backdrop = normalizeImage(movie?.backdrop);
    if (backdrop) return backdrop;

    return normalizeImage(movie?.poster) || FALLBACK_POSTER;
  }, [movie]);

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

        const Hls = await loadHlsModule().catch(() => null);

        if (Hls?.isSupported()) {
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
              .map((level, i) => {
                const width = Number(level.width) || 0;
                const height = Number(level.height) || 0;
                const pixels = getQualityPixels(width, height);

                return { index: i, width, height, pixels };
              })
              .sort((a, b) => b.pixels - a.pixels);
            setHlsLevels(
              levels.length > 0 ? levels : [{ index: 0, width: 0, height: 0, pixels: 0 }]
            );
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
        const hasSeededMovie = !!seededMovie;
        setPageLoading(!hasSeededMovie);
        setError("");
        setMovie(seededMovie || null);
        setRelated([]);
        setRecommend([]);
        setStreamUrl(seededStreamUrl || "");
        activeStreamUrlRef.current = seededStreamUrl || "";
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
            const seen = new Set();
            const deduped = items.filter((item) => {
              if (String(item?._id) === String(id)) return false;
              if (item.seriesId) {
                if (seen.has(item.seriesId)) return false;
                seen.add(item.seriesId);
              }
              return true;
            });
            setRecommend(deduped.slice(0, 8));
          }
        } catch (err) {
          console.error("recommend error:", err);
        }

        if (movieData.movie?.contentArea === "world") {
          activeStreamUrlRef.current = "";
          setStreamUrl("");
          setIsBuffering(false);
        } else {
        try {
          const signedUrl = seededStreamUrl || (await fetchSignedStream());
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
  }, [id, fetchSignedStream, seededMovie, seededStreamUrl]);

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

    // JSON-LD Schema for Google
    const schemaId = "movie-jsonld";
    let script = document.getElementById(schemaId);
    if (!script) {
      script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    const canonical = `https://www.clipdam18.com/movie/${movie.slug || movie._id}`;
    const genres = Array.isArray(movie.genre) ? movie.genre : [];
    const genreText = genres.slice(0, 3).join(", ");
    const rawDesc = String(movie.description || "").trim();

    const description = rawDesc
      ? rawDesc.slice(0, 155)
      : `Xem ${movie.title}${genreText ? ` - ${genreText}` : ""} HD miễn phí tại Dam17+1. Clip sex Việt Nam chất lượng cao, cập nhật mới nhất.`;

    const pageTitle = genreText
      ? `${movie.title} [${genreText}] - Xem HD miễn phí - Dam17+1`
      : `${movie.title} - Xem clip sex HD miễn phí - Dam17+1`;

    const keywords = [
      movie.title,
      ...genres,
      "clip sex", "video sex", "phim sex", "sex việt nam",
      "xem miễn phí", "HD", "Dam17+1", "clipdam18",
    ].filter(Boolean).join(", ");

    const videoSchema = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: movie.title,
      description,
      keywords,
      thumbnailUrl: [movie.backdrop, movie.poster].filter(Boolean),
      uploadDate: movie.createdAt || new Date().toISOString(),
      ...(movie.duration ? { duration: `PT${Math.round(movie.duration)}M` } : {}),
      contentUrl: canonical,
      embedUrl: canonical,
      inLanguage: "vi-VN",
      genre: genres,
      ...(movie.cast?.length ? {
        actor: movie.cast.slice(0, 5).map((name) => ({ "@type": "Person", name })),
      } : {}),
      ...(movie.director ? {
        director: { "@type": "Person", name: movie.director },
      } : {}),
      ...(movie.views ? {
        interactionStatistic: {
          "@type": "InteractionCounter",
          interactionType: "https://schema.org/WatchAction",
          userInteractionCount: movie.views,
        },
      } : {}),
      ...(movie.rating > 0 && movie.ratingCount > 0 ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: movie.rating,
          bestRating: 5,
          worstRating: 1,
          ratingCount: movie.ratingCount,
        },
      } : {}),
      publisher: {
        "@type": "Organization",
        name: "Dam17+1",
        url: "https://www.clipdam18.com",
      },
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: "https://www.clipdam18.com/" },
        { "@type": "ListItem", position: 2, name: "Xem phim", item: "https://www.clipdam18.com/latest" },
        { "@type": "ListItem", position: 3, name: movie.title, item: canonical },
      ],
    };

    script.textContent = JSON.stringify([videoSchema, breadcrumbSchema]);

    setSEO({
      title: pageTitle,
      description,
      keywords,
      image: movie.backdrop || movie.poster || "https://www.clipdam18.com/og-image.jpg",
      url: canonical,
      type: "video.movie",
    });

    return () => {
      const el = document.getElementById(schemaId);
      if (el) el.remove();
    };
  }, [movie]);

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
      contentArea: movie.contentArea || "default",
      isPublished:
        typeof movie.isPublished === "boolean" ? movie.isPublished : true,
      seriesId:     movie.seriesId     || "",
      seriesTitle:  movie.seriesTitle  || "",
      season:       movie.season       || "",
      episode:      movie.episode      || "",
      episodeLabel: movie.episodeLabel || "",
      episodeTitle: movie.episodeTitle || "",
    });

    const firstTimelineFrame = previewFrames[0] || null;
    setPreviewFrame(firstTimelineFrame);
    setPreviewLoaded(Boolean(getPreviewAssetUrl(firstTimelineFrame)));
    preloadPreviewTimeline(previewFrames);
  }, [movie, previewFrames]);

  // Aggregate images from all episodes in the series
  useEffect(() => {
    if (!movie?.seriesId) {
      setSeriesImages(movie?.images?.length ? movie.images : []);
      return;
    }
    fetch(`${API_URL}/movies/series/${movie.seriesId}?ts=${Date.now()}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const all = [
          ...(movie?.images || []),
          ...(d.episodes || []).flatMap((ep) => ep.images || []),
        ];
        const unique = [...new Set(all.filter(Boolean))];
        setSeriesImages(unique.length ? unique : (movie?.images || []));
      })
      .catch(() => setSeriesImages(movie?.images || []));
  }, [movie?.seriesId, movie?.images]);

  useEffect(() => {
    return () => {
      galleryImagePreviews.forEach((src) => URL.revokeObjectURL(src));
    };
  }, [galleryImagePreviews]);

  useEffect(() => {
    if (!showAdminModal || !editForm.seriesId.trim()) {
      setSeriesEditorItems([]);
      return;
    }

    loadSeriesEditorItems(editForm.seriesId.trim());
  }, [showAdminModal, editForm.seriesId]);

  useEffect(() => {
    if (isWorldMovie || !streamUrl || !videoRef.current) return;

    attachSourceToVideo(streamUrl, {
      preserveTime: true,
      autoplay: false,
    });
  }, [attachSourceToVideo, isWorldMovie, streamUrl]);

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
      if (video.videoWidth && video.videoHeight) {
        setVideoFrameMode(getVideoFrameMode(video.videoWidth, video.videoHeight));
      }
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

      // Force a lightweight repaint after seek so the browser doesn't keep
      // a stale composited video frame with the wrong crop/scale.
      video.style.opacity = "0.999";
      requestAnimationFrame(() => {
        video.style.opacity = "1";
      });

      if (!video.paused) {
        kickAutoHide(true);
      }
    };

    const onDurationChange = () => {
      setDuration(video.duration || 0);
    };

    const onResize = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      setVideoFrameMode(getVideoFrameMode(video.videoWidth, video.videoHeight));
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
    video.addEventListener("resize", onResize);
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
      video.removeEventListener("resize", onResize);
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

  const showPreviewAt = (clientX) => {
    if (!duration || !progressWrapRef.current || !previewFrames.length) return;

    const rect = progressWrapRef.current.getBoundingClientRect();
    const x = Math.min(Math.max(0, clientX - rect.left), rect.width);
    const percent = rect.width ? x / rect.width : 0;
    const time = percent * duration;

    const previewHalfWidth = 98;
    const safeX = Math.min(
      Math.max(previewHalfWidth, x),
      Math.max(previewHalfWidth, rect.width - previewHalfWidth)
    );

    const nextPreview = getPreviewFrameAtTime(movie, time);
    const nextAssetUrl = getPreviewAssetUrl(nextPreview);

    setPreviewLeft(safeX);
    setPreviewTime(time);

    if (!nextPreview || !nextAssetUrl) {
      setPreviewVisible(false);
      setPreviewFrame(null);
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
      const isAlreadyLoaded = previewCacheRef.current.get(nextAssetUrl) === true;
      setPreviewFrame(nextPreview);
      setPreviewLoaded(isAlreadyLoaded);

      if (!isAlreadyLoaded) {
        const img = new Image();
        img.onload = () => {
          previewCacheRef.current.set(nextAssetUrl, true);
          setPreviewLoaded(true);
        };
        img.onerror = () => {
          previewCacheRef.current.set(nextAssetUrl, false);
          setPreviewLoaded(false);
          setPreviewVisible(false);
          setPreviewFrame(null);
        };
        img.src = nextAssetUrl;
      }
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

  const handleGalleryImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    setGalleryImages(files);
    setGalleryImagePreviews(files.map((file) => URL.createObjectURL(file)));
  };

  const handleUploadGalleryImages = async () => {
    if (!movie?._id || !user?.token || galleryImages.length === 0) return;

    try {
      setUploadingGallery(true);
      const formData = new FormData();
      galleryImages.forEach((file) => formData.append("images", file));

      const { data } = await axios.post(
        `${API_URL}/upload/movie-images/${movie._id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (!data?.success) {
        throw new Error(data?.message || "Upload anh that bai");
      }

      setMovie((prev) => (prev ? { ...prev, images: data.images || [] } : prev));
      setGalleryImages([]);
      setGalleryImagePreviews([]);
      setAdminMessage(`Da upload them ${data.added || 0} anh.`);
    } catch (err) {
      console.error("handleUploadGalleryImages error:", err.response?.data || err.message);
      setAdminMessage(err.response?.data?.message || "Upload anh that bai.");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGalleryImage = async (imageUrl) => {
    if (!movie?._id || !user?.token) return;
    if (!window.confirm("Xoá ảnh này?")) return;
    try {
      const { data } = await axios.delete(
        `${API_URL}/upload/movie-images/${movie._id}`,
        {
          headers: { Authorization: `Bearer ${user.token}` },
          data: { url: imageUrl },
        }
      );
      if (data?.success) {
        setMovie((prev) => (prev ? { ...prev, images: data.images || [] } : prev));
      }
    } catch (err) {
      console.error("handleDeleteGalleryImage error:", err.response?.data || err.message);
    }
  };

  const loadSeriesEditorItems = async (seriesId) => {
    if (!seriesId) {
      setSeriesEditorItems([]);
      return;
    }

    try {
      setSeriesEditorLoading(true);
      const res = await fetch(`${API_URL}/movies/series/${seriesId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data?.success) {
        setSeriesEditorItems(data.episodes || []);
      } else {
        setSeriesEditorItems([]);
      }
    } catch (err) {
      console.error("loadSeriesEditorItems error:", err);
      setSeriesEditorItems([]);
    } finally {
      setSeriesEditorLoading(false);
    }
  };

  const handleSeriesEditorChange = (index, field, value) => {
    setSeriesEditorItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveSeriesEditor = async () => {
    if (!user?.token || seriesEditorItems.length === 0) return;

    try {
      setSeriesEditorSaving(true);
      const baseSeriesTitle = editForm.seriesTitle.trim() || movie?.seriesTitle || movie?.title || "";

      const results = await Promise.all(
        seriesEditorItems.map(async (item, index) => {
          const episodeNumber = Number(item.episode) || index + 1;
          const episodeLabel =
            typeof item.episodeLabel === "string" ? item.episodeLabel.trim() : "";
          const displayLabel = episodeLabel || `Tập ${episodeNumber}`;

          const payload = {
            contentArea: editForm.contentArea === "world" ? "world" : "default",
            seriesId: editForm.seriesId.trim(),
            seriesTitle: baseSeriesTitle,
            season: Number(item.season) || Number(editForm.season) || 1,
            episode: episodeNumber,
            episodeLabel,
            episodeTitle: typeof item.episodeTitle === "string" ? item.episodeTitle.trim() : "",
            title:
              typeof item.title === "string" && item.title.trim()
                ? item.title.trim()
                : `${baseSeriesTitle} - ${displayLabel}`,
          };

          const { data } = await axios.put(`${API_URL}/movies/${item._id}`, payload, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });

          return data?.movie || item;
        })
      );

      const nextItems = [...results].sort((a, b) => {
        const seasonDiff = (Number(a.season) || 1) - (Number(b.season) || 1);
        if (seasonDiff !== 0) return seasonDiff;
        return (Number(a.episode) || 1) - (Number(b.episode) || 1);
      });

      setSeriesEditorItems(nextItems);
      const currentMovie = nextItems.find((item) => String(item._id) === String(movie?._id));
      if (currentMovie) {
        setMovie((prev) => (prev ? { ...prev, ...currentMovie } : prev));
      }
      setAdminMessage("Da cap nhat danh sach tap.");
    } catch (err) {
      console.error("handleSaveSeriesEditor error:", err.response?.data || err.message);
      setAdminMessage(err.response?.data?.message || "Cap nhat danh sach tap that bai.");
    } finally {
      setSeriesEditorSaving(false);
    }
  };

  const handleOpenAdminModal = () => {
    if (!user?.isAdmin) return;
    setAdminMessage("");
    setGalleryImages([]);
    setGalleryImagePreviews([]);
    setShowAdminModal(true);
  };

  const handleCloseAdminModal = () => {
    if (adminLoading) return;
    setShowAdminModal(false);
    setAdminMessage("");
    setGalleryImages([]);
    setGalleryImagePreviews([]);
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
        contentArea: editForm.contentArea === "world" ? "world" : "default",
        isPublished: !!editForm.isPublished,
        seriesId:     editForm.seriesId.trim(),
        seriesTitle:  editForm.seriesTitle.trim(),
        season:       editForm.season === "" ? undefined : Number(editForm.season),
        episode:      editForm.episode === "" ? undefined : Number(editForm.episode),
        episodeLabel: editForm.episodeLabel.trim(),
        episodeTitle: editForm.episodeTitle.trim(),
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
      let redirectPath = movie?.contentArea === "world" ? "/the-gioi" : "/latest";

      if (movie?.seriesId) {
        try {
          const seriesRes = await fetch(
            `${API_URL}/movies/series/${movie.seriesId}?ts=${Date.now()}`,
            {
              cache: "no-store",
            }
          );
          const seriesData = await seriesRes.json();

          if (seriesData?.success) {
            const sibling = (seriesData.episodes || []).find(
              (item) => String(item?._id) !== String(movie._id)
            );
            if (sibling?._id) {
              redirectPath = `/movie/${sibling.slug || sibling._id}`;
            }
          }
        } catch (seriesErr) {
          console.error("delete redirect lookup error:", seriesErr);
        }
      }

      await axios.delete(`${API_URL}/movies/${movie._id}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      removeContinueWatching(movie._id);
      alert("Xóa phim thành công.");
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error("handleDeleteMovie error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Xóa phim thất bại.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleReencodeHls = async () => {
    if (!user?.isAdmin || !user?.token || !movie?._id) return;

    const confirmed = window.confirm(
      `Re-encode lai HLS cho phim "${movie.title}"? Viec nay se dua phim vao hang cho xu ly nen.`
    );
    if (!confirmed) return;

    try {
      setAdminLoading(true);
      setAdminMessage("");

      const { data } = await axios.post(
        `${API_URL}/upload/reencode-hls/${movie._id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (data?.success) {
        setMovie((prev) =>
          prev
            ? {
                ...prev,
                status: data.status || "queued",
                processingError: "",
              }
            : prev
        );
        setAdminMessage("Da dua job re-encode HLS vao hang cho.");
      } else {
        setAdminMessage(data?.message || "Khong the queue re-encode HLS.");
      }
    } catch (err) {
      console.error("handleReencodeHls error:", err.response?.data || err.message);
      setAdminMessage(err.response?.data?.message || "Queue re-encode HLS that bai.");
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isAdmin || !user?.token || !movie?._id) return undefined;

    const status = String(movie.status || "").toLowerCase();
    if (!["queued", "processing"].includes(status)) return undefined;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const { data } = await axios.get(`${API_URL}/upload/status/${movie._id}`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const nextMovie = data?.movie;
        if (!data?.success || !nextMovie || cancelled) return;

        setMovie((prev) => (prev ? { ...prev, ...nextMovie } : nextMovie));

        const nextStatus = String(nextMovie.status || "").toLowerCase();
        if (nextStatus === "failed") {
          setAdminMessage(nextMovie.processingError || "Xu ly video that bai.");
          return;
        }

        if (nextStatus === "ready" && !isWorldMovie) {
          setAdminMessage("Re-encode HLS hoan tat.");

          try {
            const streamRes = await fetch(`${API_URL}/movies/${movie._id}/stream?ts=${Date.now()}`, {
              headers: user?.token ? { Authorization: `Bearer ${user.token}` } : {},
              cache: "no-store",
            });
            const streamData = await streamRes.json();

            if (!cancelled && streamRes.ok && streamData?.success && streamData?.signedUrl) {
              const nextUrl = cachePrefetchedStream(movie._id, streamData.signedUrl);
              activeStreamUrlRef.current = nextUrl;
              setStreamUrl(nextUrl);
            }
          } catch (streamErr) {
            console.error("refresh stream after status ready error:", streamErr);
          }
        }
      } catch (err) {
        console.error("poll movie status error:", err.response?.data || err.message);
      }
    };

    pollStatus();
    adminStatusPollRef.current = window.setInterval(pollStatus, 5000);

    return () => {
      cancelled = true;
      if (adminStatusPollRef.current) {
        window.clearInterval(adminStatusPollRef.current);
        adminStatusPollRef.current = null;
      }
    };
  }, [isWorldMovie, movie?._id, movie?.status, user?.isAdmin, user?.token]);

  useEffect(() => {
    if (isWorldMovie) return undefined;

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
  }, [duration, isWorldMovie]);

  const qualityLevels = hlsLevels.filter((l) => l.pixels > 0);
  const fallbackQualityPixels = getQualityPixels(
    Number(movie?.videoWidth) || 0,
    Number(movie?.videoHeight) || 0
  );
  const multipleQualities = qualityLevels.length > 1;
  const hasQualityBadge = hlsLevels.length > 0 || fallbackQualityPixels > 0;
  const selectedQualityPixels =
    currentQuality === -1
      ? qualityLevels[0]?.pixels || fallbackQualityPixels
      : hlsLevels.find((l) => l.index === currentQuality)?.pixels ||
        fallbackQualityPixels;
  const qualityLabel = formatQualityLabel(
    selectedQualityPixels,
    currentQuality === -1 ? "Auto" : "HD"
  );
  const qualityTone = getQualityTone(selectedQualityPixels);

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
      className={`movie-detail-page${isWorldMovie ? " movie-detail-page--world" : ""}`}
    >
      <Navbar isScrolled={true} />

      <div className="movie-detail-shell">
        <div className="movie-detail-breadcrumbs">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          {isWorldMovie ? <Link to="/the-gioi">The gioi</Link> : <span>Xem phim</span>}
          <span>/</span>
          <strong>{movie.title}</strong>
        </div>

        {adminMessage && (
          <div className="movie-admin-message">{adminMessage}</div>
        )}

        <div className="movie-detail-layout">
          <main className="movie-detail-main">
            {!isWorldMovie && (
            <div
              ref={playerRef}
              className={`nf-player nf-player--${videoFrameMode}${
                isWorldMovie ? " nf-player--world" : ""
              }`}
              style={{ "--player-frame-ratio": "16 / 9" }}
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
              <div className="nf-video-stage">
                <video
                  ref={videoRef}
                  className="nf-video"
                  playsInline
                  preload="metadata"
                  poster={initialPlayerArtwork}
                />
              </div>

              <div className={`nf-poster-layer${posterHidden ? " nf-poster-layer--hidden" : ""}`}>
                <img
                  src={initialPlayerArtwork}
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
                    {previewVisible && !!previewFrame && (
                      <div
                        className={`nf-progress-preview show ${
                          previewLoaded ? "is-loaded" : ""
                        }`}
                        style={{ left: `${previewLeft}px` }}
                      >
                        <div className="nf-preview-inner">
                          {previewFrame.type === "sprite" ? (
                            <div
                              className="nf-preview-media"
                              aria-hidden="true"
                              style={getPreviewFrameStyle(previewFrame, {
                                width: "100%",
                                height: "100%",
                              })}
                            />
                          ) : (
                            <img
                              className="nf-preview-media"
                              src={getPreviewAssetUrl(previewFrame)}
                              alt=""
                              draggable="false"
                              onLoad={() => setPreviewLoaded(true)}
                              onError={() => {
                                setPreviewLoaded(false);
                                setPreviewVisible(false);
                                setPreviewFrame(null);
                              }}
                            />
                          )}
                          <span>{formatTime(previewTime)}</span>
                        </div>
                      </div>
                    )}

                    <div className="nf-progress__rail" />
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
                      max={safeDuration || 1}
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

                      {hasQualityBadge && (
                        <div className="nf-quality-wrap">
                          {showQualityMenu && (
                            <div
                              className="nf-quality-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="nf-quality-menu__header">
                                <span>Quality</span>
                                <strong>{qualityLabel}</strong>
                              </div>
                              <button
                                className={`nf-quality-option${currentQuality === -1 ? " active" : ""}`}
                                onClick={() => handleQualityChange(-1)}
                              >
                                <span>Auto</span>
                                <span className="nf-quality-option__meta">
                                  {currentQuality === -1 ? "Selected" : "Adaptive"}
                                </span>
                              </button>
                              {qualityLevels.map((level) => (
                                <button
                                  key={level.index}
                                  className={`nf-quality-option nf-quality-option--${getQualityTone(
                                    level.pixels
                                  )}${currentQuality === level.index ? " active" : ""}`}
                                  onClick={() => handleQualityChange(level.index)}
                                >
                                  <span>{formatQualityLabel(level.pixels)}</span>
                                  <span className="nf-quality-option__meta">
                                    {currentQuality === level.index ? "Selected" : "Manual"}
                                  </span>
                                </button>
                              ))}
                              {!multipleQualities && (
                                <div className="nf-quality-hint">
                                  This video currently has one stream level only.
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            className={`nf-quality-btn nf-quality-btn--${qualityTone}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              clearHideTimer();
                              setShowControls(true);
                              setShowQualityMenu((prev) => !prev);
                            }}
                          >
                            Quality {qualityLabel} ▾
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
            )}

            {!isWorldMovie && (
              <>
                <AdSlot placement="movie_detail_below_player" variant="banner" />
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap", margin: "8px 0" }}>
                  <ExoBanner zoneId="5915992" className="eas6a97888e2" />
                  <ExoBanner zoneId="5916232" className="eas6a97888e2" />
                </div>
              </>
            )}

            <EpisodeList
              movie={movie}
              variant={isWorldMovie ? "world" : "default"}
            />

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
                        className="movie-action"
                        onClick={handleReencodeHls}
                        disabled={adminLoading}
                      >
                        {adminLoading ? "Dang xu ly..." : "Re-encode HLS"}
                      </button>

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

              {seriesImages.length > 0 && (
                <MovieGallery
                  images={seriesImages}
                  title={movie.seriesTitle || movie.title}
                  isSeries={!!movie.seriesId}
                  isWorld={isWorldMovie}
                />
              )}

              <div
                className={`movie-meta-grid${
                  isWorldMovie ? " movie-meta-grid--world" : ""
                }`}
              >
                {!isWorldMovie && (
                <div className="movie-poster-wrap">
                  <img
                    src={cardThumbImage}
                    alt={movie.title}
                    className="movie-poster"
                    onError={(e) => { e.currentTarget.src = FALLBACK_POSTER; }}
                  />
                  <div className="movie-poster-overlay">
                    {movie.rating ? (
                      <span className="movie-poster-badge movie-poster-badge--rating">
                        ⭐ {movie.rating}
                      </span>
                    ) : null}
                    <span className="movie-poster-badge movie-poster-badge--hd">HD</span>
                  </div>
                </div>
                )}

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

                  {!isWorldMovie && (
                    <div style={{ marginTop: 16 }}>
                      <StarRating movieId={movie._id} />
                    </div>
                  )}
                </div>
              </div>

              {!isWorldMovie && (
                <CommentSection movieId={movie._id} />
              )}
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
                      to={`/movie/${item.slug || item._id}`}
                      className="related-card"
                    >
                      <div className="related-card__thumb">
                        <img
                          src={
                            normalizeImage(item.backdrop) ||
                            normalizeImage(item.poster) ||
                            FALLBACK_POSTER
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
                      to={`/movie/${item.slug || item._id}`}
                      className="movie-side-item"
                    >
                      <img
                        src={
                          normalizeImage(item.backdrop) ||
                          normalizeImage(item.poster) ||
                          FALLBACK_POSTER
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

                <div style={adminFieldStyle}>
                  <label style={adminLabelStyle}>Khu vuc noi dung</label>
                  <select
                    name="contentArea"
                    value={editForm.contentArea}
                    onChange={handleEditInputChange}
                    style={adminInputStyle}
                  >
                    <option value="default">Noi dung thuong</option>
                    <option value="world">The gioi</option>
                  </select>
                </div>

                {/* ── SERIES ── */}
                <div style={{ ...adminFieldStyle, gridColumn: "1 / -1", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>
                    📺 Seri phim (để trống nếu là phim lẻ)
                  </p>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <label style={adminLabelStyle}>Series ID</label>
                      <input name="seriesId" placeholder='ID chung cho tất cả tập (VD: "ten-seri-abc")' value={editForm.seriesId} onChange={handleEditInputChange} style={adminInputStyle} />
                    </div>
                    <div>
                      <label style={adminLabelStyle}>Tên seri</label>
                      <input name="seriesTitle" placeholder="Tên seri đầy đủ" value={editForm.seriesTitle} onChange={handleEditInputChange} style={adminInputStyle} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={adminLabelStyle}>Mùa (Season)</label>
                        <input name="season" type="number" min="1" placeholder="1" value={editForm.season} onChange={handleEditInputChange} style={adminInputStyle} />
                      </div>
                      <div>
                        <label style={adminLabelStyle}>Số tập (Episode)</label>
                        <input name="episode" type="number" min="1" placeholder="1" value={editForm.episode} onChange={handleEditInputChange} style={adminInputStyle} />
                        <input
                          name="episodeLabel"
                          placeholder="Nhan tap hien thi (abc, xyz...)"
                          value={editForm.episodeLabel}
                          onChange={handleEditInputChange}
                          style={{ ...adminInputStyle, marginTop: 10 }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={adminLabelStyle}>Tên tập</label>
                      <input name="episodeTitle" placeholder="VD: Khởi đầu" value={editForm.episodeTitle} onChange={handleEditInputChange} style={adminInputStyle} />
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...adminFieldStyle,
                    gridColumn: "1 / -1",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: 16,
                  }}
                >
                  <label style={adminLabelStyle}>Ảnh dưới player</label>

                  {/* Already-uploaded images */}
                  {movie?.images?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        Ảnh đã upload ({movie.images.length})
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {movie.images.map((src, index) => (
                          <div key={src || index} style={{ position: "relative" }}>
                            <img
                              src={src}
                              alt={`gallery ${index + 1}`}
                              style={{
                                width: "100%",
                                aspectRatio: "16/9",
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.12)",
                                display: "block",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteGalleryImage(src)}
                              style={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                background: "rgba(220,38,38,0.85)",
                                border: "none",
                                borderRadius: 4,
                                color: "#fff",
                                fontSize: 11,
                                padding: "2px 6px",
                                cursor: "pointer",
                                lineHeight: 1.4,
                              }}
                            >
                              Xoá
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New image picker */}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageChange}
                    style={adminInputStyle}
                  />

                  {galleryImagePreviews.length > 0 && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {galleryImagePreviews.map((src, index) => (
                        <img
                          key={src || index}
                          src={src}
                          alt="preview"
                          style={{
                            width: "100%",
                            aspectRatio: "16/9",
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.12)",
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleUploadGalleryImages}
                    disabled={uploadingGallery || galleryImages.length === 0}
                    style={{
                      ...adminButtonStyle,
                      marginTop: 8,
                      background:
                        galleryImages.length === 0
                          ? "rgba(255,255,255,0.08)"
                          : "#14532d",
                      color: "#fff",
                    }}
                  >
                    {uploadingGallery
                      ? "Đang upload ảnh..."
                      : `Upload ${galleryImages.length || 0} ảnh`}
                  </button>
                </div>

                {!!editForm.seriesId.trim() && (
                  <div
                    style={{
                      ...adminFieldStyle,
                      gridColumn: "1 / -1",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      paddingTop: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <label style={adminLabelStyle}>Danh sách các tập cùng seri</label>
                      <button
                        type="button"
                        onClick={handleSaveSeriesEditor}
                        disabled={seriesEditorSaving || seriesEditorItems.length === 0}
                        style={{
                          ...adminButtonStyle,
                          background: "#1d4ed8",
                          color: "#fff",
                          padding: "8px 12px",
                        }}
                      >
                        {seriesEditorSaving ? "Dang luu danh sach..." : "Luu danh sach tap"}
                      </button>
                    </div>

                    {seriesEditorLoading ? (
                      <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                        Dang tai danh sach tap...
                      </div>
                    ) : seriesEditorItems.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {seriesEditorItems.map((item, index) => (
                          <div
                            key={item._id || index}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "80px 120px 1fr auto",
                              gap: 8,
                              alignItems: "center",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.08)",
                              borderRadius: 10,
                              padding: "10px 12px",
                            }}
                          >
                            <input
                              type="number"
                              min="1"
                              value={item.episode || index + 1}
                              onChange={(e) =>
                                handleSeriesEditorChange(index, "episode", e.target.value)
                              }
                              style={adminInputStyle}
                            />
                            <input
                              type="text"
                              value={item.episodeLabel || ""}
                              placeholder="Nhan tap"
                              onChange={(e) =>
                                handleSeriesEditorChange(index, "episodeLabel", e.target.value)
                              }
                              style={adminInputStyle}
                            />
                            <input
                              type="text"
                              value={item.episodeTitle || ""}
                              placeholder="Ten tap"
                              onChange={(e) =>
                                handleSeriesEditorChange(index, "episodeTitle", e.target.value)
                              }
                              style={adminInputStyle}
                            />
                            <button
                              type="button"
                              onClick={() => navigate(`/movie/${item.slug || item._id}`)}
                              style={{
                                ...adminButtonStyle,
                                padding: "8px 12px",
                                background: "rgba(255,255,255,0.08)",
                                color: "#fff",
                              }}
                            >
                              Mo
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                        Chua co danh sach tap trong seri nay.
                      </div>
                    )}
                  </div>
                )}

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

function MovieGallery({
  images = [],
  title = "",
  isSeries = false,
  isWorld = false,
}) {
  const [lightbox, setLightbox] = useState(null); // index | null
  const stackImages = isWorld ? images.slice(0, 4) : [];
  const open = (i) => setLightbox(i);
  const close = () => setLightbox(null);
  const prev = (e) => { e.stopPropagation(); setLightbox((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setLightbox((i) => (i + 1) % images.length); };

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft") setLightbox((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setLightbox((i) => (i + 1) % images.length);
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, images.length]);

  useEffect(() => {
    if (images.length > 0) {
      console.log("[MovieGallery] images:", images.slice(0, 3));
    }
  }, [images]);

  return (
    <section
      className={`movie-gallery-section${
        isWorld ? " movie-gallery-section--world" : ""
      }`}
    >
      <div className="movie-section-head">
        <h2>{isSeries ? "Ảnh seri" : "Ảnh"} ({images.length})</h2>
      </div>

      {isWorld && stackImages.length > 0 && (
        <button
          type="button"
          className="movie-gallery-stack"
          onClick={() => open(0)}
          aria-label="Mo bo anh the gioi"
        >
          <div className="movie-gallery-stack__cards">
            {stackImages.map((src, index) => (
              <span
                key={`${src}-${index}`}
                className={`movie-gallery-stack__card movie-gallery-stack__card--${index + 1}`}
              >
                <img
                  src={src}
                  alt={`${title} - stack ${index + 1}`}
                  onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                />
              </span>
            ))}
          </div>
        </button>
      )}

      <div className="movie-gallery-grid">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            className="movie-gallery-thumb"
            onClick={() => open(i)}
            aria-label={`Xem ảnh ${i + 1}`}
          >
            <img
              src={src}
              alt={`${title} - ảnh ${i + 1}`}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
            />
            <span className="movie-gallery-thumb__overlay">🔍</span>
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div
          className="movie-lightbox"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
        >
          <button className="movie-lightbox__close" onClick={close} aria-label="Đóng">✕</button>

          <button className="movie-lightbox__nav movie-lightbox__nav--prev" onClick={prev} aria-label="Ảnh trước">‹</button>

          <div className="movie-lightbox__img-wrap" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[lightbox]}
              alt={`${title} - ảnh ${lightbox + 1}`}
              className="movie-lightbox__img"
              onError={(e) => { e.currentTarget.src = "https://dummyimage.com/800x450/111/fff&text=Lỗi+ảnh"; }}
            />
            <span className="movie-lightbox__counter">{lightbox + 1} / {images.length}</span>
          </div>

          <button className="movie-lightbox__nav movie-lightbox__nav--next" onClick={next} aria-label="Ảnh tiếp">›</button>
        </div>
      )}
    </section>
  );
}
