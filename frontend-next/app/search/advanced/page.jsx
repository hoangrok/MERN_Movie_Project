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
            paddingBottom: 30,
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
            Lọc theo từ khoá, thể loại, năm, rating, ngôn ngữ hoặc quốc gia.
          </p>

          <form
            action="/search/advanced"
            method="GET"
            className="surface"
            style={{
              marginTop: 24,
              padding: 18,
              borderRadius: 20,
              display: "grid",
              gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            <div style={{ gridColumn: "span 12" }}>
              <label className="advLabel">Từ khoá</label>
              <input
                type="text"
                name="q"
                defaultValue={keyword}
                placeholder="Nhập tên video, mô tả..."
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 12" }}>
              <label className="advLabel">Thể loại</label>
              <input
                type="text"
                name="genre"
                defaultValue={genreInput}
                placeholder="Ví dụ: asian, cosplay, amateur"
                className="advInput"
              />
              <div className="advHint">Ngăn cách nhiều thể loại bằng dấu phẩy.</div>
            </div>

            <div style={{ gridColumn: "span 3" }} className="advCol">
              <label className="advLabel">Năm từ</label>
              <input
                type="number"
                name="minYear"
                defaultValue={minYear || ""}
                placeholder="2023"
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 3" }} className="advCol">
              <label className="advLabel">Đến năm</label>
              <input
                type="number"
                name="maxYear"
                defaultValue={maxYear || ""}
                placeholder="2025"
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 3" }} className="advCol">
              <label className="advLabel">Rating từ</label>
              <input
                type="number"
                step="0.1"
                name="minRating"
                defaultValue={minRating || ""}
                placeholder="4.0"
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 3" }} className="advCol">
              <label className="advLabel">Đến rating</label>
              <input
                type="number"
                step="0.1"
                name="maxRating"
                defaultValue={maxRating || ""}
                placeholder="9.5"
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 6" }} className="advCol">
              <label className="advLabel">Ngôn ngữ</label>
              <input
                type="text"
                name="language"
                defaultValue={language}
                placeholder="Ví dụ: japanese"
                className="advInput"
              />
            </div>

            <div style={{ gridColumn: "span 6" }} className="advCol">
              <label className="advLabel">Quốc gia</label>
              <input
                type="text"
                name="country"
                defaultValue={country}
                placeholder="Ví dụ: korea"
                className="advInput"
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
              <button type="submit" className="advSubmit">
                Tìm kiếm nâng cao
              </button>

              <Link href="/search" className="advSecondary">
                Về search thường
              </Link>

              <Link href="/search/advanced" className="advSecondary">
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
                  alignItems: "center",
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
                <Link href="/search/advanced" className="advSubmit">
                  Reset bộ lọc
                </Link>

                <Link href="/search" className="advSecondary">
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
              <Link href="/search/advanced?q=test" className="advTag">
                test
              </Link>
              <Link
                href="/search/advanced?genre=cosplay,asian"
                className="advTag"
              >
                cosplay, asian
              </Link>
              <Link href="/search/advanced?language=japanese" className="advTag">
                japanese
              </Link>
              <Link href="/search/advanced?country=korea" className="advTag">
                korea
              </Link>
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        .advLabel {
          display: block;
          margin-bottom: 8px;
          color: #fff;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .advHint {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 0.82rem;
        }

        .advInput {
          width: 100%;
          min-height: 46px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
        }

        .advInput::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        .advSubmit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #fff;
          color: #05070d;
          font-weight: 800;
          cursor: pointer;
        }

        .advSecondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          text-decoration: none;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-weight: 700;
        }

        .advTag {
          display: inline-flex;
          align-items: center;
          min-height: 38px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-weight: 700;
          font-size: 0.92rem;
        }

        @media (max-width: 900px) {
          .advCol {
            grid-column: span 6 !important;
          }
        }

        @media (max-width: 640px) {
          .advCol {
            grid-column: span 12 !important;
          }
        }
      `}</style>
    </main>
  );
}