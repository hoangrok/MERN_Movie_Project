import Link from "next/link";
import { searchMovies } from "@/lib/api";
import AdultCard from "@/components/AdultCard";

export const metadata = {
  title: "Tìm kiếm",
  description: "Tìm kiếm nội dung trên ClipDam18.",
};

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || "").trim();

  const movies = query ? await searchMovies(query) : [];

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
        <div
          className="container"
          style={{
            paddingTop: 48,
            paddingBottom: 28,
          }}
        >
          <div className="kicker">Search</div>

          <h1
            className="heading-xl"
            style={{
              marginTop: 18,
              maxWidth: 760,
            }}
          >
            Tìm nội dung bạn muốn xem
          </h1>

          <p
            className="body-lg"
            style={{
              maxWidth: 720,
              marginTop: 16,
            }}
          >
            Tìm theo tên video, mô tả, slug, thể loại, ngôn ngữ hoặc quốc gia.
          </p>

          <form
            action="/search"
            method="GET"
            style={{
              marginTop: 26,
            }}
          >
            <div
              className="surface"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 18,
              }}
            >
              <span
                style={{
                  fontSize: "1rem",
                  opacity: 0.72,
                }}
              >
                🔍
              </span>

              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Nhập tên video, thể loại..."
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "1rem",
                }}
              />

              <button
                type="submit"
                style={{
                  minHeight: 42,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "#fff",
                  color: "#05070d",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Tìm
              </button>
            </div>
          </form>

          {query ? (
            <div
              style={{
                marginTop: 16,
                color: "rgba(255,255,255,0.72)",
                fontSize: "0.95rem",
              }}
            >
              Kết quả cho: <strong style={{ color: "#fff" }}>{query}</strong>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                color: "rgba(255,255,255,0.72)",
                fontSize: "0.95rem",
              }}
            >
              Nhập từ khoá để bắt đầu tìm kiếm.
            </div>
          )}
        </div>
      </section>

      <section
        className="container"
        style={{
          paddingTop: 30,
          paddingBottom: 70,
        }}
      >
        {query ? (
          movies.length ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <h2 className="section-title" style={{ margin: 0 }}>
                    Tìm thấy {movies.length} kết quả
                  </h2>
                  <p className="section-desc" style={{ marginTop: 8 }}>
                    Danh sách nội dung phù hợp với từ khoá bạn đã nhập.
                  </p>
                </div>

                <Link
                  href="/adult"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 42,
                    padding: "0 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Xem tất cả
                </Link>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 20,
                }}
              >
                {movies.map((movie, index) => (
                  <AdultCard
                    key={movie._id}
                    movie={movie}
                    priority={index < 6}
                  />
                ))}
              </div>
            </>
          ) : (
            <div
              className="surface"
              style={{
                padding: 24,
                borderRadius: 20,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.2rem",
                }}
              >
                Không tìm thấy kết quả
              </h2>

              <p
                style={{
                  marginTop: 10,
                }}
              >
                Không có nội dung nào khớp với từ khoá{" "}
                <strong style={{ color: "#fff" }}>{query}</strong>.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 18,
                }}
              >
                <Link
                  href="/adult"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 42,
                    padding: "0 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    background: "#fff",
                    color: "#05070d",
                    fontWeight: 800,
                  }}
                >
                  Về trang adult
                </Link>

                <Link
                  href="/search"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 42,
                    padding: "0 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  Tìm lại
                </Link>
              </div>
            </div>
          )
        ) : (
          <div
            className="surface"
            style={{
              padding: 24,
              borderRadius: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "1.2rem",
              }}
            >
              Gợi ý tìm kiếm
            </h2>

            <p style={{ marginTop: 10 }}>
              Bạn có thể thử tìm theo tên video, slug, ngôn ngữ hoặc thể loại.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 18,
              }}
            >
              {["test", "English", "Trending", "HD"].map((item) => (
                <Link
                  key={item}
                  href={`/search?q=${encodeURIComponent(item)}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 38,
                    padding: "0 14px",
                    borderRadius: 999,
                    textDecoration: "none",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                  }}
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}