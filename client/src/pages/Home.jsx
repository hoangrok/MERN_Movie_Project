import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { setSEO } from "../utils/seo";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChevronRight,
  FaPlay,
  FaCheck,
  FaTimes,
  FaHeart,
  FaRegHeart,
} from "react-icons/fa";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import { fetchMovies, getTrending } from "../store/Slice/movie-slice";
import { updateLikedMovies } from "../store/Slice/auth-slice";
import {
  getContinueWatching,
  removeContinueWatching,
  formatRemainingTime,
  syncContinueWatchingWithServer,
} from "../utils/continueWatching";
import { API_URL } from "../utils/api";
import useDeferredMount from "../hooks/useDeferredMount";
import "../assets/styles/Home.scss";

const AdPopup = lazy(() => import("../components/Ads/AdPopup"));

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/111827/ffffff&text=ClipDam18";
const PREF_KEY = "dam18_preferred_genres";
const HOME_MOVIE_LIMIT = 18;

function scheduleDeferredTask(callback, timeout = 1200) {
  if (typeof window === "undefined") return () => {};

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => {
      if ("cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }

  const timerId = window.setTimeout(callback, timeout);
  return () => {
    window.clearTimeout(timerId);
  };
}

function normalizeImage(url) {
  return typeof url === "string" && url.trim() ? url.trim() : "";
}

function dedupeImages(list = []) {
  const seen = new Set();
  return list.filter((item) => {
    const key = normalizeImage(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTimelineFrames(movie, count = 3) {
  const items = Array.isArray(movie?.previewTimeline?.items)
    ? movie.previewTimeline.items
    : [];
  const targetCount = Math.max(1, Number(count) || 3);

  const urls = dedupeImages(
    items.map((item) => normalizeImage(item?.url)).filter(Boolean)
  );

  if (!urls.length) return [];
  if (urls.length <= targetCount) return urls.slice(0, targetCount);

  const ratios =
    targetCount === 1
      ? [0.5]
      : targetCount === 4
        ? [0.12, 0.38, 0.66, 0.88]
        : Array.from({ length: targetCount }, (_item, index) => {
            const ratio = index / Math.max(1, targetCount - 1);
            return 0.08 + ratio * 0.84;
          });

  return dedupeImages(
    ratios.map((ratio) => {
      const index = Math.min(
        urls.length - 1,
        Math.floor((urls.length - 1) * ratio)
      );
      return urls[index];
    })
  ).slice(0, targetCount);
}

function getBestThumb(movie) {
  return (
    normalizeImage(movie?.backdrop) ||
    getTimelineFrames(movie, 1)[0] ||
    normalizeImage(movie?.poster) ||
    FALLBACK_POSTER
  );
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




export default function Home() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const showDeferredPopup = useDeferredMount({ delay: 1800 });

  const movies = useSelector((state) => state.movie.movies || []);
  const trendingMovies = useSelector((state) => state.movie.trending || []);
  const moviesStatus = useSelector(
    (state) => state.movie.moviesStatus || state.movie.status
  );
  const trendingStatus = useSelector(
    (state) => state.movie.trendingStatus || state.movie.status
  );
  const { user } = useSelector((state) => state.auth);

  const [isScrolling, setIsScrolling] = useState(false);
  const [continueWatching, setContinueWatching] = useState([]);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    setSEO({
      title: "Dam17+1 - Video mới cập nhật hằng ngày",
      description: "Xem video chất lượng cao, cập nhật hằng ngày. Tìm kiếm nhanh, giao diện đẹp, tối ưu cho điện thoại.",
      url: "https://www.clipdam18.com/",
      image: "https://www.clipdam18.com/og-image.jpg",
    });
  }, []);

  useEffect(() => {
    if (moviesStatus === "idle") {
      dispatch(fetchMovies({ type: "all", limit: HOME_MOVIE_LIMIT }));
    }

    if (trendingStatus === "idle") {
      dispatch(getTrending());
    }
  }, [dispatch, moviesStatus, trendingStatus]);

  useEffect(() => {
    let alive = true;
    let cancelScheduledSync = () => {};

    const loadCW = ({ syncWithServer = false } = {}) => {
      const localList = getContinueWatching() || [];
      if (alive) {
        setContinueWatching(localList);
      }

      cancelScheduledSync();

      if (!syncWithServer) return;

      cancelScheduledSync = scheduleDeferredTask(() => {
        syncContinueWatchingWithServer().then((syncedList) => {
          if (alive) {
            setContinueWatching(syncedList || []);
          }
        });
      }, 1400);
    };

    const handleCWUpdated = () => loadCW();
    const handleWindowFocus = () => loadCW({ syncWithServer: true });

    loadCW({ syncWithServer: true });

    window.addEventListener("continue-watching-updated", handleCWUpdated);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      alive = false;
      cancelScheduledSync();
      window.removeEventListener("continue-watching-updated", handleCWUpdated);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [user?._id, user?.email]);

  useEffect(() => {
    const onScroll = () => setIsScrolling(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const allGenres = useMemo(() => {
    const set = new Set();

    movies.forEach((movie) => {
      (movie.genre || []).forEach((g) => {
        const value = String(g || "").trim();
        if (value) set.add(value);
      });
    });

    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 18);
  }, [movies]);

  const preferredGenres = useMemo(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [showGenreModal, user]);

  const watchedGenres = useMemo(() => {
    const counts = new Map();

    continueWatching.forEach((item) => {
      (item.genre || []).forEach((g) => {
        const key = String(g || "").trim();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
  }, [continueWatching]);

  const recommendationGenres = useMemo(() => {
    if (watchedGenres.length > 0) return watchedGenres.slice(0, 3);
    if (preferredGenres.length > 0) return preferredGenres.slice(0, 3);
    return [];
  }, [watchedGenres, preferredGenres]);

  const isNewUser =
    continueWatching.length === 0 && preferredGenres.length === 0;

  useEffect(() => {
    if (movies.length > 0 && isNewUser) {
      setShowGenreModal(true);
    }
  }, [movies.length, isNewUser]);

  const suggestedMovies = useMemo(() => {
    if (recommendationGenres.length === 0) return movies.slice(0, 6);

    const rec = movies.filter((movie) =>
      (movie.genre || []).some((g) => recommendationGenres.includes(g))
    );

    return (rec.length ? rec : movies).slice(0, 6);
  }, [movies, recommendationGenres]);

  const latestMovies = useMemo(() => movies.slice(0, 6), [movies]);
  const topMovies = useMemo(() => trendingMovies.slice(0, 5), [trendingMovies]);
  const cwMovies = useMemo(
    () => continueWatching.slice(0, 6),
    [continueWatching]
  );
  const isMoviesLoading = moviesStatus === "loading" && movies.length === 0;
  const isTrendingLoading =
    trendingStatus === "loading" && trendingMovies.length === 0;

  const togglePreferredGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const savePreferredGenres = () => {
    if (selectedGenres.length === 0) return;
    localStorage.setItem(PREF_KEY, JSON.stringify(selectedGenres));
    setShowGenreModal(false);
  };

  const handleRecommendedMore = () => {
    const genres =
      recommendationGenres.length > 0 ? recommendationGenres : selectedGenres;

    if (genres.length === 0) {
      setShowGenreModal(true);
      return;
    }

    navigate(`/genres?genres=${encodeURIComponent(genres.join(","))}`);
  };

  const handleRemoveCW = (movieId) => {
    removeContinueWatching(movieId);
    setContinueWatching(getContinueWatching());
  };

  return (
    <div className="homePage">
      {showDeferredPopup ? (
        <Suspense fallback={null}>
          <AdPopup />
        </Suspense>
      ) : null}
      <Navbar isScrolled={isScrolling} />

      <main className="homeLayout homeShell">
        <AdSlot placement="home_top" variant="banner" defer />

        <div className="homeBoard">
          <aside className="homeBoard__left">
            <div className="homePanel homePanel--side">
              <SectionHeadLink title="🔥 Xem dở hôm qua" to="/continue-watching" />
              <div className="continueColumn">
                {isMoviesLoading && cwMovies.length === 0 ? (
                  <>
                    <SideSkeleton />
                    <SideSkeleton />
                    <SideSkeleton />
                  </>
                ) : cwMovies.length > 0 ? (
                  cwMovies.map((movie, index) => (
                    <ContinueCard
                      key={movie._id || index}
                      movie={movie}
                      onRemove={handleRemoveCW}
                    />
                  ))
                ) : (
                  <EmptyBox text="Chưa có video xem tiếp" />
                )}
              </div>
            </div>
          </aside>

          <section className="homeBoard__center">
            <div className="homePanel">
              <SectionHeadButton
                title="💋 Hợp gu của mày"
                onClick={handleRecommendedMore}
              />
              <div className="posterRow">
                {isMoviesLoading && suggestedMovies.length === 0 ? (
                  <>
                    <PosterSkeleton />
                    <PosterSkeleton />
                    <PosterSkeleton />
                  </>
                ) : suggestedMovies.length > 0 ? (
                  suggestedMovies.map((movie, index) => (
                    <PosterCard
                      key={movie._id || index}
                      movie={movie}
                      badge={index === 0 ? "Đề xuất" : ""}
                    />
                  ))
                ) : (
                  <EmptyBox text="Chưa có gợi ý" />
                )}
              </div>
            </div>

            <div className="homePanel">
              <SectionHeadLink title="🆕 Clip 18+ Mới Nhất" to="/latest" />
              <div className="posterRow">
                {isMoviesLoading && latestMovies.length === 0 ? (
                  <>
                    <PosterSkeleton />
                    <PosterSkeleton />
                    <PosterSkeleton />
                  </>
                ) : latestMovies.length > 0 ? (
                  latestMovies.map((movie, index) => (
                    <PosterCard key={movie._id || index} movie={movie} />
                  ))
                ) : (
                  <EmptyBox text="Chưa có phim mới" />
                )}
              </div>
            </div>
          </section>

          <aside className="homeBoard__right">
            <AdSlot placement="home_sidebar" variant="side" defer />

            <div className="homePanel homePanel--side">
              <SectionHeadLink title="👑 Top Clip Hot Nhất" to="/top-viewed" />
              <div className="topColumn">
                {isTrendingLoading && topMovies.length === 0 ? (
                  <>
                    <SideSkeleton compact />
                    <SideSkeleton compact />
                    <SideSkeleton compact />
                  </>
                ) : topMovies.length > 0 ? (
                  topMovies.map((movie, index) => (
                    <TopCard
                      key={movie._id || index}
                      movie={movie}
                      index={index}
                    />
                  ))
                ) : (
                  <EmptyBox text="Chưa có top xem" />
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {showGenreModal && (
        <div className="genreModal">
          <div className="genreModal__box">
            <h2>Chọn thể loại bạn thích</h2>
            <p>Để mình gợi ý đúng gu hơn cho bạn.</p>

            <div className="genreModal__grid">
              {allGenres.map((genre) => {
                const active = selectedGenres.includes(genre);

                return (
                  <button
                    key={genre}
                    type="button"
                    className={`genreModal__item ${active ? "active" : ""}`}
                    onClick={() => togglePreferredGenre(genre)}
                  >
                    {active ? <FaCheck /> : null}
                    <span>{genre}</span>
                  </button>
                );
              })}
            </div>

            <div className="genreModal__actions">
              <button
                type="button"
                className="genreModal__skip"
                onClick={() => setShowGenreModal(false)}
              >
                Để sau
              </button>
              <button
                type="button"
                className="genreModal__save"
                onClick={savePreferredGenres}
                disabled={selectedGenres.length === 0}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function SectionHeadLink({ title, to }) {
  return (
    <div className="sectionHead">
      <h2 className="sectionHead__title">{title}</h2>
      <Link to={to} className="sectionHead__more">
        Xem thêm <FaChevronRight />
      </Link>
    </div>
  );
}

function SectionHeadButton({ title, onClick }) {
  return (
    <div className="sectionHead">
      <h2 className="sectionHead__title">{title}</h2>
      <button type="button" className="sectionHead__more" onClick={onClick}>
        Xem thêm <FaChevronRight />
      </button>
    </div>
  );
}

function PosterCard({ movie, badge = "" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [isHovered, setIsHovered] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewTimerRef = useRef(null);
  const showPreviewMedia = isHovered || previewReady || canPlayPreview;
  const previewFrames = useMemo(
    () => (showPreviewMedia ? getTimelineFrames(movie, 10) : []),
    [movie, showPreviewMedia]
  );

  const isSaved = (user?.likedMovies || []).some(
    (item) => String(item?.id || item?._id) === String(movie._id)
  );

  const frames = getTimelineFrames(movie, 2);
  const poster = normalizeImage(movie?.poster);
  const primary =
    normalizeImage(movie?.backdrop) || frames[0] || poster || FALLBACK_POSTER;
  const secondary = frames[1] || poster || primary;
  const previewUrl = getDirectPreviewUrl(movie);

  const cardImages = [primary, secondary, primary]
    .filter(Boolean)
    .slice(0, 3);

  while (cardImages.length < 3) {
    cardImages.push(cardImages[cardImages.length - 1] || FALLBACK_POSTER);
  }

  const stripImages = showPreviewMedia ? cardImages : [primary];

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    clearPreviewTimer();
    previewTimerRef.current = setTimeout(() => {
      setPreviewReady(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    clearPreviewTimer();
    setIsHovered(false);
    setPreviewReady(false);
    setCanPlayPreview(false);
  };

  useEffect(() => {
    return () => clearPreviewTimer();
  }, []);

  const handleToggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user?.token) {
      navigate("/login");
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      if (isSaved) {
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
      } else {
        const { data } = await axios.post(
          `${API_URL}/users/add`,
          { movie: { ...movie, id: movie._id } },
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        dispatch(updateLikedMovies(data.movies || []));
      }
    } catch (err) {
      console.error("toggle save from home error:", err.response?.data || err.message);

      if (err.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!movie?._id) return null;

  return (
    <Link
      to={`/movie/${movie._id}`}
      className={`posterCard posterCard--cinematic ${
        isHovered ? "is-hovered" : ""
      } ${previewReady ? "is-preview-ready" : ""} ${
        canPlayPreview ? "has-preview" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="posterCard__imageWrap posterCard__imageWrap--cinematic">
        <button
          type="button"
          className={`posterCard__save ${isSaved ? "is-saved" : ""} ${
            saving ? "is-saving" : ""
          }`}
          onClick={handleToggleSave}
          disabled={saving}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Bỏ khỏi bộ sưu tập" : "Lưu vào bộ sưu tập"}
          title={isSaved ? "Bỏ khỏi bộ sưu tập" : "Lưu vào bộ sưu tập"}
        >
          <span className="posterCard__saveIcon">
            {isSaved ? <FaHeart /> : <FaRegHeart />}
          </span>
        </button>

        <div className={`posterCard__strip ${canPlayPreview ? "is-hidden" : ""}`}>
          {stripImages.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`posterCard__pane posterCard__pane--${index + 1}`}
            >
              <img
                src={src || FALLBACK_POSTER}
                alt={movie.title || "movie"}
                loading={badge ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={badge ? "high" : "auto"}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_POSTER;
                }}
              />
            </div>
          ))}
        </div>

        {showPreviewMedia ? (
          <HoverPreviewVideo
            active={previewReady}
            movieId={movie._id}
            directUrl={previewUrl}
            frames={previewFrames}
            className="posterCard__video"
            poster={primary}
            delay={80}
            frameIntervalMs={360}
            onVisibleChange={setCanPlayPreview}
          />
        ) : null}

        <div className="posterCard__cinematicShade" />

        {badge ? <span className="posterCard__badge">{badge}</span> : null}

        <div className="posterCard__hover">
          <span className="posterCard__play">
            <FaPlay />
          </span>
        </div>
      </div>

      <div className="posterCard__info">
        <h3 title={movie.title}>{movie.title || "Untitled"}</h3>
        <p>
          {(movie.genre || []).slice(0, 2).join(" • ") ||
            `${movie.views || 0} lượt xem`}
        </p>
      </div>
    </Link>
  );
}

function ContinueCard({ movie, onRemove }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const previewFrames = useMemo(
    () => (isHovered || canPlayPreview ? getTimelineFrames(movie, 8) : []),
    [movie, isHovered, canPlayPreview]
  );

  if (!movie?._id) return null;

  const thumb = getBestThumb(movie);
  const previewUrl = getDirectPreviewUrl(movie);
  const previewStartAt =
    Number(movie.currentTime || 0) > 8 ? Number(movie.currentTime) : 18;
  const progressValue = Number(movie.progressPercent || movie.progress || 0);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCanPlayPreview(false);
  };

  return (
    <Link
      to={`/movie/${movie._id}`}
      className="continueItem continueItem--row"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="continueItem__rank">▶</span>

      <div className="continueItem__thumb">
        <img
          className={canPlayPreview ? "is-hidden" : ""}
          src={thumb}
          alt={movie.title || "movie"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        {isHovered || canPlayPreview ? (
          <HoverPreviewVideo
            active={isHovered}
            movieId={movie._id}
            directUrl={previewUrl}
            frames={previewFrames}
            className="continueItem__video"
            poster={thumb}
            startAt={previewStartAt}
            frameIntervalMs={380}
            onVisibleChange={setCanPlayPreview}
          />
        ) : null}

        <div className="continueItem__overlay">
          <div className="continueItem__play">
            <FaPlay />
          </div>
        </div>

        <div className="continueItem__progress">
          <div
            className="continueItem__progressBar"
            style={{ width: `${Math.max(0, Math.min(progressValue, 100))}%` }}
          />
        </div>
      </div>

      <div className="continueItem__meta">
        <h3 title={movie.title}>{movie.title || "Untitled"}</h3>
        <p>{formatRemainingTime(movie)}</p>
      </div>

      <button
        type="button"
        className="continueItem__remove"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove?.(movie._id);
        }}
      >
        <FaTimes />
      </button>
    </Link>
  );
}


function formatViews(views) {
  if (!views) return "0 lượt xem";
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M lượt xem`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K lượt xem`;
  return `${views} lượt xem`;
}

function TopCard({ movie, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const previewFrames = useMemo(
    () => (isHovered || canPlayPreview ? getTimelineFrames(movie, 8) : []),
    [movie, isHovered, canPlayPreview]
  );

  if (!movie?._id) return null;

  const thumb = getBestThumb(movie);
  const previewUrl = getDirectPreviewUrl(movie);

  return (
    <Link
      to={`/movie/${movie._id}`}
      className="topItem"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCanPlayPreview(false);
      }}
    >
      <span className="topItem__rank">#{index + 1}</span>

      <div className="topItem__thumb">
        <img
          className={canPlayPreview ? "is-hidden" : ""}
          src={thumb}
          alt={movie.title || "movie"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

        {isHovered || canPlayPreview ? (
          <HoverPreviewVideo
            active={isHovered}
            movieId={movie._id}
            directUrl={previewUrl}
            frames={previewFrames}
            className="topItem__video"
            poster={thumb}
            frameIntervalMs={380}
            onVisibleChange={setCanPlayPreview}
          />
        ) : null}
      </div>

      <div className="topItem__meta">
        <h3 title={movie.title}>{movie.title || "Untitled"}</h3>
        <p>{formatViews(movie.views || 0)}</p>
      </div>
    </Link>
  );
}

function EmptyBox({ text }) {
  return <div className="emptyBox">{text}</div>;
}

function PosterSkeleton() {
  return (
    <div className="posterCard posterCard--skeleton">
      <div className="posterCard__imageWrap skeleton shimmer" />
      <div className="posterCard__info">
        <div className="skeleton skeleton-title shimmer" />
        <div className="skeleton skeleton-text shimmer" />
      </div>
    </div>
  );
}

function SideSkeleton({ compact = false }) {
  return (
    <div className={`sideSkeleton ${compact ? "is-compact" : ""}`}>
      <div className="sideSkeleton__rank skeleton shimmer" />
      <div className="sideSkeleton__thumb skeleton shimmer" />
      <div className="sideSkeleton__content">
        <div className="skeleton skeleton-title shimmer" />
        <div className="skeleton skeleton-text shimmer" />
      </div>
    </div>
  );
}
