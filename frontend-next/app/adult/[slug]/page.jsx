import { notFound } from "next/navigation";
import { getMovieBySlug } from "@/lib/api";

export default async function Detail({ params }) {
  const { slug } = await params;
  const movie = await getMovieBySlug(slug);

  if (!movie) return notFound();

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <h1>{movie.title}</h1>

      <video
        src={movie.hlsUrl}
        controls
        autoPlay
        playsInline
        style={{ width: "100%", marginTop: 20, borderRadius: 12 }}
        poster={movie.backdrop || movie.poster}
      />

      <p style={{ marginTop: 20 }}>{movie.description || "Chưa có mô tả."}</p>
    </div>
  );
}