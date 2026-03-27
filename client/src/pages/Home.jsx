import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaChevronRight, FaPlay, FaCheck, FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import Loader from "../components/Loader/Loader";
import { fetchMovies, getTrending } from "../store/Slice/movie-slice";
import {
  getContinueWatching,
  removeContinueWatching,
  formatRemainingTime,
} from "../utils/continueWatching";
import "../assets/styles/Home.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const PREF_KEY = "dam18_preferred_genres";

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
    const loadCW = () => {
      const raw = getContinueWatching() || [];
      const mapped = raw.map((item) => {
        const duration = Number(item.duration || 0);
        const currentTime = Number(item.currentTime || 0);
        const progress =
          duration > 0
            ? Math.max(0, Math.min((currentTime / duration) * 100, 100))
            : 0;

        return {
          ...item,
          progress,
        };
      });

      setContinueWatching(mapped);
    };

    loadCW();

    window.addEventListener("continue-watching-updated", loadCW);
    window.addEventListener("focus", loadCW);

    return () => {
      window.removeEventListener("continue-watching-updated", loadCW);
      window.removeEventListener("focus", loadCW);
    };
  }, [user?._id, user?.email]);

  useEffect(() => {
    const onScroll = () => setIsScrolling(window.scrollY > 20);
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
  const cwMovies = useMemo(() => continueWatching.slice(0, 5), [continueWatching]);

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
        <div className="homeBoard">
          <aside className="homeBoard__left">
            <div className="homePanel homePanel--side">
              <SectionHeadLink title="Xem tiếp" to="/continue-watching" />
              <div className="continueColumn">
                {cwMovies.length > 0 ? (
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
                title="Gợi ý cho bạn"
                onClick={handleRecommendedMore}
              />
              <div className="posterRow">
                {suggestedMovies.length > 0 ? (
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
              <SectionHeadLink title="Mới cập nhật" to="/latest" />
              <div className="posterRow">
                {latestMovies.length > 0 ? (
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
            <div className="homePanel homePanel--side">
              <SectionHeadLink title="Top xem" to="/top-viewed" />
              <div className="topColumn">
                {topMovies.length > 0 ? (
                  topMovies.map((movie, index) => (
                    <TopCard key={movie._id || index} movie={movie} index={index} />
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
            <p>Để mình gợi ý phim đúng gu hơn cho bạn.</p>

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
  if (!movie?._id) return null;

  return (
    <Link to={`/movie/${movie._id}`} className="posterCard">
      <div className="posterCard__imageWrap">
        <img
          src={movie.poster || movie.backdrop || FALLBACK_POSTER}
          alt={movie.title || "movie"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />

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
  const [previewFailed, setPreviewFailed] = useState(false);
  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);

  if (!movie?._id) return null;

  const thumb = movie.backdrop || movie.poster || FALLBACK_POSTER;
  const rawPreviewUrl =
    movie.previewUrl || movie.trailer || movie.trailerUrl || "";

  const isDirectVideoFile =
    typeof rawPreviewUrl === "string" &&
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(rawPreviewUrl.trim());

  const previewUrl = isDirectVideoFile ? rawPreviewUrl.trim() : "";

  const resetPreview = () => {
    setCanPlayPreview(false);

    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);

    if (!previewUrl || previewFailed) return;

    hoverTimerRef.current = setTimeout(async () => {
      try {
        if (!videoRef.current) return;

        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();

        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }

        setCanPlayPreview(true);
      } catch (err) {
        console.log("continue preview autoplay blocked:", err);
        setCanPlayPreview(false);
      }
    }, 450);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    resetPreview();
  };

  return (
    <Link
      to={`/movie/${movie._id}`}
      className={`continueItem continueItem--row ${isHovered ? "is-hovered" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        className="continueItem__remove"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove?.(movie._id);
        }}
        title="Xóa khỏi xem tiếp"
      >
        <FaTimes />
      </button>

      <div className="continueItem__rank">▶</div>

      <div className="continueItem__thumb">
        <img
          className={canPlayPreview ? "is-hidden" : ""}
          src={thumb || FALLBACK_POSTER}
          alt=""
          draggable="false"
          onError={(e) => {
            if (e.currentTarget.src !== FALLBACK_POSTER) {
              e.currentTarget.src = FALLBACK_POSTER;
            }
          }}
        />

        {previewUrl && !previewFailed ? (
          <video
            ref={videoRef}
            className={`continueItem__video ${canPlayPreview ? "is-visible" : ""}`}
            src={previewUrl}
            muted
            playsInline
            loop
            preload="none"
            poster={thumb || FALLBACK_POSTER}
            onWaiting={() => setCanPlayPreview(false)}
            onCanPlay={() => {
              if (isHovered) setCanPlayPreview(true);
            }}
            onPlaying={() => setCanPlayPreview(true)}
            onError={() => {
              setPreviewFailed(true);
              resetPreview();
            }}
          />
        ) : null}

        <div className="continueItem__overlay">
          <span className="continueItem__play">
            <FaPlay />
          </span>
        </div>

        <div className="continueItem__progress">
          <div
            className="continueItem__progressBar"
            style={{ width: `${movie.progress || 0}%` }}
          />
        </div>
      </div>

      <div className="continueItem__meta continueItem__meta--row">
        <h3 title={movie.title}>{movie.title}</h3>
        <p>
          {movie.progress
            ? `${Math.round(movie.progress)}% • ${formatRemainingTime(movie)}`
            : "Đang xem"}
        </p>
      </div>
    </Link>
  );
}

function TopCard({ movie, index }) {
  if (!movie?._id) return null;

  return (
    <Link to={`/movie/${movie._id}`} className="topItem">
      <div className="topItem__rank">#{index + 1}</div>

      <div className="topItem__thumb">
        <img
          src={movie.poster || movie.backdrop || FALLBACK_POSTER}
          alt={movie.title || "movie"}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_POSTER;
          }}
        />
      </div>

      <div className="topItem__meta">
        <h3 title={movie.title}>{movie.title}</h3>
        <p>{movie.views || 0} lượt xem</p>
      </div>
    </Link>
  );
}

function EmptyBox({ text }) {
  return <div className="emptyBox">{text}</div>;
}