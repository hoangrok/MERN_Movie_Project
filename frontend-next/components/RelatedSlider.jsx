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
      <div
        style={{
          position: "absolute",
          right: 0,
          top: -58,
          display: "flex",
          gap: 10,
          zIndex: 3,
        }}
      >
        <button
          type="button"
          onClick={() => scrollByAmount("left")}
          aria-label="Scroll left"
          style={buttonStyle}
        >
          ←
        </button>

        <button
          type="button"
          onClick={() => scrollByAmount("right")}
          aria-label="Scroll right"
          style={buttonStyle}
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
        .relatedOuter {
          overflow: hidden;
        }

        .relatedScroller {
          display: grid;
          grid-auto-flow: column;
          grid-template-rows: repeat(2, auto);
          grid-auto-columns: minmax(280px, 320px);
          gap: 18px 20px;
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
          .relatedScroller {
            grid-auto-columns: minmax(220px, 260px);
            gap: 14px 16px;
          }
        }
      `}</style>
    </div>
  );
}

const buttonStyle = {
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: "1.1rem",
  fontWeight: 800,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
};