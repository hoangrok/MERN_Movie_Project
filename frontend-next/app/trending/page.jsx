import AdultCard from "@/components/AdultCard";
import { getAdultMovies } from "@/lib/api";
import Link from "next/link";

export const metadata = {
  title: "Trending - ClipDam18",
  description: "Xem các video thịnh hành, trending trên ClipDam18.",
};

export default async function TrendingPage() {
  const movies = (await getAdultMovies())
    .filter((m) => m.newPopular || m.views > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0));

  return (
    <main style={{ minHeight: "100vh", paddingTop: 40, paddingBottom: 70 }}>
      <div className="container">
        <h1 className="section-title">Trending</h1>
        <p className="section-desc">
          Các video thịnh hành được nhiều người xem nhất.
        </p>

        {movies.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginTop: 28,
            }}
          >
            {movies.map((movie, index) => (
              <AdultCard key={movie._id} movie={movie} priority={index < 6} />
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            Không có video trending nào.
          </div>
        )}
      </div>
    </main>
  );
}