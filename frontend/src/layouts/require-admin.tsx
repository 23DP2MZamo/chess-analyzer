import SiteNav from '../components/site-nav';
import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../lib/use-current-user';

export default function RequireAdmin() {
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
          <p role="alert">Neizdevās pārbaudīt sesiju. Mēģiniet vēlreiz.</p>
          <button
            type="button"
            className="min-h-12 border border-[#c56531] bg-[#a94e22] px-5"
            onClick={() => setRetry((value) => value + 1)}
          >
            Mēģināt vēlreiz
          </button>
          <Link className="text-sm text-stone-400 hover:text-white" to="/home">
            Atpakaļ uz sākumlapu
          </Link>
        </div>
      </main>
    );
  }

  if (access.status === 'authenticated') {
    if (access.user?.role === 'ADMIN')
      return (
        <>
          <SiteNav user={access.user} />
          <Outlet context={access.user} />
        </>
      );
    return (
      <main className="grid min-h-screen place-items-center bg-[#202020] px-6 font-sans text-stone-100">
        <div className="grid max-w-md gap-5 border border-white/10 bg-[#1c1c1c] p-8">
          <p className="text-xs tracking-[.18em] text-[#d47440] uppercase">Piekļuve liegta</p>
          <h1 className="text-3xl font-light">Šī sadaļa paredzēta administratoriem.</h1>
          <Link
            className="text-sm text-stone-300 underline decoration-[#c56531] underline-offset-4 hover:text-white"
            to="/home"
          >
            Atgriezties sākumlapā
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#202020] px-6 font-sans text-stone-400">
      <p role="status">Pārbauda administratora piekļuvi…</p>
    </main>
  );
}
