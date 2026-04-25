import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import {
  getContinueWatching,
  removeContinueWatching,
  clearContinueWatching,
  formatRemainingTime,
  syncContinueWatchingWithServer,
} from "../utils/continueWatching";
import "../assets/styles/ContinueWatching.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/400x600/222/ffffff&text=Poster";

export default function ContinueWatching() {
  const [items, setItems] = useState([]);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let alive = true;

    const onScroll = () => setIsScrolled(window.scrollY > 20);
    const reload = () => {
      const localList = getContinueWatching() || [];
      if (alive) {
        setItems(localList);
      }

      syncContinueWatchingWithServer().then((syncedList) => {
        if (alive) {
          setItems(syncedList || []);
        }
      });
    };

    reload();

    window.addEventListener("scroll", onScroll);
    window.addEventListener("continue-watching-updated", reload);
    window.addEventListener("focus", reload);

    return () => {
      alive = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("continue-watching-updated", reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  const handleRemove = (movieId) => {
    removeContinueWatching(movieId);
    setItems(getContinueWatching() || []);
  };

  const handleClearAll = () => {
    clearContinueWatching();
    setItems([]);
  };

  return (
    <div className="continueWatchingPage">
      <Navbar isScrolled={isScrolled} />

      <main className="continueWatchingPage__container">
        <div className="continueWatchingPage__head">
          <div>
            <h1>Xem tiếp</h1>
            <p>Danh sách video bạn đang xem dở</p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              className="continueWatchingPage__clear"
              onClick={handleClearAll}
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="continueWatchingPage__empty">
            <h3>Chưa có video nào trong mục xem tiếp</h3>
            <p>Hãy mở một phim và xem dở, mục này sẽ tự cập nhật.</p>
            <Link to="/" className="continueWatchingPage__back">
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div className="continueWatchingGrid">
            {items.map((movie) => {
              const thumb = movie.backdrop || movie.poster || FALLBACK_POSTER;
              const progress = Math.max(
                0,
                Math.min(Number(movie.progress || 0), 100)
              );

              return (
                <div className="cwCard" key={movie._id}>
                  <Link to={`/movie/${movie._id}`} className="cwCard__thumb">
                    <img
                      src={thumb}
                      alt={movie.title || "movie"}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_POSTER;
                      }}
                    />

                    <div className="cwCard__overlay">
                      <span>▶ Xem tiếp</span>
                    </div>

                    <div className="cwCard__progress">
                      <div
                        className="cwCard__progressBar"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </Link>

                  <div className="cwCard__body">
                    <Link
                      to={`/movie/${movie._id}`}
                      className="cwCard__title"
                      title={movie.title}
                    >
                      {movie.title || "Untitled"}
                    </Link>

                    <p className="cwCard__meta">
                      {progress > 0
                        ? `${Math.round(progress)}% • ${formatRemainingTime(movie)}`
                        : "Đang xem"}
                    </p>

                    <div className="cwCard__actions">
                      <Link
                        to={`/movie/${movie._id}`}
                        className="cwCard__btn cwCard__btn--primary"
                      >
                        Phát tiếp
                      </Link>

                      <button
                        type="button"
                        className="cwCard__btn"
                        onClick={() => handleRemove(movie._id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
