import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import MovieDetail from "./pages/MovieDetail";
import Search from "./pages/Search";
import AdminNewMovie from "./pages/AdminNewMovie";
import LatestMovies from "./pages/LatestMovies";
import TopViewedMovies from "./pages/TopViewedMovies";
import GenreMovies from "./pages/GenreMovies";
import Login from "./pages/Login";
import Register from "./pages/Register";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="/search" element={<Search />} />
      <Route path="/admin/new-movie" element={<AdminNewMovie />} />
      <Route path="/latest" element={<LatestMovies />} />
      <Route path="/top-viewed" element={<TopViewedMovies />} />
      <Route path="/genres" element={<GenreMovies />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}

export default App;