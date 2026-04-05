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
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
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
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            color: "#fff",
            borderRadius: 12,
            minHeight: 40,
            padding: "0 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Xoá tất cả
        </button>
      </div>

      <div className="cwRow">
        {items.map((item) => (
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
                  <span className="cwTime">
                    {typeof item.progress === "number" ? `${item.progress}%` : "0%"}
                  </span>
                </div>

                <div className="cwBottom">
                  <h3 className="line-clamp-2">{item.title || "Untitled"}</h3>
                  <p>
                    Đã xem {typeof item.progress === "number" ? item.progress : 0}%
                  </p>
                </div>

                <div className="cwProgress">
                  <div
                    className="cwProgressBar"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, Number(item.progress || 0))
                      )}%`,
                    }}
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
        ))}
      </div>

      <style jsx>{`
        .cwRow {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 18px;
        }

        .cwCard {
          position: relative;
        }

        .cwLink {
          display: block;
          text-decoration: none;
          color: inherit;
          border-radius: 22px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
          transition:
            transform 0.28s ease,
            box-shadow 0.28s ease,
            border-color 0.28s ease;
        }

        .cwLink:hover {
          transform: translateY(-6px);
          box-shadow: 0 28px 70px rgba(0, 0, 0, 0.4);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .cwMedia {
          position: relative;
          height: 220px;
          overflow: hidden;
          background: #0d1118;
        }

        .cwMedia img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: scale(1.02);
          transition: transform 0.35s ease;
        }

        .cwLink:hover .cwMedia img {
          transform: scale(1.06);
        }

        .cwGradient {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(3, 6, 12, 0.98) 0%,
              rgba(3, 6, 12, 0.5) 45%,
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
          color: #ff9d9d;
        }

        .cwTime {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
        }

        .cwBottom {
          position: absolute;
          left: 16px;
          right: 16px;
          bottom: 22px;
          z-index: 2;
        }

        .cwBottom h3 {
          margin: 0;
          font-size: 1rem;
          line-height: 1.3;
          font-weight: 700;
          color: #fff;
        }

        .cwBottom p {
          margin: 8px 0 0;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.72);
        }

        .cwProgress {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 5px;
          background: rgba(255, 255, 255, 0.12);
          z-index: 3;
        }

        .cwProgressBar {
          height: 100%;
          background: #fff;
          transition: width 0.25s ease;
        }

        .cwRemove {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 4;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.55);
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          line-height: 1;
        }

        @media (max-width: 768px) {
          .cwMedia {
            height: 200px;
          }
        }
      `}</style>
    </section>
  );
}