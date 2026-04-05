import { notFound } from "next/navigation";
import { getMovieBySlug } from "@/lib/api";
import AdultPlayer from "@/components/AdultPlayer";

export default async function Detail({ params }) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) return notFound();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div
        style={{
          display: "grid",
          gap: 20,
        }}
      >
        <div>
          <h1>{movie.title}</h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 12,
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
        </div>

        <AdultPlayer movie={movie} />

        <div
          className="surface"
          style={{
            padding: 18,
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              marginBottom: 10,
            }}
          >
            Giới thiệu
          </h2>

          <p style={{ marginTop: 0 }}>
            {movie.description || "Chưa có mô tả."}
          </p>
        </div>
      </div>
    </div>
  );
}