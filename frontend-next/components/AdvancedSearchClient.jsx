"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { advancedSearch, getAdultMovies } from "@/lib/api";

export default function AdvancedSearchClient() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [form, setForm] = useState({
    keyword: "",
    genres: [],
    minYear: "",
    maxYear: "",
    minRating: "",
    maxRating: "",
    language: "",
    country: "",
  });

  useEffect(() => {
    async function loadGenres() {
      const movies = await getAdultMovies();
      const set = new Set();

      movies.forEach((movie) => {
        (movie?.genre || []).forEach((g) => {
          if (g) set.add(g);
        });
      });

      setGenres([...set].sort((a, b) => a.localeCompare(b)));
      setResults(movies);
    }

    loadGenres();
  }, []);

  const selectedGenres = useMemo(() => form.genres || [], [form.genres]);

  const toggleGenre = (genre) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const onChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await advancedSearch({
        keyword: form.keyword,
        genres: form.genres,
        minYear: form.minYear ? Number(form.minYear) : undefined,
        maxYear: form.maxYear ? Number(form.maxYear) : undefined,
        minRating: form.minRating ? Number(form.minRating) : undefined,
        maxRating: form.maxRating ? Number(form.maxRating) : undefined,
        language: form.language || undefined,
        country: form.country || undefined,
      });

      setResults(data);
    } catch (err) {
      alert(err.message || "Không thể tìm kiếm nâng cao");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 0 70px",
        background:
          "radial-gradient(circle at top, rgba(96, 94, 255, 0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0) 42%), linear-gradient(180deg, #07090f 0%, #090b12 45%, #040507 100%)",
      }}
    >
      <div className="container">
        <div className="surface box">
          <div className="kicker">ADVANCED SEARCH</div>
          <h1 className="heading-lg" style={{ marginTop: 16 }}>
            Tìm kiếm nâng cao
          </h1>
          <p className="body-md" style={{ marginTop: 10 }}>
            Lọc nhanh theo từ khóa, thể loại, năm, rating, ngôn ngữ và quốc gia.
          </p>

          <form onSubmit={onSubmit} className="form">
            <div className="field field--full">
              <label>Từ khóa</label>
              <input
                name="keyword"
                value={form.keyword}
                onChange={onChange}
                placeholder="Tên video, mô tả..."
              />
            </div>

            <div className="field">
              <label>Năm từ</label>
              <input
                name="minYear"
                value={form.minYear}
                onChange={onChange}
                type="number"
                placeholder="2022"
              />
            </div>

            <div className="field">
              <label>Năm đến</label>
              <input
                name="maxYear"
                value={form.maxYear}
                onChange={onChange}
                type="number"
                placeholder="2026"
              />
            </div>

            <div className="field">
              <label>Rating từ</label>
              <input
                name="minRating"
                value={form.minRating}
                onChange={onChange}
                type="number"
                step="0.1"
                placeholder="5"
              />
            </div>

            <div className="field">
              <label>Rating đến</label>
              <input
                name="maxRating"
                value={form.maxRating}
                onChange={onChange}
                type="number"
                step="0.1"
                placeholder="10"
              />
            </div>

            <div className="field">
              <label>Ngôn ngữ</label>
              <input
                name="language"
                value={form.language}
                onChange={onChange}
                placeholder="Vietsub, English..."
              />
            </div>

            <div className="field">
              <label>Quốc gia</label>
              <input
                name="country"
                value={form.country}
                onChange={onChange}
                placeholder="Việt Nam, Nhật Bản..."
              />
            </div>

            <div className="field field--full">
              <label>Thể loại</label>
              <div className="chips">
                {genres.map((genre) => {
                  const active = selectedGenres.includes(genre);

                  return (
                    <button
                      key={genre}
                      type="button"
                      className={`chip ${active ? "isActive" : ""}`}
                      onClick={() => toggleGenre(genre)}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="actions">
              <button className="submitBtn" type="submit" disabled={loading}>
                {loading ? "Đang lọc..." : "Lọc kết quả"}
              </button>
            </div>
          </form>
        </div>

        <div className="resultHead">
          <h2 className="section-title" style={{ margin: 0 }}>
            Kết quả
          </h2>
          <p className="section-desc" style={{ marginTop: 8 }}>
            {results.length} video phù hợp
          </p>
        </div>

        <div className="grid">
          {results.map((movie) => (
            <Link key={movie._id} href={`/adult/${movie.slug}`} className="card">
              <div
                className="thumb"
                style={{
                  backgroundImage: `url(${movie.displayBackdrop || movie.displayImage || movie.poster || ""})`,
                }}
              />
              <div className="body">
                <div className="title">{movie.title}</div>
                <div className="meta">
                  {movie.displayDuration || "HD"} • {movie.displayViews || "Mới cập nhật"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        .box {
          padding: 28px;
          border-radius: 28px;
        }

        .form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 24px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .field--full {
          grid-column: 1 / -1;
        }

        .field label {
          color: #fff;
          font-weight: 700;
          font-size: 0.92rem;
        }

        .field input {
          width: 100%;
          min-height: 48px;
          padding: 0 14px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
          outline: none;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .chip {
          min-height: 40px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #fff;
          font-weight: 700;
        }

        .chip.isActive {
          background: #fff;
          color: #05070d;
        }

        .actions {
          grid-column: 1 / -1;
        }

        .submitBtn {
          min-height: 48px;
          padding: 0 18px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.1);
          background: #fff;
          color: #05070d;
          font-weight: 800;
        }

        .resultHead {
          margin: 28px 0 18px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .card {
          text-decoration: none;
          color: inherit;
          border-radius: 22px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .thumb {
          aspect-ratio: 16 / 10;
          background-size: cover;
          background-position: center;
        }

        .body {
          padding: 14px;
        }

        .title {
          color: #fff;
          font-weight: 800;
          line-height: 1.35;
        }

        .meta {
          margin-top: 6px;
          color: rgba(255,255,255,0.66);
          font-size: 0.88rem;
        }

        @media (max-width: 768px) {
          .form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}