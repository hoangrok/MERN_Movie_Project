"use client";

import { useRef } from "react";
import AdultCard from "@/components/AdultCard";

export default function RelatedSlider({ items = [] }) {
  const rowRef = useRef(null);

  const scrollByAmount = (direction) => {
    const el = rowRef.current;
    if (!el) return;

    const amount = Math.min(1100, Math.max(320, el.clientWidth * 0.92));

    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (!items.length) return null;

  const firstRow = items.slice(0, Math.ceil(items.length / 2));
  const secondRow = items.slice(Math.ceil(items.length / 2));

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
          <div className="relatedColumn">
            {firstRow.map((item, index) => (
              <div
                key={item._id}
                style={{
                  minWidth: 0,
                }}
              >
                <AdultCard movie={item} priority={index < 4} />
              </div>
            ))}
          </div>

          {secondRow.length ? (
            <div className="relatedColumn">
              {secondRow.map((item, index) => (
                <div
                  key={item._id}
                  style={{
                    minWidth: 0,
                  }}
                >
                  <AdultCard movie={item} priority={index < 2} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .relatedOuter {
          overflow: hidden;
        }

        .relatedScroller {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(320px, 380px);
          gap: 24px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 4px;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .relatedScroller::-webkit-scrollbar {
          display: none;
        }

        .relatedColumn {
          display: grid;
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 18px;
          align-content: start;
        }

        @media (max-width: 768px) {
          .relatedScroller {
            grid-auto-columns: minmax(240px, 280px);
            gap: 16px;
          }

          .relatedColumn {
            gap: 14px;
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