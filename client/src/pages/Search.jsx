import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [searchMeta, setSearchMeta] = useState({
    didYouMean: "",
    suggestions: [],
  });

  useEffect(() => {
    setActiveGenre("all");
    setSortBy("relevance");
  }, [query]);

  useEffect(() => {
    const loadSearch = async () => {
      if (!query.trim()) {
        setMovies([]);
        setSearchMeta({ didYouMean: "", suggestions: [] });
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
          setSearchMeta({
            didYouMean: data.searchMeta?.didYouMean || "",
            suggestions: Array.isArray(data.searchMeta?.suggestions)
              ? data.searchMeta.suggestions
              : [],
          });
        } else {
          setMovies([]);
          setSearchMeta({ didYouMean: "", suggestions: [] });
        }
      } catch (err) {
        console.error("Search error:", err);
        setMovies([]);
        setSearchMeta({ didYouMean: "", suggestions: [] });
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
      genres.forEach((genre) => map.add(genre));
    });

    return ["all", ...Array.from(map)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (activeGenre !== "all") {
      result = result.filter((movie) => {
        const genres = movie.genre || movie.genres || [];
        return genres.some(
          (genre) => normalizeText(genre) === normalizeText(activeGenre)
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

  const suggestionList = useMemo(
    () =>
      (searchMeta.suggestions || []).filter(
        (item) => normalizeText(item) !== normalizeText(query)
      ),
    [query, searchMeta.suggestions]
  );

  const heroImage =
    filteredMovies?.[0]?.backdrop ||
    filteredMovies?.[0]?.poster ||
    FALLBACK_BACKDROP;

  const runSuggestedSearch = (nextQuery) => {
    const value = String(nextQuery || "").trim();
    if (!value) return;
    navigate(`/search?q=${encodeURIComponent(value)}`);
  };

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
          <h1 className="search-hero__title">Ket qua tim kiem</h1>
          <p className="search-hero__desc">
            {query.trim()
              ? `Ban dang tim: "${query}"`
              : "Nhap tu khoa de tim phim, series, genre hoac noi dung gan dung."}
          </p>
        </div>

        {query.trim() && (
          <>
            {(searchMeta.didYouMean || suggestionList.length > 0) && (
              <div className="search-suggest">
                {searchMeta.didYouMean &&
                normalizeText(searchMeta.didYouMean) !== normalizeText(query) ? (
                  <button
                    type="button"
                    className="search-suggest__primary"
                    onClick={() => runSuggestedSearch(searchMeta.didYouMean)}
                  >
                    Co phai ban muon tim: <strong>{searchMeta.didYouMean}</strong>
                  </button>
                ) : null}

                {suggestionList.length > 0 ? (
                  <div className="search-suggest__chips">
                    {suggestionList.slice(0, 5).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="search-chip"
                        onClick={() => runSuggestedSearch(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

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
                    {genre === "all" ? "Tat ca" : genre}
                  </button>
                ))}
              </div>

              <div className="search-toolbar__sort">
                <label>Sap xep</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="relevance">Lien quan</option>
                  <option value="views">Luot xem</option>
                  <option value="year">Nam moi nhat</option>
                  <option value="rating">Danh gia</option>
                </select>
              </div>
            </div>
          </>
        )}

        {loading ? (
          <div className="search-grid">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="search-skeleton" />
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="search-empty">
            <h2>Chua co tu khoa</h2>
            <p>Hay nhap noi dung ban muon tim vao thanh tim kiem.</p>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="search-empty">
            <h2>Khong tim thay ket qua phu hop</h2>
            <p>
              Thu tu khoa khac, bo loc the loai, hoac bam vao cac goi y gan dung
              o tren.
            </p>
          </div>
        ) : (
          <>
            <div className="search-summary">
              Tim thay <strong>{filteredMovies.length}</strong> ket qua
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
