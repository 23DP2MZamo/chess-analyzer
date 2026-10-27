import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import LinkedAccountsPanel, { type LinkedAccount } from '../../components/linked-accounts-panel';
import RatingChart, { type RatingSeries } from '../../components/rating-chart';
import ArrowIcon from '../../components/arrow-icon';
import { api, ApiError } from '../../lib/api';
type RecentGame = {
  id: string;
  platform: string;
  opponent: string;
  opponentRating: number | null;
  outcome: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN';
  format: string;
  mode: string;
  timeControl: string | null;
  playedAt: string;
  moveCount: number | null;
  opening: { eco: string | null; name: string | null } | null;
};
type Dashboard = {
  user: { id: string; username: string; createdAt: string; role: string };
  accounts: LinkedAccount[];
  summary: { total: number; wins: number; losses: number; draws: number; winRate: number | null };
  ratingSeries: RatingSeries[];
  recentGames: RecentGame[];
};
const platformNames = { CHESSCOM: 'Chess.com', LICHESS: 'Lichess', ALL: 'Global' };
const results = { WIN: 'Win', LOSS: 'Loss', DRAW: 'Draw', UNKNOWN: 'Unidentified player' };
export default function ProfilePage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const platform =
    params.get('platform') && Object.hasOwn(platformNames, params.get('platform')!)
      ? params.get('platform')!
      : 'CHESSCOM';
  const format = ['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE'].includes(
    params.get('format') ?? '',
  )
    ? params.get('format')!
    : 'BLITZ';
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const [response, setResponse] = useState<{
    key: string;
    data?: Dashboard;
    error?: string;
  } | null>(null);
  const key = platform + ':' + format + ':' + revision;
  const data = response?.key === key ? response.data : undefined;
  const loading = response?.key !== key;
  useEffect(() => {
    let active = true;
    api<Dashboard>(`/user/me/dashboard?platform=${platform}&format=${format}`)
      .then((value) => {
        if (active) setResponse({ key, data: value });
      })
      .catch((caught) => {
        if (active)
          setResponse({
            key,
            error:
              caught instanceof ApiError
                ? caught.message
                : 'Could not load your profile. Try again.',
          });
      });
    return () => {
      active = false;
    };
  }, [platform, format, key]);
  useEffect(() => {
    if (data && location.hash === '#connections') {
      const target = document.getElementById('connections');
      target?.scrollIntoView?.({ block: 'start' });
      target?.focus({ preventScroll: true });
    }
  }, [data, location.hash]);
  function change(name: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set(name, value);
      return next;
    });
  }
  const account = data?.accounts.find((item) => item.platform === platform);
  return (
    <main className="min-h-screen bg-[#1c1b1a] px-5 py-9 font-sans text-[#eee9e2] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs tracking-[.2em] text-[#dda077]">YOUR CHESS, IN ONE PLACE</p>
            <h1 className="mt-3 text-4xl font-light tracking-[-.035em]">Your profile</h1>
          </div>
          <Link
            to="/settings"
            className="flex min-h-12 items-center gap-2 rounded-sm border border-white/20 px-5 text-sm text-[#cfc5b8] transition hover:border-[#e3a377] hover:text-white"
          >
            Account settings <ArrowIcon />
          </Link>
        </div>
        <div
          role="tablist"
          aria-label="Profile platform"
          className="mb-5 flex gap-1 border-b border-white/15"
        >
          {Object.entries(platformNames).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={platform === value}
              aria-controls="profile-panel"
              onClick={() => change('platform', value)}
              className={
                'min-h-16 flex-1 cursor-pointer border-b-2 px-2 text-lg transition sm:text-2xl ' +
                (platform === value
                  ? 'border-[#e9995d] text-[#f1d3bc]'
                  : 'border-transparent text-[#aaa298] hover:text-white')
              }
            >
              {label}
            </button>
          ))}
        </div>
        {notice && (
          <p
            role="status"
            className="mb-5 rounded-sm border border-emerald-400/25 bg-emerald-950/20 p-4 text-base text-emerald-100"
          >
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status" className="min-h-64 py-20 text-center text-base text-[#ccc2b4]">
            Loading your profile…
          </p>
        ) : !data ? (
          <div className="my-8 rounded-sm border border-red-400/30 p-6">
            <p role="alert" className="text-red-200">
              {response?.error}
            </p>
            <button
              className="mt-4 min-h-12 border border-white/25 px-5"
              onClick={() => setRevision((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section
              id="profile-panel"
              role="tabpanel"
              aria-label={platformNames[platform as keyof typeof platformNames] + ' profile'}
              className="rounded-md border border-white/15 bg-[#22211f] p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div
                    aria-hidden="true"
                    className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[#b9784a]/40 bg-[#3c2d21] text-lg text-[#f6c49e]"
                  >
                    {(account?.platformUsername ?? data.user.username).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="break-all text-2xl font-light sm:text-3xl">
                      {account?.platformUsername ?? data.user.username}
                    </h2>
                    <p className="mt-1 text-sm text-[#bfb4a5]">
                      {platform === 'ALL'
                        ? 'Combined imported history · all formats'
                        : account
                          ? `${platformNames[platform as keyof typeof platformNames]} · all formats`
                          : `${platformNames[platform as keyof typeof platformNames]} account not connected`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {data.ratingSeries.map((series) => (
                    <div key={series.platform} className="text-right">
                      <p className="text-xs uppercase tracking-[.12em] text-[#c0b4a4]">
                        {series.platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'}{' '}
                        {format.toLowerCase()}
                      </p>
                      <p className="mt-1 text-3xl font-light text-[#f2ba8e]">
                        {series.currentRating ?? '—'}{' '}
                        <span className="text-sm text-[#bfb4a5]">Elo</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-end justify-between gap-3">
                <h3 className="text-base text-[#e2d6c6]">Rating progress</h3>
                <label className="flex items-center gap-3 text-sm text-[#bfb4a5]">
                  Rating format
                  <select
                    value={format}
                    onChange={(event) => change('format', event.target.value)}
                    className="min-h-11 rounded-sm border border-white/20 bg-[#1b1b1a] px-3 text-sm text-[#eee]"
                  >
                    {['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE'].map((value) => (
                      <option key={value} value={value}>
                        {value[0] + value.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <RatingChart series={data.ratingSeries} />
              <p className="mt-3 text-sm leading-6 text-[#b9ad9c]">
                Latest recorded ratings from imported rated games, not live ratings.
                {platform === 'ALL' && ' Each platform has its own rating scale.'}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  ['Games', data.summary.total],
                  ['Wins', data.summary.wins],
                  ['Losses', data.summary.losses],
                  ['Draws', data.summary.draws],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-sm border border-white/15 bg-[#1c1b19] px-4 py-4"
                  >
                    <span className="text-sm text-[#c4b9a8]">{label}</span>
                    <span className="text-2xl font-light">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-[#c9bdad]">
                <span>
                  Win rate ·{' '}
                  {data.summary.winRate == null
                    ? 'No identified results yet'
                    : `${data.summary.winRate}% of identified results`}
                </span>
                <a href="#connections" className="min-h-11 py-2 text-[#edb18a] hover:text-white">
                  {account || (platform === 'ALL' && data.accounts.length)
                    ? 'Manage connections / import games'
                    : 'Connect account to get started'}{' '}
                  →
                </a>
              </div>
            </section>
            <section
              aria-labelledby="recent-title"
              className="mt-6 rounded-md border border-white/15 bg-[#22211f] p-5 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="recent-title" className="text-2xl font-light">
                  Last matches
                </h2>
                <Link to="/games" className="min-h-11 py-2 text-sm text-[#edb18a] hover:text-white">
                  View all games →
                </Link>
              </div>
              {data.recentGames.length ? (
                <div className="mt-3 divide-y divide-white/10">
                  {data.recentGames.map((game) => (
                    <Link
                      key={game.id}
                      to={'/analyze/games/' + encodeURIComponent(game.id)}
                      className="group flex min-h-24 cursor-pointer items-center gap-3 rounded-sm py-4 text-[#ece4d9] transition hover:bg-white/[.04] focus-visible:outline-2 focus-visible:outline-[#eaa879] sm:gap-4"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'h-13 w-1 shrink-0 rounded-full ' +
                          (game.outcome === 'WIN'
                            ? 'bg-emerald-500'
                            : game.outcome === 'LOSS'
                              ? 'bg-[#c84d42]'
                              : 'bg-[#948777]')
                        }
                      />
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#3c3933] text-sm text-[#e1d5c4]"
                      >
                        {game.opponent.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base">
                          <span className="break-all">{game.opponent}</span>{' '}
                          <span className="text-sm text-[#b6a995]">
                            {game.opponentRating != null ? `· ${game.opponentRating}` : ''}
                          </span>
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#bfb4a4]">
                          {game.format.toLowerCase()} ·{' '}
                          {game.timeControl ?? game.mode.toLowerCase()} ·{' '}
                          {[game.opening?.eco, game.opening?.name].filter(Boolean).join(' ') ||
                            'Opening unavailable'}{' '}
                          ·{' '}
                          {game.moveCount == null ? 'Moves unavailable' : `${game.moveCount} moves`}
                        </p>
                        <p className="mt-1 text-xs text-[#ac9e8a]">
                          {results[game.outcome]} ·{' '}
                          {game.platform === 'CHESSCOM' ? 'Chess.com' : 'Lichess'} ·{' '}
                          {new Date(game.playedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-2 pr-2 text-sm text-[#edb18a]">
                        <span className="hidden sm:inline">Analyze</span>
                        <ArrowIcon />
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-base leading-7 text-[#c9beae]">
                  <p>No imported matches for this platform yet.</p>
                  <p className="mt-2">
                    Connect your account below, then import your games to see your progress here.
                  </p>
                </div>
              )}
            </section>
            <div className="mt-6">
              <LinkedAccountsPanel
                accounts={data.accounts}
                onChanged={(message) => {
                  setNotice(message);
                  setRevision((value) => value + 1);
                }}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
