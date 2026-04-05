"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export default function AdultCard({ movie, priority = false }) {
  const [hovered, setHovered] = useState(false);

  const previewImage = useMemo(() => {
    if (!movie?.previewItems?.length) return movie?.displayImage || "";
    return movie.previewItems[0]?.url || movie?.displayImage || "";
  }, [movie]);

  const imageSrc = hovered ? previewImage : movie?.displayImage || previewImage;

  return (
    <Link
      href={`/adult/${movie.slug}`}
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

        <div className="adultCard__gradient" />

        <div className="adultCard__top">
          <span className="adultCard__badge">
            {movie?.newPopular ? "Trending" : "18+"}
          </span>
          <span className="adultCard__time">
            {movie?.displayDuration || "HD"}
          </span>
        </div>

        <div className="adultCard__bottom">
          <h3 className="line-clamp-2">{movie?.title || "Untitled"}</h3>
          <p>{movie?.displayViews || "Mới cập nhật"}</p>

          <div className="adultCard__actions">
            <span className="adultCard__play">▶ Xem ngay</span>
            {movie?.previewItems?.length ? (
              <span className="adultCard__preview">
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
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
          transform: translateZ(0);
          transition:
            transform 0.28s ease,
            box-shadow 0.28s ease,
            border-color 0.28s ease;
        }

        .adultCard:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.42);
          border-color: rgba(255, 255, 255, 0.16);
          z-index: 3;
        }

        .adultCard__media {
          position: relative;
          width: 100%;
          height: 220px;
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
            transform 0.4s ease,
            filter 0.35s ease,
            opacity 0.3s ease;
        }

        .adultCard:hover .adultCard__media img {
          transform: scale(1.08);
          filter: saturate(1.08);
        }

        .adultCard__gradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(3, 6, 12, 0.98) 0%,
              rgba(3, 6, 12, 0.56) 42%,
              rgba(3, 6, 12, 0.1) 100%
            );
        }

        .adultCard__top {
          position: absolute;
          top: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          z-index: 2;
        }

        .adultCard__badge,
        .adultCard__time,
        .adultCard__preview {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .adultCard__badge {
          background: rgba(255, 92, 92, 0.16);
          border: 1px solid rgba(255, 92, 92, 0.24);
          color: #ff9d9d;
        }

        .adultCard__time,
        .adultCard__preview {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
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
          font-size: 1.05rem;
          line-height: 1.3;
          letter-spacing: -0.025em;
          font-weight: 700;
          color: #fff;
        }

        .adultCard__bottom p {
          margin: 8px 0 0;
          font-size: 0.92rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.72);
        }

        .adultCard__actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 12px;
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

        .adultCard__play {
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
        }

        @media (max-width: 768px) {
          .adultCard__media {
            height: 190px;
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