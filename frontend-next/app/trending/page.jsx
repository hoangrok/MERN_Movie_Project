import AdultCard from "@/components/AdultCard";
import { getTrendingMovies } from "@/lib/api";

export const metadata = {
  title: "Trending",
  description: "Danh sách nội dung thịnh hành trên ClipDam18.",
};

export default async function TrendingPage() {
  const movies = await getTrendingMovies(24);
  const hero = movies[0];
  const rest = movies.slice(1);

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
          <div className="kicker">🔥 Trending</div>
          <h1 className="heading-xl" style={{ marginTop: 18 }}>
            Nội dung đang hot
          </h1>
          <p className="body-lg" style={{ marginTop: 14, maxWidth: 760 }}>
            Các video đang được xem nhiều và nổi bật nhất hiện tại.
          </p>

          {hero ? (
            <a
              href={`/adult/${hero.slug}`}
              className="surface"
              style={{
                marginTop: 28,
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 0,
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 24,
              }}
            >
              <div
                style={{
                  minHeight: 320,
                  backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.68), rgba(0,0,0,0.22)), url(${hero.displayBackdrop || hero.displayImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div className="kicker">#1 Trending</div>
                <h2 className="heading-lg" style={{ marginTop: 16 }}>
                  {hero.title}
                </h2>
                <p className="body-md" style={{ marginTop: 12 }}>
                  {hero.description || "Nội dung nổi bật đang được xem nhiều."}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: 18,
                  }}
                >
                  <span className="kicker">{hero.displayDuration || "HD"}</span>
                  <span className="kicker">{hero.displayViews || "Hot"}</span>
                </div>
              </div>
            </a>
          ) : null}
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
          {rest.map((movie, index) => (
            <AdultCard key={movie._id} movie={movie} priority={index < 6} />
          ))}
        </div>
      </section>
    </main>
  );
}