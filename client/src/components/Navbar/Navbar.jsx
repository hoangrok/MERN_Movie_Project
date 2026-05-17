import { useEffect, useMemo, useRef, useState } from "react";
import { isMobileSite, setPreferDesktop } from "../../hooks/useDomain";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.scss";
import {
  FaPowerOff,
  FaSearch,
  FaChevronDown,
  FaTimes,
  FaUserCircle,
  FaKey,
  FaUser,
  FaMoon,
  FaSun,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logoutReducer } from "../../store/Slice/auth-slice";
import toast from "react-hot-toast";
import { API_URL } from "../../utils/api";
import useTheme from "../../hooks/useTheme";

const FALLBACK_POSTER =
  "https://dummyimage.com/200x300/222/ffffff&text=No+Image";

const Navbar = ({ isScrolled }) => {
  const { theme, toggle: toggleTheme } = useTheme();
  const links = [
    { name: "Mới cập nhật", path: "/latest" },
    { name: "Top lượt xem", path: "/top-viewed" },
    { name: "Thư viện", path: "/my-list" },
  ];

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const genreBoxRef = useRef(null);
  const searchBoxRef = useRef(null);
  const userMenuRef = useRef(null);
  const genresRequestedRef = useRef(false);

  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user } = useSelector((state) => state.auth);
  const linksWithWorld = [
    ...links.slice(0, 2),
    { name: "Thế giới", path: "/the-gioi" },
    ...links.slice(2),
  ];
  const visibleLinks = user?.isAdmin
    ? [
        ...linksWithWorld,
        { name: "Admin Up", path: "/admin/new-movie" },
        { name: "Admin TG", path: "/admin/the-gioi" },
        { name: "Ads", path: "/admin/ads" },
        { name: "Feedback", path: "/admin/feedback" },
      ]
    : linksWithWorld;

  const [searchedInput, setSearchedInput] = useState("");
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const suggestAbortRef = useRef(null);

  const ensureGenresLoaded = async () => {
    if (genresRequestedRef.current) return;

    genresRequestedRef.current = true;

    try {
      const res = await fetch(`${API_URL}/movies/genres`);
      const data = await res.json();

      if (data.success) {
        setGenres(data.items || []);
      } else {
        setGenres([]);
      }
    } catch (err) {
      genresRequestedRef.current = false;
      console.error("loadGenres error:", err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genreBoxRef.current && !genreBoxRef.current.contains(e.target)) {
        setShowGenreDropdown(false);
      }
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResult(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("genres") || "";
    const currentGenres = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    setSelectedGenres(currentGenres);
  }, [location.search]);

  useEffect(() => {
    const q = searchedInput.trim();
    if (!q || q.length < 2) {
      setSuggestions([]);
      setKeywords([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (suggestAbortRef.current) suggestAbortRef.current.abort();
      suggestAbortRef.current = new AbortController();

      setSuggestLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/movies/suggest?q=${encodeURIComponent(q)}`,
          { signal: suggestAbortRef.current.signal }
        );
        const data = await res.json();
        if (data.success) {
          setSuggestions(data.movies || []);
          setKeywords(data.keywords || []);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
          setKeywords([]);
        }
      } finally {
        setSuggestLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchedInput]);

  const logOutHandler = () => {
    dispatch(logoutReducer());

    toast("Logged Out Successfully", {
      icon: "👻",
      style: {
        background: "#333",
        color: "#fff",
      },
    });

    navigate("/");
  };

  const searchMovieHandler = (e) => {
    const value = e.target.value;
    if (value.trim()) ensureGenresLoaded();
    setSearchedInput(value);
    setShowSearchResult(!!value.trim());
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchedInput.trim()) {
      setShowSearchResult(false);
      navigate(`/search?q=${encodeURIComponent(searchedInput.trim())}`);
    }
  };

  const clearSearchHandler = () => {
    setSearchedInput("");
    setSuggestions([]);
    setKeywords([]);
    setShowSearchResult(false);
    if (suggestAbortRef.current) suggestAbortRef.current.abort();
  };

  const sortedGenres = useMemo(() => {
    if (!genres.length) return genres;
    try {
      const cw = JSON.parse(localStorage.getItem("dam18_continue_watching") || "[]");
      const scores = {};
      for (const item of cw) {
        for (const g of item.genre || []) {
          scores[g] = (scores[g] || 0) + 1;
        }
      }
      if (!Object.keys(scores).length) return genres;
      return [...genres].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    } catch {
      return genres;
    }
  }, [genres]);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((x) => x !== genre);
      }
      return [...prev, genre];
    });
  };

  const applyGenres = () => {
    setShowGenreDropdown(false);

    if (selectedGenres.length === 0) {
      navigate("/genres");
      return;
    }

    navigate(`/genres?genres=${encodeURIComponent(selectedGenres.join(","))}`);
  };

  const clearGenres = () => {
    setSelectedGenres([]);
  };

  const applySuggestedGenre = (genre) => {
    const nextGenres = selectedGenres.includes(genre)
      ? selectedGenres
      : [...selectedGenres, genre];

    setSelectedGenres(nextGenres);
    setShowSearchResult(false);
    navigate(`/genres?genres=${encodeURIComponent(nextGenres.join(","))}`);
  };

  const isActivePath = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${isScrolled ? "scrolled" : ""}`}>
      <div className="navbar__desktop">
        <div className="navbar__content">
          <div className="navbar__content--logo">
            <Link to="/" className="navbar__logo-link">
              <img
                src="/logo.png"
                alt="ClipDam18"
                className="navbar__logo-img"
              />
            </Link>
          </div>

          <ul className="navbar__content--links">
            {visibleLinks.map((link, index) => (
              <li key={index}>
                <Link
                  to={link.path}
                  className={isActivePath(link.path) ? "active" : ""}
                >
                  {link.name}
                </Link>
              </li>
            ))}

            <li
              ref={genreBoxRef}
              className="navbar__genre-menu navbar__genre-menu--mega"
            >
              <button
                type="button"
                className={`navbar__genre-trigger ${
                  showGenreDropdown ? "active" : ""
                }`}
                onClick={() => {
                  ensureGenresLoaded();
                  setShowGenreDropdown((prev) => !prev);
                }}
              >
                Thể loại
                <FaChevronDown
                  className={`navbar__genre-icon ${
                    showGenreDropdown ? "open" : ""
                  }`}
                />
              </button>

              <div
                className={`navbar__genre-mega ${
                  showGenreDropdown ? "show" : ""
                }`}
              >
                <div className="navbar__genre-mega-header">
                  <div>
                    <h3>Khám phá theo thể loại</h3>
                    <p>Lọc nội dung nhanh theo gu của bạn</p>
                  </div>

                  <button
                    type="button"
                    className="navbar__genre-close"
                    onClick={() => setShowGenreDropdown(false)}
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="navbar__genre-selected">
                  {selectedGenres.length > 0 ? (
                    selectedGenres.map((genre, index) => (
                      <span key={index} className="navbar__genre-chip">
                        {genre}
                      </span>
                    ))
                  ) : (
                    <span className="navbar__genre-placeholder">
                      Chưa chọn thể loại nào
                    </span>
                  )}
                </div>

                <div className="navbar__genre-mega-grid">
                  {sortedGenres.length > 0 ? (
                    sortedGenres.map((genre, index) => {
                      const active = selectedGenres.includes(genre);

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`navbar__genre-card ${
                            active ? "active" : ""
                          }`}
                          onClick={() => toggleGenre(genre)}
                        >
                          <span className="navbar__genre-dot" />
                          <span>{genre}</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="navbar__genre-empty">Chưa có thể loại</div>
                  )}
                </div>

                <div className="navbar__genre-actions">
                  <button
                    type="button"
                    className="navbar__genre-btn navbar__genre-btn--ghost"
                    onClick={clearGenres}
                  >
                    Xóa chọn
                  </button>

                  <button
                    type="button"
                    className="navbar__genre-btn navbar__genre-btn--primary"
                    onClick={applyGenres}
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div className="navbar__footer">
          <div className="navbar__footer--container" ref={searchBoxRef}>
            <div className="navbar__footer--search">
              <FaSearch />

              <input
                type="text"
                placeholder="Tìm phim, thể loại, mô tả..."
                value={searchedInput}
                onChange={searchMovieHandler}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => {
                  if (searchedInput.trim()) setShowSearchResult(true);
                }}
              />

              {searchedInput && (
                <button
                  type="button"
                  className="navbar__search-clear"
                  onClick={clearSearchHandler}
                  aria-label="clear-search"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {showSearchResult && searchedInput.trim() && (
              <div className="navbar__search-panel">
                {keywords.length > 0 && (
                  <div className="navbar__search-section">
                    <div className="navbar__search-section-title">
                      Từ khoá liên quan
                    </div>
                    <div className="navbar__search-tags-wrap">
                      {keywords.map((kw, index) => (
                        <button
                          key={index}
                          type="button"
                          className="navbar__search-tag"
                          onClick={() => applySuggestedGenre(kw)}
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="navbar__search-section">
                  <div className="navbar__search-section-title navbar__search-section-title--result">
                    {suggestLoading ? "Đang tìm..." : "Kết quả gợi ý"}
                  </div>

                  <div className="navbar__search-results">
                    {suggestions.length > 0 ? (
                      suggestions.map((movie) => (
                        <Link
                          key={movie._id}
                          to={`/movie/${movie.slug || movie._id}`}
                          className="navbar__search-item"
                          onClick={() => setShowSearchResult(false)}
                        >
                          <div className="navbar__search-thumb">
                            <img
                              src={movie.poster || movie.backdrop || FALLBACK_POSTER}
                              alt={movie.title || "movie"}
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_POSTER;
                              }}
                            />
                          </div>

                          <div className="navbar__search-info">
                            <h4>{movie.title}</h4>
                            <span>
                              {movie.year || "N/A"} •{" "}
                              {(movie.genre || []).slice(0, 1).join("") || "Video"}
                            </span>
                            <p>{movie.description || "Không có mô tả"}</p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="navbar__search-empty">
                        Không tìm thấy kết quả phù hợp
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isMobileSite() && (
            <a
              href={`https://www.clipdam18.com${window.location.pathname}${window.location.search}`}
              className="navbar__desktop-link"
              onClick={() => setPreferDesktop(true)}
              title="Xem bản đầy đủ"
            >
              🖥️
            </a>
          )}

          <button
            type="button"
            className="navbar__theme-toggle"
            onClick={toggleTheme}
            aria-label="Chuyển giao diện"
            title={theme === "dark" ? "Chế độ sáng" : "Chế độ tối"}
          >
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          {user && user.token ? (
            <div className="navbar__user-menu" ref={userMenuRef}>
              <button
                className="navbar__footer--logout navbar__footer--user"
                onClick={() => setShowUserMenu((v) => !v)}
                title="Tài khoản"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="navbar__user-avatar" />
                ) : (
                  <FaUserCircle />
                )}
              </button>
              {showUserMenu && (
                <div className="navbar__user-dropdown">
                  <Link
                    to="/profile"
                    className="navbar__user-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaUser />
                    <span>Hồ sơ</span>
                  </Link>
                  <Link
                    to="/change-password"
                    className="navbar__user-item"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <FaKey />
                    <span>Đổi mật khẩu</span>
                  </Link>
                  <button
                    className="navbar__user-item navbar__user-item--logout"
                    onClick={() => { setShowUserMenu(false); logOutHandler(); }}
                  >
                    <FaPowerOff />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="navbar__footer--login"
              onClick={() => navigate("/login")}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
