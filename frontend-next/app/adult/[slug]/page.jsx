import { notFound } from "next/navigation";
import { getMovieBySlug, getRelatedMovies } from "@/lib/api";
import AdultPlayer from "@/components/AdultPlayer";
import AdultCard from "@/components/AdultCard";

export default async function Detail({ params }) {
  const { slug } = await params;

  const [movie, relatedMovies] = await Promise.all([
    getMovieBySlug(slug),
    getRelatedMovies(slug, 10),
  ]);

  if (!movie) return notFound();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div
        style={{
          maxWidth: 920,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 5vw, 4rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
          }}
        >
          {movie.title}
        </h1>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 14,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: "0.86rem",
              fontWeight: 700,
            }}
          >
            {movie.displayDuration || "HD"}
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 34,
              padding: "0 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
              fontSize: "0.86rem",
              fontWeight: 700,
            }}
          >
            {movie.displayViews || "Mới cập nhật"}
          </span>
        </div>

        <AdultPlayer movie={movie} />

        <div
          className="surface"
          style={{
            padding: 18,
            marginTop: 22,
          }}
        >
          <h2
            style={{
              fontSize: "1.08rem",
              margin: 0,
              marginBottom: 10,
            }}
          >
            Giới thiệu
          </h2>

          <p style={{ margin: 0 }}>
            {movie.description || "Chưa có mô tả."}
          </p>
        </div>

        {relatedMovies?.length ? (
          <section style={{ marginTop: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "end",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <h2 className="section-title" style={{ margin: 0 }}>
                  Có thể bạn sẽ thích
                </h2>
                <p className="section-desc" style={{ marginTop: 8 }}>
                  Một vài nội dung liên quan để xem tiếp theo kiểu cuộn ngang
                  như Netflix.
                </p>
              </div>
            </div>

            <div className="relatedScroller">
              {relatedMovies.map((item, index) => (
                <div className="relatedItem" key={item._id}>
                  <AdultCard movie={item} priority={index < 4} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <style jsx>{`
        .relatedScroller {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: minmax(220px, 260px);
          gap: 18px;
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 8px;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }

        .relatedScroller::-webkit-scrollbar {
          height: 10px;
        }

        .relatedScroller::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
        }

        .relatedScroller::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 999px;
        }

        .relatedItem {
          scroll-snap-align: start;
          min-width: 0;
        }

        @media (max-width: 768px) {
          .relatedScroller {
            grid-auto-columns: minmax(180px, 220px);
            gap: 14px;
          }
        }
      `}</style>
    </div>
  );
}