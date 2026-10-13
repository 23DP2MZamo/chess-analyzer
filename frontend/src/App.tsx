import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/base-layout1';
import User from './pages/home/home-page';
import LoginPage from './pages/auth/login-page';
import SignupPage from './pages/auth/signup-page';
import ProfilePage from './pages/profile/profile-page';
import ToolPage from './pages/tool-page';
import GamesPage from './pages/games/games-page';
import StatsPage from './pages/stats/stats-page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<MainLayout />}>
          <Route path="/home" element={<User />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analyze" element={<ToolPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
