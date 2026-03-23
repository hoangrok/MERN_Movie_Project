import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";
import "./SearchMovie.scss";

const FALLBACK_POSTER =
  "https://dummyimage.com/80x110/222/ffffff&text=No+Image";

const normalizeText = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const SearchMovie = ({
  searchedInput,
  setShowSearchResult,
  showSearchResult,
  selectedGenres = [],
  quickSuggestions = [],
}) => {
  const { searchedMovies = [] } = useSelector((state) => state.movie);

  const filteredMovies = useMemo(() => {
    let result =
      searchedMovies.length > 0 ? [...searchedMovies] : [...quickSuggestions];

    if (selectedGenres.length > 0) {
      result = result.filter((movie) => {
        const movieGenres = movie.genres || movie.genre || [];
        return selectedGenres.some((selected) =>
          movieGenres.some((g) =>
            normalizeText(g).includes(normalizeText(selected))
          )
        );
      });
    }

    const query = normalizeText(searchedInput);

    if (!query) return result.slice(0, 8);

    const startsWith = [];
    const includes = [];

    result.forEach((movie) => {
      const title = normalizeText(movie.title || movie.name || "");
      const description = normalizeText(movie.description || movie.overview || "");
      const movieGenres = normalizeText(
        Array.isArray(movie.genres)
          ? movie.genres.join(" ")
          : Array.isArray(movie.genre)
          ? movie.genre.join(" ")
          : movie.genre || ""
      );

      if (
        title.startsWith(query) ||
        movieGenres.startsWith(query) ||
        description.startsWith(query)
      ) {
        startsWith.push(movie);
      } else if (
        title.includes(query) ||
        description.includes(query) ||
        movieGenres.includes(query)
      ) {
        includes.push(movie);
      }
    });

    return [...startsWith, ...includes].slice(0, 8);
  }, [searchedMovies, quickSuggestions, searchedInput, selectedGenres]);

  if (!showSearchResult || !searchedInput?.trim()) return null;

  return (
    <div className="search">
      <div className="search__header">
        <FaSearch />
        <span>Kết quả tìm kiếm</span>
      </div>

      {filteredMovies.length > 0 ? (
        <div className="search__list">
          {filteredMovies.map((movie) => {
            const genres = movie.genres || movie.genre || [];
            const genreText = Array.isArray(genres)
              ? genres.slice(0, 2).join(" • ")
              : genres;

            return (
              <Link
                key={movie._id}
                to={`/movie/${movie._id}`}
                className="search__movie"
                onClick={() => setShowSearchResult(false)}
              >
                <img
                  className="search__movie-poster"
                  src={movie.poster || movie.backdrop || FALLBACK_POSTER}
                  alt={movie.title}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_POSTER;
                  }}
                />

                <div className="search__movie-info">
                  <h4>{movie.title || movie.name}</h4>
                  <p>
                    {movie.year || "N/A"}
                    {genreText ? ` • ${genreText}` : ""}
                  </p>
                  {(movie.description || movie.overview) && (
                    <span>
                      {(movie.description || movie.overview).slice(0, 70)}
                      {(movie.description || movie.overview).length > 70
                        ? "..."
                        : ""}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="search__empty">
          <FaSearch />
          <p>Không tìm thấy nội dung phù hợp</p>
          <span>Thử nhập tên phim, thể loại hoặc từ khóa khác</span>
        </div>
      )}
    </div>
  );
};

export default SearchMovie;