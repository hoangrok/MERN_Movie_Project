import React from "react";
import { Routes, Route } from "react-router-dom";
import GuardedRoute from "./GuardedRoute";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import MovieDetail from "../pages/MovieDetail";
import MoviePlayer from "../pages/MoviePlayer";
import Search from "../pages/Search";
import Movies from "../pages/Movies";
import TvShows from "../pages/TvShows";
import NewPopular from "../pages/NewPopular";
import MyList from "../pages/MyList";
import Trailer from "../pages/Trailer";
import LatestMovies from "../pages/LatestMovies";
import TopViewedMovies from "../pages/TopViewedMovies";
import GenreMovies from "../pages/GenreMovies";
import AdminNewMovie from "../pages/AdminNewMovie";

const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="/watch/:id" element={<MoviePlayer />} />
      <Route path="/search" element={<Search />} />
      <Route path="/latest" element={<LatestMovies />} />
      <Route path="/top-viewed" element={<TopViewedMovies />} />
      <Route path="/genres" element={<GenreMovies />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        path="/my-list"
        element={
          <GuardedRoute>
            <MyList />
          </GuardedRoute>
        }
      />

      <Route
        path="/admin/new-movie"
        element={
          <GuardedRoute>
            <AdminNewMovie />
          </GuardedRoute>
        }
      />

      {/* Old pages - nếu vẫn muốn giữ */}
      <Route
        path="/movies"
        element={
          <GuardedRoute>
            <Movies />
          </GuardedRoute>
        }
      />
      <Route
        path="/tv-shows"
        element={
          <GuardedRoute>
            <TvShows />
          </GuardedRoute>
        }
      />
      <Route
        path="/new-popular"
        element={
          <GuardedRoute>
            <NewPopular />
          </GuardedRoute>
        }
      />
      <Route
        path="/trailer"
        element={
          <GuardedRoute>
            <Trailer />
          </GuardedRoute>
        }
      />

      <Route path="*" element={<div>404 Not Found</div>} />
    </Routes>
  );
};

export default AppRouter;