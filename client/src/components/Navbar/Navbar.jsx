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
import { signOutFromFirebase } from "../../services/authService";
import { logoutReducer } from "../../store/Slice/auth-slice";
import { searchMovies, clearSearch } from "../../store/Slice/movie-slice";
import { onAuthStateChanged } from "firebase/auth";
import auth from "../../utils/firebase-config";
import toast from "react-hot-toast";
import SearchMovie from "../SearchMovie/SearchMovie";

const Navbar = ({ isScrolled }) => {
  const links = [
    { name: "Trang Chủ", path: "/" },
    { name: "Mới cập nhật", path: "/latest" },
    { name: "Top lượt xem", path: "/top-viewed" },
    { name: "Thư Viện", path: "/my-list" },
  ];

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const genreBoxRef = useRef(null);
  const searchBoxRef = useRef(null);

  const movies = useSelector((state) => state.movie.movies || []);

  const [user, setUser] = useState(null);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [searchedInput, setSearchedInput] = useState("");
  const [debouncedInput, setDebouncedInput] = useState("");
  const [showSearchResult, setShowSearchResult] = useState(false);
  const [genres, setGenres] = useState([]);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/movies/genres");
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

  const logOutHandler = async () => {
    dispatch(logoutReducer());
    await signOutFromFirebase();

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

  return (
    <nav
      className={`${isScrolled ? "scrolled" : ""} navbar ${
        isMenuActive ? "active" : ""
      }`}
      onMouseEnter={() => setIsMenuActive(true)}
      onMouseLeave={() => setIsMenuActive(false)}
    >
      <div className="navbar__desktop">
        <div className="navbar__content">
          <div className="navbar__content--logo">
            <Link to="/" className="navbar__logo-link">
              <h1>Dam18</h1>
            </Link>
          </div>

          <ul className="navbar__content--links">
            {links.map((link, index) => (
              <li key={index}>
                <Link to={link.path}>{link.name}</Link>
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

              <div className={`navbar__genre-mega ${showGenreDropdown ? "show" : ""}`}>
                <div className="navbar__genre-mega-header">
                  <div>
                    <h3>Chọn nhiều thể loại</h3>
                    <p>Lọc nội dung theo một hoặc nhiều thể loại</p>
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
                          className={`navbar__genre-card ${active ? "active" : ""}`}
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
                  <div className="navbar__search-tags">
                    <div className="navbar__search-tags-title">Gợi ý thể loại</div>
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

                <SearchMovie
                  showSearchResult={showSearchResult}
                  setShowSearchResult={setShowSearchResult}
                  searchedInput={searchedInput}
                  selectedGenres={selectedGenres}
                  quickSuggestions={quickSuggestions}
                />
              </div>
            )}
          </div>

          {user ? (
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