"use client";

import { useEffect, useRef, useState } from "react";
import AdultCard from "@/components/AdultCard";

export default function RelatedSlider({ items = [] }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = rowRef.current;
    if (!el) return;

    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  const scrollByAmount = (direction) => {
    const el = rowRef.current;
    if (!el) return;

    const amount = Math.min(1100, Math.max(320, el.clientWidth * 0.88));

    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    updateArrows();
    const el = rowRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="relatedWrap">
      <div className="relatedHead">
        <div className="relatedHead__meta">
          <div className="relatedHead__eyebrow">RELATED</div>
          <p className="relatedHead__desc">
            Cuộn ngang để xem thêm nội dung liên quan theo tag và thể loại.
          </p>
        </div>

        <div className="relatedControls">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            aria-label="Cuộn trái"
            className="relatedButton"
            disabled={!canLeft}
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            aria-label="Cuộn phải"
            className="relatedButton"
            disabled={!canRight}
          >
            →
          </button>
        </div>
      </div>

      <div className="relatedOuter">
        <div className="relatedFade relatedFade--left" />
        <div className="relatedFade relatedFade--right" />

        <div ref={rowRef} className="relatedScroller">
          {items.map((item, index) => (
            <div key={item._id || item.id || index} className="relatedItem">
              <AdultCard movie={item} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .relatedWrap {
          position: relative;
        }

        .relatedHead {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .relatedHead__meta {
          min-width: 0;
        }

        .relatedHead__eyebrow {
          color: rgba(255, 255, 255, 0.56);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.14em;
        }

        .relatedHead__desc {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 0.92rem;
        }

        .relatedControls {
          display: flex;
          gap: 10px;
          z-index: 3;
        }

        .relatedButton {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 1.08rem;
          font-weight: 900;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition:
            transform 0.22s ease,
            background 0.22s ease,
            border-color 0.22s ease,
            opacity 0.22s ease;
        }

        .relatedButton:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .relatedButton:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }

        .relatedOuter {
          position: relative;
          overflow: hidden;
        }

        .relatedFade {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 70px;
          z-index: 2;
          pointer-events: none;
        }

        .relatedFade--left {
          left: 0;
          background: linear-gradient(
            90deg,
            rgba(7, 9, 15, 0.9) 0%,
            rgba(7, 9, 15, 0) 100%
          );
        }

        .relatedFade--right {
          right: 0;
          background: linear-gradient(
            270deg,
            rgba(7, 9, 15, 0.9) 0%,
            rgba(7, 9, 15, 0) 100%
          );
        }

        .relatedScroller {
          display: grid;
          grid-auto-flow: column;
          grid-template-rows: repeat(2, auto);
          grid-auto-columns: minmax(300px, 340px);
          gap: 20px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 2px 4px 8px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
          align-items: start;
        }

        .relatedScroller::-webkit-scrollbar {
          display: none;
        }

        .relatedItem {
          min-width: 0;
        }

        @media (max-width: 768px) {
          .relatedHead {
            align-items: center;
          }

          .relatedScroller {
            grid-auto-columns: minmax(240px, 280px);
            gap: 16px;
          }

          .relatedFade {
            width: 34px;
          }

          .relatedButton {
            width: 42px;
            height: 42px;
          }
        }
      `}</style>
    </div>
  );
}