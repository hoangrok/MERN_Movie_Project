import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.scss";
import {
  FaPowerOff,
  FaSearch,
  FaChevronDown,
  FaTimes,
} from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logoutReducer } from "../../store/Slice/auth-slice";
import { searchMovies, clearSearch } from "../../store/Slice/movie-slice";
import toast from "react-hot-toast";
import { API_URL } from "../../utils/api";

const FALLBACK_POSTER =
  "https://dummyimage.com/200x300/222/ffffff&text=No+Image";

const Navbar = ({ isScrolled }) => {
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

  const movies = useSelector((state) => state.movie.movies || []);
  const searchedMovies = useSelector((state) => state.movie.searchedMovies || []);
  const { user } = useSelector((state) => state.auth);
  const visibleLinks = user?.isAdmin
    ? [...links, { name: "Ads", path: "/admin/ads" }, { name: "Feedback", path: "/admin/feedback" }]
    : links;

  const [searchedInput, setSearchedInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [genres, setGenres] = useState([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const res = await fetch(`${API_URL}/movies/genres`);
        const data = await res.json();

        if (data.success) {
          setGenres(data.items || []);
        }
      } catch (err) {
        console.error("loadGenres error:", err);
      }
    };

    loadGenres();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (genreBoxRef.current && !genreBoxRef.current.contains(e.target)) {
        setShowGenreDropdown(false);
      }

      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSearchResult(false);
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
    const timer = setTimeout(() => {
      setDebouncedInput(searchedInput.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchedInput]);

  useEffect(() => {
    if (!debouncedInput) {
      dispatch(clearSearch());
      return;
    }

    dispatch(searchMovies({ query: debouncedInput }));
  }, [debouncedInput, dispatch]);

  const suggestedGenres = useMemo(() => {
    if (!searchedInput.trim()) return [];

    const keyword = searchedInput.toLowerCase().trim();

    return genres
      .filter((genre) => genre.toLowerCase().includes(keyword))
      .slice(0, 5);
  }, [searchedInput, genres]);

  const quickSuggestions = useMemo(() => {
    if (!searchedInput.trim()) return [];

    const keyword = searchedInput.toLowerCase().trim();

    return movies
      .filter((movie) => {
        const title = String(movie.title || "").toLowerCase();
        const desc = String(movie.description || "").toLowerCase();
        const movieGenres = Array.isArray(movie.genres)
          ? movie.genres.join(" ").toLowerCase()
          : Array.isArray(movie.genre)
          ? movie.genre.join(" ").toLowerCase()
          : String(movie.genre || "").toLowerCase();

        return (
          title.includes(keyword) ||
          desc.includes(keyword) ||
          movieGenres.includes(keyword)
        );
      })
      .slice(0, 6);
  }, [searchedInput, movies]);

  const resultsToShow =
    searchedMovies.length > 0 ? searchedMovies : quickSuggestions;

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
    setSearchedInput(value);
    setShowSearchResult(!!value.trim());
  };

  const clearSearchHandler = () => {
    setSearchedInput("");
    setDebouncedInput("");
    setShowSearchResult(false);
    dispatch(clearSearch());
  };

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
              <h1>Dam18</h1>
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
                onClick={() => setShowGenreDropdown((prev) => !prev)}
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
                  {genres.length > 0 ? (
                    genres.map((genre, index) => {
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
                {suggestedGenres.length > 0 && (
                  <div className="navbar__search-section">
                    <div className="navbar__search-section-title">
                      Gợi ý thể loại
                    </div>

                    <div className="navbar__search-tags-wrap">
                      {suggestedGenres.map((genre, index) => (
                        <button
                          key={index}
                          type="button"
                          className="navbar__search-tag"
                          onClick={() => applySuggestedGenre(genre)}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="navbar__search-section">
                  <div className="navbar__search-section-title navbar__search-section-title--result">
                    Kết quả tìm kiếm
                  </div>

                  <div className="navbar__search-results">
                    {resultsToShow.length > 0 ? (
                      resultsToShow.map((movie) => (
                        <Link
                          key={movie._id}
                          to={`/movie/${movie._id}`}
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

          {user && user.token ? (
            <button
              className="navbar__footer--logout"
              onClick={logOutHandler}
              title="Đăng xuất"
            >
              <FaPowerOff />
            </button>
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
