import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/base-layout1';
import RequireAuth from './layouts/require-auth';
import User from './pages/home/home-page';
import LoginPage from './pages/auth/login-page';
import SignupPage from './pages/auth/signup-page';
import ProfilePage from './pages/profile/profile-page';
import ToolPage from './pages/tool-page';
import GameReviewPage from './pages/game-review-page';
import GamesPage from './pages/games/games-page';
import StatsPage from './pages/stats/stats-page';
import AdminPage from './pages/admin/admin-page';
import RequireAdmin from './layouts/require-admin';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<User />} />
          <Route element={<RequireAuth />}>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/analyze" element={<ToolPage />} />
            <Route path="/analyze/games/:gameId" element={<GameReviewPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/stats" element={<StatsPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
