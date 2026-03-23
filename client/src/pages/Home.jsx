import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaPlay } from "react-icons/fa";
import { AiOutlineInfoCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import Navbar from "../components/Navbar/Navbar";
import Slider from "../components/Slider/Slider";
import Loader from "../components/Loader/Loader";
import TrailerModal from "../components/TrailerModal/TrailerModal";
import { fetchMovies, getTrending } from "../store/Slice/movie-slice";
import { getContinueWatching } from "../utils/continueWatching";
import "../assets/styles/Home.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";
const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/111";

export default function Home() {
  const dispatch = useDispatch();

  const movies = useSelector((state) => state.movie.movies);
  const trendingMovies = useSelector((state) => state.movie.trending);
  const status = useSelector((state) => state.movie.status);

  const [isScrolling, setIsScrolling] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [isTrailerActive, setTrailerActive] = useState(false);
  const [continueWatching, setContinueWatching] = useState([]);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchMovies({ type: "all" }));
      dispatch(getTrending());
    }
  }, [dispatch, status]);

  useEffect(() => {
    setContinueWatching(getContinueWatching());
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      setContinueWatching(getContinueWatching());
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (movies?.length > 0) {
      const idx = Math.floor(Math.random() * Math.min(movies.length, 20));
      setHeroIndex(idx);
    }
  }, [movies]);

  useEffect(() => {
    const onScroll = () => setIsScrolling(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hero = useMemo(() => movies?.[heroIndex], [movies, heroIndex]);

  const handleModal = () => setTrailerActive((prev) => !prev);

  return (
    <div className="homePage">
      {status === "loading" && <Loader />}
      <Navbar isScrolled={isScrolling} />

      {hero && (
        <section className="hero">
          <div
            className="hero__bg"
            style={{
              backgroundImage: `url(${
                hero.backdrop || hero.poster || FALLBACK_BACKDROP
              })`,
            }}
          />
          <div className="hero__overlay" />

          <div className="hero__content container">
            <div className="hero__badge">Đề Xuất</div>

            <h1 className="hero__title netflix-title">{hero.title}</h1>

            <div className="hero__meta">
              {hero.year ? <span>{hero.year}</span> : null}
              {hero.rating ? <span>⭐ {hero.rating}</span> : null}
              {hero.duration ? <span>{hero.duration} phút</span> : null}
              {hero.views ? <span>{hero.views} lượt xem</span> : null}
            </div>

            <p className="hero__desc">
              {hero.description || "Chưa có mô tả"}
            </p>

            <div className="hero__actions">
              <Link to={`/movie/${hero._id}`} className="btn btn-primary">
                <FaPlay /> Xem ngay
              </Link>

              <button className="btn btn-secondary" onClick={handleModal}>
                <AiOutlineInfoCircle /> Thông tin
              </button>
            </div>
          </div>

          {isTrailerActive && (
            <TrailerModal
              movie={hero}
              handleModal={setTrailerActive}
              isLiked={false}
              trailer={null}
            />
          )}
        </section>
      )}

      <main className="container homeSections">
        {continueWatching.length > 0 && (
          <MovieRow
            title="Xem tiếp"
            movies={continueWatching}
            badgeType="continue"
          />
        )}

        <section className="section">
          <h2 className="section-title">Phim đề xuất</h2>
          <Slider movies={movies} />
        </section>

        <MovieRow
          title="Top Trending"
          movies={trendingMovies}
          badgeType="top"
        />

        <MovieRow
          title="Mới cập nhật"
          movies={movies?.slice(0, 12) || []}
          badgeType="new"
        />
      </main>
    </div>
  );
}

function MovieRow({ title, movies, badgeType }) {
  return (
    <section className="section">
      <h2 className="section-title">{title}</h2>

      <div className="grid">
        {movies.map((movie, index) => (
          <Link
            key={movie._id}
            to={`/movie/${movie._id}`}
            className="poster-card poster-card--interactive"
          >
            <div className="poster-card__media">
              <img
                src={movie.poster || FALLBACK_POSTER}
                alt={movie.title}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_POSTER;
                }}
              />

              {badgeType === "new" && index < 4 && (
                <span className="movie-badge movie-badge--new">NEW</span>
              )}

              {badgeType === "top" && index < 3 && (
                <span className="movie-badge movie-badge--top">
                  TOP {index + 1}
                </span>
              )}

              {badgeType === "continue" && (
                <span className="movie-badge movie-badge--continue">
                  CONTINUE
                </span>
              )}

              {badgeType === "continue" && (
                <div className="cw-progress">
                  <div
                    className="cw-progress__bar"
                    style={{ width: `${movie.progressPercent || 0}%` }}
                  />
                </div>
              )}

              <div className="poster-card__hover">
                <button className="poster-card__play" type="button">
                  <FaPlay />
                </button>
              </div>
            </div>

            <div className="poster-card__body">
              <div className="poster-card__title">{movie.title}</div>
              <div className="poster-card__meta">
                {(movie.genre || []).slice(0, 2).join(" • ") ||
                  `${movie.views || 0} lượt xem`}
              </div>

              {badgeType === "continue" && (
                <div className="poster-card__resume-text">
                  Xem tiếp{" "}
                  {movie.progressPercent
                    ? `(${Math.round(movie.progressPercent)}%)`
                    : ""}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}