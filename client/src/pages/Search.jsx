import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Card from "../components/Card/Card";
import "../assets/styles/Search.scss";
import { API_URL } from "../utils/api";

const FALLBACK_BACKDROP =
  "https://dummyimage.com/1600x900/111/ffffff&text=Search";

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  useEffect(() => {
    const loadSearch = async () => {
      if (!query.trim()) {
        setMovies([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `${API_URL}/movies?q=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();

        if (data.success) {
          setMovies(data.items || []);
        } else {
          setMovies([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    };

    loadSearch();
  }, [query]);

  const allGenres = useMemo(() => {
    const map = new Set();

    movies.forEach((movie) => {
      const genres = movie.genre || movie.genres || [];
      genres.forEach((g) => map.add(g));
    });

    return ["all", ...Array.from(map)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (activeGenre !== "all") {
      result = result.filter((movie) => {
        const genres = movie.genre || movie.genres || [];
        return genres.some(
          (g) => normalizeText(g) === normalizeText(activeGenre)
        );
      });
    }

    if (sortBy === "views") {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === "year") {
      result.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return result;
  }, [movies, activeGenre, sortBy]);

  const heroImage =
    filteredMovies?.[0]?.backdrop ||
    filteredMovies?.[0]?.poster ||
    FALLBACK_BACKDROP;

  return (
    <div className="search-page">
      <Navbar isScrolled={true} />

      <div className="search-page__backdrop">
        <img
          src={heroImage}
          alt="search-backdrop"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_BACKDROP;
          }}
        />
      </div>

      <div className="search-shell">
        <div className="search-hero">
          <div className="search-hero__badge">SEARCH</div>
          <h1 className="search-hero__title">Kết quả tìm kiếm</h1>
          <p className="search-hero__desc">
            {query.trim()
              ? `Bạn đang tìm: "${query}"`
              : "Nhập từ khóa để tìm phim, thể loại hoặc mô tả."}
          </p>
        </div>

        {query.trim() && (
          <div className="search-toolbar">
            <div className="search-toolbar__genres">
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  className={`search-chip ${
                    activeGenre === genre ? "active" : ""
                  }`}
                  onClick={() => setActiveGenre(genre)}
                >
                  {genre === "all" ? "Tất cả" : genre}
                </button>
              ))}
            </div>

            <div className="search-toolbar__sort">
              <label>Sắp xếp</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevance">Liên quan</option>
                <option value="views">Lượt xem</option>
                <option value="year">Năm mới nhất</option>
                <option value="rating">Đánh giá</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="search-grid">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="search-skeleton" />
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="search-empty">
            <h2>Chưa có từ khóa</h2>
            <p>Hãy nhập nội dung bạn muốn tìm từ thanh tìm kiếm.</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="search-empty">
            <h2>Không tìm thấy kết quả</h2>
            <p>Thử từ khóa khác hoặc bỏ bớt bộ lọc thể loại.</p>
          </div>
        ) : (
          <>
            <div className="search-summary">
              Tìm thấy <strong>{filteredMovies.length}</strong> kết quả
            </div>

            <div className="search-grid">
              {filteredMovies.map((movie) => (
                <Card key={movie._id} movie={movie} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}