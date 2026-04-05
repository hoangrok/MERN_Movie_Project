"use client";

import { useRef } from "react";
import AdultCard from "@/components/AdultCard";

export default function RelatedSlider({ items = [] }) {
  const rowRef = useRef(null);

  const scrollByAmount = (direction) => {
    const el = rowRef.current;
    if (!el) return;

    const amount = Math.min(900, Math.max(260, el.clientWidth * 0.9));

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

      <div
        ref={rowRef}
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridAutoColumns: "minmax(220px, 260px)",
          gap: 18,
          overflowX: "auto",
          overflowY: "hidden",
          paddingBottom: 10,
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
        }}
      >
        {items.map((item, index) => (
          <div
            key={item._id}
            style={{
              minWidth: 0,
              scrollSnapAlign: "start",
            }}
          >
            <AdultCard movie={item} priority={index < 4} />
          </div>
        ))}
      </div>
    </div>
  );
}

const buttonStyle = {
  width: 42,
  height: 42,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  fontSize: "1.1rem",
  fontWeight: 800,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
};