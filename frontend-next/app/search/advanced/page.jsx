import Link from "next/link";
import AdultCard from "@/components/AdultCard";
import { advancedSearch } from "@/lib/api";

export const metadata = {
  title: "Tìm kiếm nâng cao",
  description: "Tìm kiếm nâng cao nội dung trên ClipDam18.",
};

export default async function AdvancedSearchPage({ searchParams }) {
  const params = await searchParams;

  const keyword = String(params?.q || "").trim();
  const genreInput = String(params?.genre || "").trim();
  const minYear = params?.minYear ? Number(params.minYear) : undefined;
  const maxYear = params?.maxYear ? Number(params.maxYear) : undefined;
  const minRating = params?.minRating ? Number(params.minRating) : undefined;
  const maxRating = params?.maxRating ? Number(params.maxRating) : undefined;
  const language = String(params?.language || "").trim();
  const country = String(params?.country || "").trim();

  const genres = genreInput
    ? genreInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const hasFilters =
    keyword ||
    genres.length ||
    minYear ||
    maxYear ||
    minRating ||
    maxRating ||
    language ||
    country;

  const movies = hasFilters
    ? await advancedSearch({
        keyword,
        genres,
        minYear,
        maxYear,
        minRating,
        maxRating,
        language,
        country,
      })
    : [];

  const activeFilters = [
    keyword ? `Từ khoá: ${keyword}` : null,
    genres.length ? `Thể loại: ${genres.join(", ")}` : null,
    minYear ? `Năm từ: ${minYear}` : null,
    maxYear ? `Đến năm: ${maxYear}` : null,
    minRating ? `Rating từ: ${minRating}` : null,
    maxRating ? `Đến rating: ${maxRating}` : null,
    language ? `Ngôn ngữ: ${language}` : null,
    country ? `Quốc gia: ${country}` : null,
  ].filter(Boolean);

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
            paddingTop: 46,
            paddingBottom: 34,
          }}
        >
          <div className="kicker">Advanced Search</div>

          <h1
            className="heading-xl"
            style={{
              marginTop: 18,
              maxWidth: 860,
            }}
          >
            Tìm kiếm nâng cao
          </h1>

          <p
            className="body-lg"
            style={{
              marginTop: 16,
              maxWidth: 760,
            }}
          >
            Lọc nhanh theo từ khoá, thể loại, năm, rating, ngôn ngữ hoặc quốc gia
            để ra đúng nội dung bạn muốn xem.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 18,
            }}
          >
            <Link href="/search/advanced?q=test" style={quickTagStyle}>
              test
            </Link>
            <Link href="/search/advanced?genre=asian" style={quickTagStyle}>
              asian
            </Link>
            <Link href="/search/advanced?genre=Thu%20Dam" style={quickTagStyle}>
              Thủ Dâm
            </Link>
            <Link href="/search/advanced?minRating=8" style={quickTagStyle}>
              rating 8+
            </Link>
            <Link href="/search/advanced?language=English" style={quickTagStyle}>
              English
            </Link>
          </div>

          <form
            action="/search/advanced"
            method="GET"
            className="surface"
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 24,
              maxWidth: 920,
              marginLeft: "auto",
              marginRight: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gap: 14,
              boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
            }}
          >
            <div style={{ gridColumn: "span 12" }}>
              <label style={labelStyle}>Từ khoá</label>
              <input
                type="text"
                name="q"
                defaultValue={keyword}
                placeholder="Nhập tên video, mô tả..."
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <label style={labelStyle}>Thể loại</label>
              <input
                type="text"
                name="genre"
                defaultValue={genreInput}
                placeholder="Ví dụ: asian, cosplay, amateur"
                style={inputStyle}
              />
              <div
                style={{
                  marginTop: 6,
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "0.82rem",
                }}
              >
                Ngăn cách nhiều thể loại bằng dấu phẩy.
              </div>
            </div>

            <div style={{ gridColumn: "span 3", minWidth: 0 }}>
              <label style={labelStyle}>Năm từ</label>
              <input
                type="number"
                name="minYear"
                defaultValue={minYear || ""}
                placeholder="2023"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 3", minWidth: 0 }}>
              <label style={labelStyle}>Đến năm</label>
              <input
                type="number"
                name="maxYear"
                defaultValue={maxYear || ""}
                placeholder="2025"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 3", minWidth: 0 }}>
              <label style={labelStyle}>Rating từ</label>
              <input
                type="number"
                step="0.1"
                name="minRating"
                defaultValue={minRating || ""}
                placeholder="4.0"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 3", minWidth: 0 }}>
              <label style={labelStyle}>Đến rating</label>
              <input
                type="number"
                step="0.1"
                name="maxRating"
                defaultValue={maxRating || ""}
                placeholder="9.5"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 6", minWidth: 0 }}>
              <label style={labelStyle}>Ngôn ngữ</label>
              <input
                type="text"
                name="language"
                defaultValue={language}
                placeholder="Ví dụ: English, Japanese"
                style={inputStyle}
              />
            </div>

            <div style={{ gridColumn: "span 6", minWidth: 0 }}>
              <label style={labelStyle}>Quốc gia</label>
              <input
                type="text"
                name="country"
                defaultValue={country}
                placeholder="Ví dụ: Việt Nam, Korea"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                gridColumn: "span 12",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 4,
              }}
            >
              <button type="submit" style={primaryButtonStyle}>
                Lọc kết quả
              </button>

              <Link href="/search" style={secondaryButtonStyle}>
                Về search thường
              </Link>

              <Link href="/search/advanced" style={secondaryButtonStyle}>
                Reset bộ lọc
              </Link>
            </div>
          </form>
        </div>
      </section>

      <section
        className="container"
        style={{
          paddingTop: 30,
          paddingBottom: 70,
        }}
      >
        {hasFilters ? (
          movies.length ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "start",
                  justifyContent: "space-between",
                  gap: 16,
                  marginBottom: 18,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 className="section-title" style={{ margin: 0 }}>
                    Tìm thấy {movies.length} kết quả
                  </h2>
                  <p className="section-desc" style={{ marginTop: 8 }}>
                    Kết quả phù hợp với bộ lọc bạn đã chọn.
                  </p>
                </div>

                <Link href="/search/advanced" style={secondaryButtonStyle}>
                  Xoá toàn bộ filter
                </Link>
              </div>

              {activeFilters.length ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginBottom: 22,
                  }}
                >
                  {activeFilters.map((item) => (
                    <span key={item} style={filterTagStyle}>
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

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

              <p style={{ marginTop: 10 }}>
                Không có nội dung nào khớp với bộ lọc hiện tại.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 18,
                }}
              >
                <Link href="/search/advanced" style={primaryButtonStyle}>
                  Reset bộ lọc
                </Link>

                <Link href="/search" style={secondaryButtonStyle}>
                  Về search thường
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
              Gợi ý sử dụng
            </h2>

            <p style={{ marginTop: 10 }}>
              Bạn có thể kết hợp nhiều bộ lọc để thu hẹp kết quả chính xác hơn.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 18,
              }}
            >
              <Link href="/search/advanced?q=test" style={tagStyle}>
                test
              </Link>
              <Link href="/search/advanced?genre=cosplay,asian" style={tagStyle}>
                cosplay, asian
              </Link>
              <Link href="/search/advanced?language=japanese" style={tagStyle}>
                japanese
              </Link>
              <Link href="/search/advanced?country=korea" style={tagStyle}>
                korea
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: 8,
  color: "#fff",
  fontSize: "0.92rem",
  fontWeight: 700,
};

const inputStyle = {
  width: "100%",
  minHeight: 46,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  outline: "none",
};

const primaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#fff",
  color: "#05070d",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  fontWeight: 700,
};

const tagStyle = {
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
};

const quickTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 999,
  textDecoration: "none",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.86rem",
};

const filterTagStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.86rem",
};