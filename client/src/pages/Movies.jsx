import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Loader from "../components/Loader/Loader";
import Navbar from "../components/Navbar/Navbar";
import Slider from "../components/Slider/Slider";
import { fetchMovies } from "../store/Slice/movie-slice";
import "../assets/styles/Movies.scss";
import NotFound from "../components/NotFound/NotFound";

const Movies = () => {
  const dispatch = useDispatch();

  const movies = useSelector((state) => state.movie.movies || []);
  const status = useSelector((state) => state.movie.status);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    dispatch(fetchMovies({ type: "movie" }));
  }, [dispatch]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(window.scrollY > 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isLoading = status === "loading" || status === "pending";

  return (
    <div>
      {isLoading && <Loader />}
      <Navbar isScrolled={isScrolling} isGenresActive={true} />

      {movies.length > 0 ? (
        <div className="moviesPage">
          <Slider movies={movies} />
        </div>
      ) : !isLoading ? (
        <NotFound />
      ) : null}
    </div>
  );
};

export default Movies;
