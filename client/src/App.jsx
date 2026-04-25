import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdSlot from "./components/Ads/AdSlot";
import FeedbackWidget from "./components/FeedbackWidget/FeedbackWidget";

const Home = lazy(() => import("./pages/Home"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Search = lazy(() => import("./pages/Search"));
const AdminNewMovie = lazy(() => import("./pages/AdminNewMovie"));
const AdminAds = lazy(() => import("./pages/AdminAds"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback"));
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
        <Route
          path="/admin/ads"
          element={user?.isAdmin ? <AdminAds /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/feedback"
          element={user?.isAdmin ? <AdminFeedback /> : <Navigate to="/login" replace />}
        />
        <Route path="/latest" element={<LatestMovies />} />
        <Route path="/top-viewed" element={<TopViewedMovies />} />
        <Route path="/genres" element={<GenreMovies />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-list" element={<MyList />} />
        <Route path="/continue-watching" element={<ContinueWatching />} />
      </Routes>
      <AdSlot placement="floating_bottom" variant="floating" />
      <FeedbackWidget />
    </Suspense>
  );
}

export default App;
