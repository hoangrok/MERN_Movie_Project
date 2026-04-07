"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { addToLiked, removeFromLiked } from "@/lib/user-api";
import { getAuthUser } from "@/lib/auth";

export default function AdultCard({ movie, priority = false }) {
  const [hovered, setHovered] = useState(false);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  const movieId = movie?._id || movie?.id || "";
  const movieSlug = movie?.slug || "";

  useEffect(() => {
    const syncLiked = () => {
      const user = getAuthUser();
      const likedMovies = user?.likedMovies || [];
      setLiked(
        likedMovies.some(
          (item) => String(item?._id || item?.id) === String(movieId)
        )
      );
    };

    syncLiked();
    window.addEventListener("liked-updated", syncLiked);
    window.addEventListener("auth-updated", syncLiked);

    return () => {
      window.removeEventListener("liked-updated", syncLiked);
      window.removeEventListener("auth-updated", syncLiked);
    };
  }, [movieId]);

  const previewImage = useMemo(() => {
    if (!movie?.previewItems?.length) {
      return movie?.displayBackdrop || movie?.displayImage || movie?.poster || "";
    }
    return (
      movie.previewItems[0]?.url ||
      movie?.displayBackdrop ||
      movie?.displayImage ||
      movie?.poster ||
      ""
    );
  }, [movie]);

  const imageSrc =
    hovered
      ? previewImage
      : movie?.displayBackdrop ||
        movie?.displayImage ||
        movie?.poster ||
        previewImage;

  const onToggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!movieId) return;

    const user = getAuthUser();
    if (!user?.token) {
      window.location.href = "/login";
      return;
    }

    try {
      setBusy(true);

      if (liked) {
        await removeFromLiked(movieId);
      } else {
        await addToLiked(movieId);
      }
    } catch (err) {
      alert(err?.message || "Không thể cập nhật Danh sách của tôi");
    } finally {
      setBusy(false);
    }
  };

  if (!movieSlug) return null;

  return (
    <Link
      href={`/adult/${movieSlug}`}
      className="adultCard"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={movie?.title || "movie"}
      prefetch={priority}
    >
      <div className="adultCard__media">
        <img
          src={imageSrc}
          alt={movie?.title || "movie"}
          loading={priority ? "eager" : "lazy"}
        />

        <div className="adultCard__overlay" />

        <div className="adultCard__top">
          <span className="adultCard__badge">
            {movie?.newPopular ? "Nổi bật" : "18+"}
          </span>

          <div className="adultCard__topRight">
            <span className="adultCard__time">
              {movie?.displayDuration || "HD"}
            </span>

            <button
              type="button"
              className={`adultCard__like ${liked ? "isLiked" : ""}`}
              onClick={onToggleLike}
              disabled={busy || !movieId}
              aria-label="Yêu thích"
            >
              ♥
            </button>
          </div>
        </div>

        <div className="adultCard__centerPlay">
          <span className="adultCard__playCircle">
            <span className="adultCard__playTriangle">▶</span>
          </span>
        </div>

        <div className="adultCard__bottom">
          <h3 className="line-clamp-2">{movie?.title || "Video không có tiêu đề"}</h3>

          <p className="line-clamp-1">
            {movie?.displayViews || "Mới cập nhật"}
          </p>

          <div className="adultCard__actions">
            <span className="adultCard__watchNow">Xem ngay</span>

            {movie?.previewItems?.length ? (
              <span className="adultCard__previewTag">
                {movie.previewItems.length} preview
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <style jsx>{`
        .adultCard {
          display: block;
          position: relative;
          text-decoration: none;
          color: inherit;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.025)
          );
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
          transform: translateZ(0);
          transition:
            transform 0.3s ease,
            box-shadow 0.3s ease,
            border-color 0.3s ease;
          isolation: isolate;
        }

        .adultCard:hover {
          transform: translateY(-8px);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.38);
          border-color: rgba(255, 255, 255, 0.14);
          z-index: 3;
        }

        .adultCard__media {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: #0d1118;
        }

        .adultCard__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.02);
          transition:
            transform 0.45s ease,
            filter 0.35s ease;
        }

        .adultCard:hover .adultCard__media img {
          transform: scale(1.08);
          filter: saturate(1.08) contrast(1.02);
        }

        .adultCard__overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(4, 7, 14, 0.98) 0%,
              rgba(4, 7, 14, 0.72) 34%,
              rgba(4, 7, 14, 0.18) 62%,
              rgba(4, 7, 14, 0.04) 100%
            ),
            linear-gradient(
              to right,
              rgba(0, 0, 0, 0.18) 0%,
              rgba(0, 0, 0, 0) 40%
            );
        }

        .adultCard__top {
          position: absolute;
          top: 14px;
          left: 14px;
          right: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          z-index: 2;
        }

        .adultCard__topRight {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .adultCard__badge,
        .adultCard__time,
        .adultCard__previewTag {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
          white-space: nowrap;
        }

        .adultCard__badge {
          background: rgba(255, 92, 92, 0.16);
          border: 1px solid rgba(255, 92, 92, 0.24);
          color: #ffb1b1;
        }

        .adultCard__time,
        .adultCard__previewTag {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .adultCard__like {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.12);
          color: #fff;
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 900;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .adultCard__like:hover {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.18);
        }

        .adultCard__like:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .adultCard__like.isLiked {
          color: #ff8c8c;
          border-color: rgba(255, 140, 140, 0.28);
          background: rgba(255, 140, 140, 0.12);
        }

        .adultCard__centerPlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          pointer-events: none;
        }

        .adultCard__playCircle {
          width: 72px;
          height: 72px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
          backdrop-filter: blur(12px);
          box-shadow:
            0 14px 34px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
          opacity: 0;
          transform: translateY(10px) scale(0.94);
          transition:
            opacity 0.28s ease,
            transform 0.28s ease;
        }

        .adultCard:hover .adultCard__playCircle {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .adultCard__playTriangle {
          color: #fff;
          font-size: 1.05rem;
          transform: translateX(2px);
        }

        .adultCard__bottom {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          z-index: 2;
        }

        .adultCard__bottom h3 {
          margin: 0;
          font-family: var(--font-manrope), var(--font-inter), Arial, sans-serif;
          font-size: 1.08rem;
          line-height: 1.28;
          letter-spacing: -0.025em;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .adultCard__bottom p {
          margin: 8px 0 0;
          font-size: 0.92rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.74);
        }

        .adultCard__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 14px;
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity 0.25s ease,
            transform 0.25s ease;
        }

        .adultCard:hover .adultCard__actions {
          opacity: 1;
          transform: translateY(0);
        }

        .adultCard__watchNow {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 12px;
          background: #fff;
          color: #05070d;
          font-size: 0.9rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          box-shadow: 0 10px 24px rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .adultCard__media {
            aspect-ratio: 16 / 11;
          }

          .adultCard__playCircle {
            width: 62px;
            height: 62px;
            opacity: 1;
            transform: none;
          }

          .adultCard__actions {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </Link>
  );
}