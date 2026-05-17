import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import useDeferredMount from "./hooks/useDeferredMount";
import VpnNotice from "./components/VpnNotice/VpnNotice";
import ExoInterstitial from "./components/Ads/ExoInterstitial";
import { initScrollReveal } from "./utils/scrollReveal";
import PageLoader from "./components/PageLoader/PageLoader";

const Home = lazy(() => import("./pages/Home"));
const MovieDetail = lazy(() => import("./pages/MovieDetail"));
const Search = lazy(() => import("./pages/Search"));
const AdminNewMovie = lazy(() => import("./pages/AdminNewMovie"));
const AdminAds = lazy(() => import("./pages/AdminAds"));
const AdminFeedback = lazy(() => import("./pages/AdminFeedback"));
const LatestMovies = lazy(() => import("./pages/LatestMovies"));
const TopViewedMovies = lazy(() => import("./pages/TopViewedMovies"));
const WorldHub = lazy(() => import("./pages/WorldHub"));
const GenreMovies = lazy(() => import("./pages/GenreMovies"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const MyList = lazy(() => import("./pages/MyList"));
const ContinueWatching = lazy(() => import("./pages/ContinueWatching"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdSlot = lazy(() => import("./components/Ads/AdSlot"));
const FeedbackWidget = lazy(() => import("./components/FeedbackWidget/FeedbackWidget"));
const TelegramWidget = lazy(() => import("./components/TelegramWidget/TelegramWidget"));

function AppRoutes() {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  useEffect(() => {
    initScrollReveal();
  }, [location.pathname]);

  return (
    <div className="page-enter">
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
        <Route path="/the-gioi" element={<WorldHub />} />
        <Route path="/genres" element={<GenreMovies />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/my-list" element={<MyList />} />
        <Route path="/continue-watching" element={<ContinueWatching />} />
        <Route
          path="/change-password"
          element={user ? <ChangePassword /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={user ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/admin/the-gioi"
          element={
            user?.isAdmin ? (
              <AdminNewMovie forcedContentArea="world" />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
<Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function App() {
  const showDeferredChrome = useDeferredMount({ delay: 1400 });

  return (
    <Suspense fallback={<PageLoader />}>
      <AppRoutes />
      <VpnNotice />
      <ExoInterstitial />
      {showDeferredChrome ? (
        <>
          <AdSlot placement="floating_bottom" variant="floating" defer />
          <FeedbackWidget />
          <TelegramWidget />
        </>
      ) : null}
    </Suspense>
  );
}

export default App;
