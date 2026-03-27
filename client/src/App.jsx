import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import Search from "./pages/Search";
import AdminNewMovie from "./pages/AdminNewMovie";
import LatestMovies from "./pages/LatestMovies";
import TopViewedMovies from "./pages/TopViewedMovies";
import GenreMovies from "./pages/GenreMovies";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyList from "./pages/MyList";
import ContinueWatching from "./pages/ContinueWatching";

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="/search" element={<Search />} />
      <Route
        path="/admin/new-movie"
        element={
          user?.isAdmin ? <AdminNewMovie /> : <Navigate to="/login" replace />
        }
      />
      <Route path="/latest" element={<LatestMovies />} />
      <Route path="/top-viewed" element={<TopViewedMovies />} />
      <Route path="/genres" element={<GenreMovies />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/my-list" element={<MyList />} />
      <Route path="/continue-watching" element={<ContinueWatching />} />
    </Routes>
  );
}

export default App;