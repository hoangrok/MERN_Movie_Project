"use client";

import { useRef } from "react";
import AdultCard from "@/components/AdultCard";

export default function RelatedSlider({ items = [] }) {
  const rowRef = useRef(null);

  const scrollByAmount = (direction) => {
    const el = rowRef.current;
    if (!el) return;

    const amount = Math.min(1000, Math.max(320, el.clientWidth * 0.9));

    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!items.length) return null;

  return (
    <div style={{ position: "relative" }}>
      <div className="relatedControls">
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          aria-label="Cuộn trái"
          className="relatedButton"
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Cuộn phải"
          className="relatedButton"
        >
          →
        </button>
      </div>

      <div className="relatedOuter">
        <div ref={rowRef} className="relatedScroller">
          {items.map((item, index) => (
            <div key={item._id} className="relatedItem">
              <AdultCard movie={item} priority={index < 4} />
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .relatedControls {
          position: absolute;
          right: 0;
          top: -58px;
          display: flex;
          gap: 10px;
          z-index: 3;
        }

        .relatedButton {
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 1.1rem;
          font-weight: 800;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition:
            transform 0.22s ease,
            background 0.22s ease,
            border-color 0.22s ease;
        }

        .relatedButton:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .relatedOuter {
          overflow: hidden;
        }

        .relatedScroller {
          display: grid;
          grid-auto-flow: column;
          grid-template-rows: repeat(2, auto);
          grid-auto-columns: minmax(300px, 340px);
          gap: 20px 20px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 4px;
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
          .relatedControls {
            top: -52px;
          }

          .relatedScroller {
            grid-auto-columns: minmax(240px, 280px);
            gap: 16px 16px;
          }
        }
      `}</style>
    </div>
  );
}