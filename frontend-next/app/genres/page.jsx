import Link from "next/link";
import { getAdultMovies } from "@/lib/api";

export const metadata = {
  title: "Thể loại",
  description: "Khám phá video theo thể loại trên ClipDam18.",
};

export default async function GenresPage({ searchParams }) {
  const params = await searchParams;
  const activeGenre = String(params?.genre || "").trim();
  const movies = await getAdultMovies();

  const allGenresMap = new Map();

  movies.forEach((movie) => {
    const genres = Array.isArray(movie?.genre) ? movie.genre : [];
    genres.forEach((genre) => {
      const key = String(genre || "").trim();
      if (!key) return;
      allGenresMap.set(key, (allGenresMap.get(key) || 0) + 1);
    });
  });

  const genres = [...allGenresMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const filteredMovies = activeGenre
    ? movies.filter((movie) =>
        Array.isArray(movie.genre) ? movie.genre.includes(activeGenre) : false
      )
    : movies;

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
        <div className="container" style={{ paddingTop: 42, paddingBottom: 30 }}>
          <div className="kicker">GENRES</div>
          <h1 className="heading-xl" style={{ marginTop: 18 }}>
            Khám phá theo thể loại
          </h1>
          <p className="body-lg" style={{ marginTop: 14, maxWidth: 760 }}>
            Chọn đúng nhóm nội dung bạn muốn xem để vào nhanh hơn.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 24,
            }}
          >
            <Link
              href="/genres"
              style={chipStyle(!activeGenre)}
            >
              Tất cả
            </Link>

            {genres.map((genre) => (
              <Link
                key={genre.name}
                href={`/genres?genre=${encodeURIComponent(genre.name)}`}
                style={chipStyle(activeGenre === genre.name)}
              >
                {genre.name} <span style={{ opacity: 0.62 }}>({genre.count})</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container" style={{ paddingTop: 30, paddingBottom: 70 }}>
        <div style={{ marginBottom: 18 }}>
          <h2 className="section-title" style={{ marginBottom: 8 }}>
            {activeGenre ? `Thể loại: ${activeGenre}` : "Tất cả video"}
          </h2>
          <p className="section-desc">
            {filteredMovies.length} kết quả
          </p>
        </div>

        {filteredMovies.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
            }}
          >
            {filteredMovies.map((movie) => (
              <Link
                key={movie._id}
                href={`/adult/${movie.slug}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: 22,
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16 / 10",
                    backgroundImage: `url(${movie.displayBackdrop || movie.displayImage || movie.poster || ""})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 800,
                      lineHeight: 1.35,
                    }}
                  >
                    {movie.title}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "rgba(255,255,255,0.66)",
                      fontSize: "0.88rem",
                    }}
                  >
                    {movie.displayViews || "Mới cập nhật"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="surface" style={{ padding: 24, borderRadius: 24 }}>
            Không có video nào trong thể loại này.
          </div>
        )}
      </section>
    </main>
  );
}

function chipStyle(active) {
  return {
    minHeight: 42,
    padding: "0 14px",
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    textDecoration: "none",
    color: active ? "#05070d" : "#fff",
    fontWeight: 800,
    background: active ? "#fff" : "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
}