import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const Home = lazy(() => import("./pages/Home"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Search = lazy(() => import("./pages/Search"));
const AdminNewMovie = lazy(() => import("./pages/AdminNewMovie"));
const LatestMovies = lazy(() => import("./pages/LatestMovies"));
const TopViewedMovies = lazy(() => import("./pages/TopViewedMovies"));
const GenreMovies = lazy(() => import("./pages/GenreMovies"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const MyList = lazy(() => import("./pages/MyList"));
const ContinueWatching = lazy(() => import("./pages/ContinueWatching"));

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
}

export default App;