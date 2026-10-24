import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../lib/use-current-user';

export default function RequireAuth() {
  const [retry, setRetry] = useState(0);
  const access = useCurrentUser(retry);
  const location = useLocation();

  if (access.status === 'anonymous') {
    const destination = location.pathname + location.search + location.hash;
    return <Navigate to={'/login?redirect=' + encodeURIComponent(destination)} replace />;
  }

  if (access.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-[#202020] px-6 font-sans text-stone-100">
        <div className="grid max-w-md gap-5 border border-white/10 bg-[#1c1c1c] p-8">
          <p role="alert">Could not verify your session. Please try again.</p>
          <button
            type="button"
            className="min-h-12 border border-[#c56531] bg-[#a94e22] px-5"
            onClick={() => {
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </button>
          <Link className="text-sm text-stone-400 hover:text-white" to="/home">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (access.status === 'authenticated') return <Outlet />;

  return (
    <main className="grid min-h-screen place-items-center bg-[#202020] px-6 font-sans text-stone-400">
      <p role="status">Checking your session...</p>
    </main>
  );
}
