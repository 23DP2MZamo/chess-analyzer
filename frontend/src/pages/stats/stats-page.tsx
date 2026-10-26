import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

type Stats = {
  totalGames: number;
  wins: number;
  draws: number;
  losses: number;
  winrate: number;
  averageAccuracy: number | null;
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/games/stats')
      .then(setStats)
      .catch((caughtError) =>
        setError(
          caughtError instanceof ApiError ? caughtError.message : 'Could not load statistics.',
        ),
      );
  }, []);

  return (
    <main className="min-h-screen bg-[#1b1b1b] px-5 py-12 font-sans text-[#e8e5df] sm:px-[7vw] sm:py-16">
      <Link
        className="text-base tracking-[.14em] text-[#c8c2b9] no-underline hover:text-white"
        to="/home"
      >
        ← Home
      </Link>
      <p className="mt-10 text-sm tracking-[.2em] text-[#d47440]">IMPROVEMENT</p>
      <h1 className="mt-3 text-5xl font-light tracking-[-.04em] sm:text-7xl">Your progress</h1>
      {error && (
        <p
          className="mt-8 border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}
      {!stats && !error ? (
        <p className="mt-10 text-sm text-[#c8c2b9]" role="status">
          Loading statistics...
        </p>
      ) : (
        stats && (
          <section className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Games', stats.totalGames.toString()],
              ['Wins', stats.wins.toString()],
              ['Draws', stats.draws.toString()],
              ['Losses', stats.losses.toString()],
              ['Winrate', `${stats.winrate.toFixed(1)}%`],
            ].map(([label, value]) => (
              <article className="border border-white/10 bg-white/[.025] p-6" key={label}>
                <p className="text-sm tracking-[.16em] text-[#c8c2b9] uppercase">{label}</p>
                <p className="mt-5 text-4xl font-light text-[#e8e5df]">{value}</p>
              </article>
            ))}
            <article className="border border-white/10 bg-white/[.025] p-6 sm:col-span-2 lg:col-span-5">
              <p className="text-sm tracking-[.16em] text-[#c8c2b9] uppercase">Average accuracy</p>
              <p className="mt-5 text-4xl font-light text-[#e8e5df]">
                {stats.averageAccuracy == null
                  ? 'Not analyzed'
                  : `${stats.averageAccuracy.toFixed(1)}%`}
              </p>
            </article>
          </section>
        )
      )}
    </main>
  );
}
