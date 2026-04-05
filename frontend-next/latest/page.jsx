import AdultCard from "@/components/AdultCard";
import { getAdultMovies } from "@/lib/api";
import Link from "next/link";

export const metadata = {
  title: "Mới cập nhật - ClipDam18",
  description: "Các video mới nhất được cập nhật trên ClipDam18.",
};

export default async function LatestPage() {
  const movies = (await getAdultMovies()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  );

  return (
    <main style={{ minHeight: "100vh", paddingTop: 40, paddingBottom: 70 }}>
      <div className="container">
        <h1 className="section-title">Mới cập nhật</h1>
        <p className="section-desc">
          Danh sách các video vừa được cập nhật gần đây.
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
            Chưa có video mới nào.
          </div>
        )}
      </div>
    </main>
  );
}