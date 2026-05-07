import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";
import Card from "../components/Card/Card";
import "../assets/styles/Search.scss";
import { API_URL } from "../utils/api";

const RECENT_KEY = "search_recent";
const MAX_RECENT = 8;

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(q) {
  if (!q.trim()) return;
  const list = [q, ...getRecent().filter((x) => normalizeText(x) !== normalizeText(q))].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}
function removeRecent(q) {
  const list = getRecent().filter((x) => normalizeText(x) !== normalizeText(q));
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeGenre, setActiveGenre] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [searchMeta, setSearchMeta] = useState({ didYouMean: "", suggestions: [] });

  const [inputVal, setInputVal] = useState(query);
  const [inputFocused, setInputFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecent);
  const inputRef = useRef(null);
  const genreBarRef = useRef(null);

  useEffect(() => { setInputVal(query); }, [query]);

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
      saveRecent(query.trim());
      setRecentSearches(getRecent());
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/movies?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) {
          setMovies(data.items || []);
          setSearchMeta({
            didYouMean: data.searchMeta?.didYouMean || "",
            suggestions: Array.isArray(data.searchMeta?.suggestions) ? data.searchMeta.suggestions : [],
          });
        } else {
          setMovies([]);
          setSearchMeta({ didYouMean: "", suggestions: [] });
        }
      } catch {
        setMovies([]);
        setSearchMeta({ didYouMean: "", suggestions: [] });
      } finally {
        setLoading(false);
      }
    };
    loadSearch();
  }, [query]);

  // Press "/" to focus search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement !== inputRef.current &&
          !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = (q) => {
    const v = String(q || inputVal || "").trim();
    if (!v) return;
    navigate(`/search?q=${encodeURIComponent(v)}`);
    inputRef.current?.blur();
  };

  const allGenres = useMemo(() => {
    const map = new Set();
    movies.forEach((m) => (m.genre || m.genres || []).forEach((g) => map.add(g)));
    return ["all", ...Array.from(map)];
  }, [movies]);

  const filteredMovies = useMemo(() => {
    let result = [...movies];
    if (activeGenre !== "all") {
      result = result.filter((m) =>
        (m.genre || m.genres || []).some((g) => normalizeText(g) === normalizeText(activeGenre))
      );
    }
    if (sortBy === "views")   result.sort((a, b) => (b.views  || 0) - (a.views  || 0));
    if (sortBy === "year")    result.sort((a, b) => (b.year   || 0) - (a.year   || 0));
    if (sortBy === "rating")  result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return result;
  }, [movies, activeGenre, sortBy]);

  const suggestionList = useMemo(
    () => (searchMeta.suggestions || []).filter((s) => normalizeText(s) !== normalizeText(query)),
    [query, searchMeta.suggestions]
  );

  const heroImage = filteredMovies?.[0]?.backdrop || filteredMovies?.[0]?.poster || "";

  const showDropdown = inputFocused && !query.trim() && recentSearches.length > 0;

  return (
    <div className="sp">
      <Navbar isScrolled={true} />

      {heroImage && (
        <div className="sp__backdrop" aria-hidden="true">
          <img src={heroImage} alt="" />
        </div>
      )}

      <div className="sp__shell">

        {/* ── Search bar ── */}
        <div className="sp__searchWrap">
          <div className={`sp__searchBox${inputFocused ? " is-focused" : ""}`}>
            <svg className="sp__searchIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              ref={inputRef}
              className="sp__searchInput"
              placeholder="Tìm phim, series, thể loại..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 160)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
                if (e.key === "Escape") { setInputVal(query); inputRef.current?.blur(); }
              }}
            />
            {inputVal && (
              <button
                type="button"
                className="sp__searchClear"
                onMouseDown={(e) => { e.preventDefault(); setInputVal(""); inputRef.current?.focus(); }}
                aria-label="Xóa"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            )}
            <button type="button" className="sp__searchBtn" onClick={() => runSearch()}>
              Tìm
            </button>
          </div>

          {/* Recent searches dropdown */}
          {showDropdown && (
            <div className="sp__dropdown">
              <div className="sp__dropdownHead">
                <span>Tìm kiếm gần đây</span>
                <button type="button" onClick={() => { localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }}>
                  Xoá tất cả
                </button>
              </div>
              {recentSearches.map((r) => (
                <div key={r} className="sp__dropdownItem" onMouseDown={() => runSearch(r)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="12 5 12 12 16 14"/><circle cx="12" cy="12" r="10"/>
                  </svg>
                  <span>{r}</span>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.stopPropagation(); removeRecent(r); setRecentSearches(getRecent()); }}
                    aria-label="Xoá"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <span className="sp__shortcutHint" aria-hidden="true">
            Nhấn <kbd>/</kbd> để tìm kiếm
          </span>
        </div>

        {/* ── Header / meta ── */}
        {query.trim() && (
          <div className="sp__header">
            <div>
              <p className="sp__queryLabel">Kết quả cho</p>
              <h1 className="sp__queryTitle">"{query}"</h1>
            </div>
            {!loading && movies.length > 0 && (
              <div className="sp__countBadge">
                <strong>{filteredMovies.length}</strong>
                <span>kết quả</span>
              </div>
            )}
          </div>
        )}

        {/* ── Did you mean / suggestions ── */}
        {query.trim() && (searchMeta.didYouMean || suggestionList.length > 0) && (
          <div className="sp__suggest">
            {searchMeta.didYouMean && normalizeText(searchMeta.didYouMean) !== normalizeText(query) && (
              <button type="button" className="sp__suggestPrimary" onClick={() => runSearch(searchMeta.didYouMean)}>
                Có phải bạn muốn tìm <strong>{searchMeta.didYouMean}</strong>?
              </button>
            )}
            {suggestionList.length > 0 && (
              <div className="sp__chips">
                {suggestionList.slice(0, 5).map((s) => (
                  <button key={s} type="button" className="sp__chip" onClick={() => runSearch(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Toolbar ── */}
        {query.trim() && !loading && movies.length > 0 && (
          <div className="sp__toolbar">
            <div className="sp__genreBar" ref={genreBarRef}>
              {allGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`sp__chip${activeGenre === g ? " is-active" : ""}`}
                  onClick={() => setActiveGenre(g)}
                >
                  {g === "all" ? "Tất cả" : g}
                </button>
              ))}
            </div>

            <div className="sp__sortWrap">
              <svg className="sp__sortIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sp__sort">
                <option value="relevance">Liên quan</option>
                <option value="views">Lượt xem</option>
                <option value="year">Mới nhất</option>
                <option value="rating">Đánh giá</option>
              </select>
            </div>
          </div>
        )}

        {/* ── States ── */}
        {loading ? (
          <div className="sp__grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="sp__skeleton" style={{ animationDelay: `${i * 0.06}s` }} />
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="sp__empty">
            <div className="sp__emptyIcon">🔍</div>
            <h2>Khám phá kho phim</h2>
            <p>Nhập tên phim, series, thể loại hoặc diễn viên vào thanh tìm kiếm.</p>
            {recentSearches.length > 0 && (
              <div className="sp__recentBlock">
                <p className="sp__recentLabel">Tìm kiếm gần đây</p>
                <div className="sp__chips">
                  {recentSearches.map((r) => (
                    <button key={r} type="button" className="sp__chip" onClick={() => runSearch(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : filteredMovies.length === 0 ? (
          <div className="sp__empty">
            <div className="sp__emptyIcon">😕</div>
            <h2>Không tìm thấy kết quả</h2>
            <p>
              Thử từ khoá khác, bỏ bộ lọc thể loại, hoặc chọn gợi ý bên trên.
            </p>
          </div>
        ) : (
          <div className="sp__grid sp__grid--animate">
            {filteredMovies.map((movie, i) => (
              <div key={movie._id} className="sp__cardWrap" style={{ animationDelay: `${Math.min(i * 0.04, 0.4)}s` }}>
                <Card movie={movie} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
