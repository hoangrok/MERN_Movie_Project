import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaChevronRight,
  FaPlay,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import Loader from "../components/Loader/Loader";
import AdSlot from "../components/Ads/AdSlot";
import HoverPreviewVideo from "../components/HoverPreview/HoverPreviewVideo";
import { fetchMovies, getTrending } from "../store/Slice/movie-slice";
import {
  getContinueWatching,
  removeContinueWatching,
  formatRemainingTime,
  syncContinueWatchingWithServer,
} from "../utils/continueWatching";
import "../assets/styles/Home.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/1280x720/111827/ffffff&text=ClipDam18";
const PREF_KEY = "dam18_preferred_genres";

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

  const urls = dedupeImages(
    items.map((item) => normalizeImage(item?.url)).filter(Boolean)
  );

  if (!urls.length) return [];
  if (urls.length <= count) return urls.slice(0, count);

  const ratios = count === 4 ? [0.12, 0.38, 0.66, 0.88] : [0.15, 0.48, 0.8];

  return dedupeImages(
    ratios.map((ratio) => {
      const index = Math.min(
        urls.length - 1,
        Math.floor((urls.length - 1) * ratio)
      );
      return urls[index];
    })
  ).slice(0, count);
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

  const movies = useSelector((state) => state.movie.movies || []);
  const trendingMovies = useSelector((state) => state.movie.trending || []);
  const status = useSelector((state) => state.movie.status);
  const { user } = useSelector((state) => state.auth);

  const [isScrolling, setIsScrolling] = useState(false);
  const [continueWatching, setContinueWatching] = useState([]);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchMovies({ type: "all" }));
      dispatch(getTrending());
    }
  }, [dispatch, status]);

  useEffect(() => {
    let alive = true;

    const loadCW = () => {
      const localList = getContinueWatching() || [];
      if (alive) {
        setContinueWatching(localList);
      }

      syncContinueWatchingWithServer().then((syncedList) => {
        if (alive) {
          setContinueWatching(syncedList || []);
        }
      });
    };

    loadCW();

    window.addEventListener("continue-watching-updated", loadCW);
    window.addEventListener("focus", loadCW);

    return () => {
      alive = false;
      window.removeEventListener("continue-watching-updated", loadCW);
      window.removeEventListener("focus", loadCW);
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
      {status === "loading" && <Loader />}
      <Navbar isScrolled={isScrolling} />

      <main className="homeLayout homeShell">
        <AdSlot placement="home_top" variant="banner" />

        <div className="homeBoard">
          <aside className="homeBoard__left">
            <div className="homePanel homePanel--side">
              <SectionHeadLink title="🔥 Xem dở hôm qua" to="/continue-watching" />
              <div className="continueColumn">
                {status === "loading" && cwMovies.length === 0 ? (
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
                title="💋 Hợp gu của bạn"
                onClick={handleRecommendedMore}
              />
              <div className="posterRow">
                {status === "loading" && suggestedMovies.length === 0 ? (
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
                {status === "loading" && latestMovies.length === 0 ? (
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
            <AdSlot placement="home_sidebar" variant="side" />

            <div className="homePanel homePanel--side">
              <SectionHeadLink title="👑 Top Clip Hot Nhất" to="/top-viewed" />
              <div className="topColumn">
                {status === "loading" && topMovies.length === 0 ? (
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
  const [isHovered, setIsHovered] = useState(false);
  const [canPlayPreview, setCanPlayPreview] = useState(false);
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

  if (!movie?._id) return null;

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

  return (
    <Link
      to={`/movie/${movie._id}`}
      className={`posterCard posterCard--cinematic ${
        isHovered ? "is-hovered" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCanPlayPreview(false);
      }}
    >
      <div className="posterCard__imageWrap posterCard__imageWrap--cinematic">
        <div className={`posterCard__strip ${canPlayPreview ? "is-hidden" : ""}`}>
          {cardImages.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={`posterCard__pane posterCard__pane--${index + 1}`}
            >
              <img
                src={src || FALLBACK_POSTER}
                alt={movie.title || "movie"}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_POSTER;
                }}
              />
            </div>
          ))}
        </div>

        <HoverPreviewVideo
          active={isHovered}
          movieId={movie._id}
          directUrl={previewUrl}
          frames={previewFrames}
          className="posterCard__video"
          poster={primary}
          onVisibleChange={setCanPlayPreview}
        />

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
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

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

        <HoverPreviewVideo
          active={isHovered}
          movieId={movie._id}
          directUrl={previewUrl}
          frames={previewFrames}
          className="continueItem__video"
          poster={thumb}
          startAt={previewStartAt}
          onVisibleChange={setCanPlayPreview}
        />

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
  const previewFrames = useMemo(() => getTimelineFrames(movie, 4), [movie]);

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

        <HoverPreviewVideo
          active={isHovered}
          movieId={movie._id}
          directUrl={previewUrl}
          frames={previewFrames}
          className="topItem__video"
          poster={thumb}
          onVisibleChange={setCanPlayPreview}
        />
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
