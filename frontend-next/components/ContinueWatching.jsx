"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getContinue, removeContinue, clearContinue } from "@/lib/continue";

export default function ContinueWatching() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const load = () => {
      setItems(getContinue());
    };

    load();
    window.addEventListener("continue-updated", load);

    return () => {
      window.removeEventListener("continue-updated", load);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section style={{ marginTop: 36 }}>
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 className="section-title">Tiếp tục xem</h2>
          <p className="section-desc" style={{ marginTop: 8 }}>
            Quay lại những nội dung bạn đang xem dở.
          </p>
        </div>

        <button
          type="button"
          onClick={clearContinue}
          className="cwClear"
        >
          Xoá tất cả
        </button>
      </div>

      <div className="cwRow">
        {items.map((item) => {
          const progress = Math.max(
            0,
            Math.min(100, Number(item.progress || item.progressPercent || 0))
          );

          return (
            <div key={item._id} className="cwCard">
              <Link href={`/adult/${item.slug}`} className="cwLink">
                <div className="cwMedia">
                  <img
                    src={item.backdrop || item.poster || ""}
                    alt={item.title || "movie"}
                  />
                  <div className="cwGradient" />

                  <div className="cwTop">
                    <span className="cwBadge">Tiếp tục</span>
                    <span className="cwTime">{progress}%</span>
                  </div>

                  <div className="cwPlay">
                    <span className="cwPlayCircle">
                      <span className="cwPlayTriangle">▶</span>
                    </span>
                  </div>

                  <div className="cwBottom">
                    <h3 className="line-clamp-2">{item.title || "Untitled"}</h3>
                    <p>Đã xem {progress}%</p>
                  </div>

                  <div className="cwProgress">
                    <div
                      className="cwProgressTrack"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </Link>

              <button
                type="button"
                className="cwRemove"
                onClick={() => removeContinue(item._id)}
                aria-label={`Xoá ${item.title}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .cwClear {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-radius: 14px;
          min-height: 44px;
          padding: 0 16px;
          font-weight: 800;
          cursor: pointer;
          transition:
            transform 0.22s ease,
            background 0.22s ease,
            border-color 0.22s ease;
        }

        .cwClear:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .cwRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .cwCard {
          position: relative;
        }

        .cwLink {
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.26);
          transition:
            transform 0.3s ease,
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }

        .cwLink:hover {
          transform: translateY(-8px);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .cwMedia {
          position: relative;
          aspect-ratio: 16 / 10;
          overflow: hidden;
          background: #0d1118;
        }

        .cwMedia img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.02);
          transition:
            transform 0.4s ease,
            filter 0.35s ease;
        }

        .cwLink:hover .cwMedia img {
          transform: scale(1.08);
          filter: saturate(1.08);
        }

        .cwGradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(3, 6, 12, 0.98) 0%,
              rgba(3, 6, 12, 0.58) 42%,
              rgba(3, 6, 12, 0.08) 100%
            );
        }

        .cwTop {
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

        .cwBadge,
        .cwTime {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          backdrop-filter: blur(10px);
        }

        .cwBadge {
          background: rgba(255, 92, 92, 0.16);
          border: 1px solid rgba(255, 92, 92, 0.24);
          color: #ffb1b1;
        }

        .cwTime {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .cwPlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          pointer-events: none;
        }

        .cwPlayCircle {
          width: 70px;
          height: 70px;
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
          transform: translateY(8px) scale(0.94);
          transition:
            opacity 0.28s ease,
            transform 0.28s ease;
        }

        .cwLink:hover .cwPlayCircle {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .cwPlayTriangle {
          color: #fff;
          font-size: 1rem;
          transform: translateX(2px);
        }

        .cwBottom {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 24px;
          z-index: 2;
        }

        .cwBottom h3 {
          margin: 0;
          font-size: 1.05rem;
          line-height: 1.28;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .cwBottom p {
          margin: 8px 0 0;
          font-size: 0.92rem;
          color: rgba(255, 255, 255, 0.74);
        }

        .cwProgress {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 10px;
          height: 6px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          overflow: hidden;
          z-index: 3;
        }

        .cwProgressTrack {
          height: 100%;
          background: linear-gradient(90deg, #ffffff 0%, #cfd7ff 100%);
          border-radius: 999px;
          transition: width 0.25s ease;
        }

        .cwRemove {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 4;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.52);
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
          backdrop-filter: blur(8px);
        }

        .cwRemove:hover {
          background: rgba(0, 0, 0, 0.68);
        }

        @media (max-width: 1100px) {
          .cwRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .cwRow {
            grid-template-columns: 1fr;
          }

          .cwMedia {
            aspect-ratio: 16 / 11;
          }

          .cwPlayCircle {
            opacity: 1;
            transform: none;
            width: 62px;
            height: 62px;
          }
        }
      `}</style>
    </section>
  );
}