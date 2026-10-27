import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
type User = { username: string; role: string } | null;
export default function SiteNav({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const links = [
    ['/profile', 'Profile'],
    ['/games', 'Games'],
    ['/analyze', 'Analyze'],
    ['/settings', 'Settings'],
    ...(user?.role === 'ADMIN' ? [['/admin', 'Admin']] : []),
  ];
  async function logout() {
    setPending(true);
    setError('');
    try {
      await api('/auth/logout', { method: 'POST' });
      navigate('/home', { replace: true });
    } catch {
      setError('Could not log out. Try again.');
    } finally {
      setPending(false);
    }
  }
  const navLink = ({ isActive }: { isActive: boolean }) =>
    'flex min-h-12 items-center border-b-2 px-2 py-2 text-sm transition hover:text-white focus-visible:outline-2 focus-visible:outline-[#eca574] ' +
    (isActive ? 'border-[#e3925d] text-[#f2b488]' : 'border-transparent text-[#c3bcb3]');
  return (
    <header className="sticky top-0 z-30 border-b border-white/15 bg-[#1c1b1a]/95 font-sans text-[#efebe5] backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-7xl flex-wrap items-center justify-between gap-x-5 px-5 sm:px-8">
        <Link
          to="/home"
          className="flex min-h-14 items-center gap-3 text-sm tracking-[.14em] hover:text-[#f2b488]"
          aria-label="Chess Analyzer home"
        >
          <span aria-hidden="true" className="text-2xl">
            ♞
          </span>
          CHESS ANALYZER
        </Link>
        <button
          type="button"
          className="flex min-h-12 min-w-12 items-center justify-center border border-white/20 sm:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          aria-controls="account-navigation"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d={open ? 'M5 5 19 19M5 19 19 5' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <nav
          id="account-navigation"
          aria-label="Account navigation"
          className={
            (open ? 'flex' : 'hidden') +
            ' w-full flex-col gap-x-5 border-t border-white/10 pb-4 sm:flex sm:w-auto sm:flex-row sm:items-center sm:border-0 sm:pb-0'
          }
        >
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={navLink} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
          <button
            type="button"
            className="min-h-12 text-left text-sm text-[#bcb4aa] hover:text-white disabled:opacity-50"
            onClick={() => void logout()}
            disabled={pending}
          >
            {pending ? 'Logging out…' : 'Log out'}
          </button>
        </nav>
      </div>
      {error && (
        <p role="alert" className="mx-auto max-w-7xl px-5 pb-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </header>
  );
}
