import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader/Loader";
import Navbar from "../components/Navbar/Navbar";
import "../assets/styles/Movies.scss";
import NotFound from "../components/NotFound/NotFound";
import Card from "../components/Card/Card";
import axios from "axios";
import { API_URL } from "../utils/api";

const MyList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const LikedMovies = useSelector((state) => state.movie.likedMovies);
  const status = useSelector((state) => state.movie.status);
  const { user } = useSelector((state) => state.auth);

  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (!user || !user.token) {
      navigate("/login", { replace: true });
      return;
    }

    const fetchLikedMovies = async () => {
      try {
        dispatch({ type: "movie/getLikedMoviesStart" });

        const { data } = await axios.get(`${API_URL}/users/liked`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        dispatch({
          type: "movie/getLikedMoviesSuccess",
          payload: data.movies || [],
        });
      } catch (error) {
        console.log("fetchLikedMovies error:", error.response?.data || error.message);

        if (error.response?.status === 401) {
          navigate("/login", { replace: true });
        }

        dispatch({
          type: "movie/getLikedMoviesFail",
        });
      }
    };

    fetchLikedMovies();
  }, [dispatch, navigate, user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(window.pageYOffset !== 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div>
      {status === "pending" && <Loader />}
      <Navbar isScrolled={isScrolling} />

      {LikedMovies?.length > 0 ? (
        <div className="myList">
          <h1 className="myList__title">My List</h1>
          <div className="myList__wrapper">
            {LikedMovies.map((movie, index) => {
              return <Card movie={movie} key={index} isLiked={true} />;
            })}
          </div>
        </div>
      ) : (
        <NotFound />
      )}
    </div>
  );
};

export default MyList;