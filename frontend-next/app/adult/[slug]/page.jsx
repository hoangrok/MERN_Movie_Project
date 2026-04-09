import { notFound } from "next/navigation";
import { getMovieBySlug, getRelatedMovies } from "@/lib/api";
import AdultPlayer from "@/components/AdultPlayer";
import RelatedSlider from "@/components/RelatedSlider";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) {
    return {
      title: "Không tìm thấy nội dung",
      description: "Nội dung không tồn tại trên ClipDam18.",
    };
  }

  const title = `${movie.title} | ClipDam18`;
  const description =
    movie.description ||
    `Xem ${movie.title} với chất lượng cao trên ClipDam18.`;
  const image = movie.displayBackdrop || movie.displayImage || movie.poster || "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      images: image ? [{ url: image, alt: movie.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function Detail({ params }) {
  const { slug } = await params;

  const [movie, relatedMovies] = await Promise.all([
    getMovieBySlug(slug),
    getRelatedMovies(slug, 10),
  ]);

  if (!movie) return notFound();

  return (
    <div className="container" style={{ paddingTop: 52, paddingBottom: 54 }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 18,
            marginBottom: 20,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.05em",
            }}
          >
            {movie.title}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 38,
                padding: "0 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 800,
              }}
            >
              {movie.displayDuration || "HD"}
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 38,
                padding: "0 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: "0.9rem",
                fontWeight: 800,
              }}
            >
              {movie.displayViews || "Mới cập nhật"}
            </span>

            {movie.language ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 38,
                  padding: "0 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: 800,
                }}
              >
                {movie.language}
              </span>
            ) : null}
          </div>
        </div>

        <AdultPlayer movie={movie} />

        <div
          className="surface"
          style={{
            padding: 20,
            marginTop: 24,
            borderRadius: 24,
          }}
        >
          <h2
            style={{
              fontSize: "1.12rem",
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
          <section style={{ marginTop: 34 }}>
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
                  Gợi ý dựa trên tag, genre và nội dung liên quan.
                </p>
              </div>
            </div>

            <RelatedSlider items={relatedMovies} />
          </section>
        ) : null}
      </div>
    </div>
  );
}