import AdultCard from "@/components/AdultCard";
import { getLatestMovies } from "@/lib/api";

export const metadata = {
  title: "Latest",
  description: "Nội dung mới cập nhật trên ClipDam18.",
};

export default async function LatestPage() {
  const movies = await getLatestMovies(24);

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%), linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%)",
      }}
    >
      <section
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="container" style={{ paddingTop: 42, paddingBottom: 36 }}>
          <div className="kicker">🆕 Latest</div>
          <h1 className="heading-xl" style={{ marginTop: 18 }}>
            Mới cập nhật
          </h1>
          <p className="body-lg" style={{ marginTop: 14, maxWidth: 760 }}>
            Những nội dung được cập nhật gần đây nhất trên hệ thống.
          </p>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 30, paddingBottom: 70 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
          }}
        >
          {movies.map((movie, index) => (
            <AdultCard key={movie._id} movie={movie} priority={index < 6} />
          ))}
        </div>
      </section>
    </main>
  );
}