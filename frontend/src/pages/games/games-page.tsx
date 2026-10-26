import ImportHelp from '../../components/import-help';
import SampleGames from '../../components/sample-games';
import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

type Game = {
  id: string;
  externalId?: string;
  platform: string;
  whiteUsername: string;
  blackUsername: string;
  whiteElo: number | null;
  blackElo: number | null;
  result: string;
  format: string;
  mode: string;
  timeControl: string | null;
  playedAt: string;
  opening: { eco: string | null; name: string | null } | null;
  groupKey: string;
  playerResult: 'WIN' | 'LOSS' | 'DRAW' | 'UNKNOWN';
  playerElo: number | null;
  playerAccuracy: number | null;
};
type SearchResult = {
  items: Game[];
  total: number;
  totalOwned?: number;
  page: number;
  pageSize: number;
  groups: { key: string; eco: string | null; name: string | null; count: number }[];
};
const empty: SearchResult = { items: [], total: 0, page: 1, pageSize: 25, groups: [] };
const results = { WIN: 'Win', LOSS: 'Loss', DRAW: 'Draw', UNKNOWN: 'Unknown player' };
const selectClass =
  'h-11 w-full border border-white/20 bg-[#202020] px-3 text-sm text-[#eee] focus:outline-2 focus:outline-[#d47440]';

export default function GamesPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [data, setData] = useState<SearchResult>(empty);
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [importing, setImporting] = useState<'CHESSCOM' | 'LICHESS' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lichessLimit, setLichessLimit] = useState('100');
  const validLimit =
    Number.isInteger(Number(lichessLimit)) &&
    Number(lichessLimit) >= 1 &&
    Number(lichessLimit) <= 300;
  const dateError =
    params.get('dateFrom') &&
    params.get('dateTo') &&
    params.get('dateFrom')! > params.get('dateTo')!
      ? 'Start date must be on or before end date.'
      : '';
  const requestKey = query + ':' + refresh;
  const loading = loadedQuery !== requestKey && !dateError;
  const visibleError = dateError || (!loading ? error : '');
  useEffect(() => {
    if (dateError) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api<SearchResult>('/games/search' + (query ? '?' + query : ''))
        .then((value) => {
          if (active) {
            setData(value);
            setError('');
          }
        })
        .catch((caught) => {
          if (active) {
            setData(empty);
            setError(caught instanceof ApiError ? caught.message : 'Could not load games.');
          }
        })
        .finally(() => {
          if (active) setLoadedQuery(requestKey);
        });
    }, 200);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, requestKey, dateError]);
  function change(name: string, value: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      if (name !== 'page') next.delete('page');
      return next;
    });
  }
  async function importGames(platform: 'CHESSCOM' | 'LICHESS') {
    if (importing || (platform === 'LICHESS' && !validLimit)) return;
    setImporting(platform);
    setMessage('');
    setError('');
    try {
      const value = await api<{ imported: number; skipped: number }>(
        `/games/${platform === 'CHESSCOM' ? 'chesscom' : 'lichess'}/import`,
        {
          method: 'POST',
          ...(platform === 'LICHESS'
            ? { body: JSON.stringify({ limit: Number(lichessLimit) }) }
            : {}),
        },
      );
      setMessage(`${value.imported} games imported, ${value.skipped} already existed.`);
      setRefresh((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not import games.');
    } finally {
      setImporting(null);
    }
  }
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const groupLabel = (game: Game) => {
    const group = data.groups.find((value) => value.key === game.groupKey);
    return `${[game.opening?.eco, game.opening?.name].filter(Boolean).join(' · ') || 'Unknown opening'} — ${group?.count ?? 0} games`;
  };
  function select(label: string, name: string, options: [string, string][], fallback = '') {
    return (
      <label className="grid gap-2 text-sm text-[#c8c2b9]">
        {label}
        <select
          className={selectClass}
          value={params.get(name) ?? fallback}
          onChange={(event) => change(name, event.target.value)}
        >
          {options.map(([value, text]) => (
            <option value={value} key={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <main className="min-h-screen bg-[#1b1b1b] px-5 py-12 font-sans text-[#e8e5df] sm:px-[7vw] sm:py-16">
      <Link to="/home" className="text-sm text-[#c8c2b9] hover:text-white">
        ← Home
      </Link>
      <header className="mt-8 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 xl:flex-row xl:items-end">
        <div>
          <p className="text-sm tracking-[.2em] text-[#d47440]">GAME HISTORY</p>
          <h1 className="mt-3 text-5xl font-light sm:text-7xl">Your games</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-2 text-sm text-[#c8c2b9]">
            Latest Lichess games (1–300)
            <input
              aria-label="Lichess game limit"
              type="number"
              min={1}
              max={300}
              step={1}
              value={lichessLimit}
              onChange={(event) => setLichessLimit(event.target.value)}
              disabled={!!importing}
              className={selectClass + ' max-w-32'}
            />
          </label>
          {(['CHESSCOM', 'LICHESS'] as const).map((platform) => (
            <button
              type="button"
              key={platform}
              onClick={() => importGames(platform)}
              disabled={!!importing || (platform === 'LICHESS' && !validLimit)}
              className="h-11 bg-[#a94e22] px-5 text-sm hover:bg-[#c25d2a] disabled:opacity-50"
            >
              {importing === platform
                ? 'Importing…'
                : `Import ${platform === 'LICHESS' ? 'Lichess' : 'Chess.com'} games`}
            </button>
          ))}
        </div>
      </header>
      <ImportHelp />
      <section
        aria-label="Game filters"
        className="my-6 grid gap-4 border border-white/10 bg-white/[.02] p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {select('Format', 'format', [
          ['', 'All formats'],
          ...['BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'CORRESPONDENCE'].map(
            (value): [string, string] => [value, value[0] + value.slice(1).toLowerCase()],
          ),
        ])}
        {select('Mode', 'mode', [
          ['', 'All modes'],
          ['RATED', 'Rated'],
          ['CASUAL', 'Casual'],
        ])}
        {select('Result', 'result', [
          ['', 'All results'],
          ['WIN', 'Win'],
          ['LOSS', 'Loss'],
          ['DRAW', 'Draw'],
        ])}
        {select(
          'Group by',
          'groupBy',
          [
            ['none', 'No grouping'],
            ['opening', 'Opening (ECO / name)'],
          ],
          'none',
        )}
        <label className="grid gap-2 text-sm text-[#c8c2b9]">
          From date (UTC)
          <input
            type="date"
            className={selectClass}
            value={params.get('dateFrom') ?? ''}
            onChange={(event) => change('dateFrom', event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm text-[#c8c2b9]">
          Through date (UTC)
          <input
            type="date"
            className={selectClass}
            value={params.get('dateTo') ?? ''}
            onChange={(event) => change('dateTo', event.target.value)}
          />
        </label>
        {select(
          'Sort by',
          'sortBy',
          [
            ['date', 'Date'],
            ['elo', 'Your Elo'],
            ['accuracy', 'Your accuracy'],
          ],
          'date',
        )}
        {select(
          'Order',
          'order',
          [
            ['desc', 'Descending'],
            ['asc', 'Ascending'],
          ],
          'desc',
        )}
        <label className="grid gap-2 text-sm text-[#c8c2b9] sm:col-span-2">
          Opening ECO / name
          <input
            className={selectClass}
            maxLength={100}
            placeholder="e.g. B20 or Sicilian"
            value={params.get('opening') ?? ''}
            onChange={(event) => change('opening', event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setParams({})}
            className="h-11 border border-white/20 px-5 text-sm hover:border-white/50"
          >
            Reset filters
          </button>
        </div>
        <p className="self-end text-sm leading-5 text-[#999]">
          Results, Elo, and accuracy use your linked account. Missing values appear last. Opening
          counts include all matching games.
        </p>
      </section>
      {visibleError && (
        <p role="alert" className="mb-6 border border-red-400/30 p-4 text-sm text-red-200">
          {visibleError}{' '}
          <button
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
            className="ml-3 underline"
          >
            Retry
          </button>
        </p>
      )}
      {message && (
        <p role="status" className="mb-6 border border-emerald-400/30 p-4 text-sm text-emerald-200">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-16 text-center text-[#c8c2b9]">
          Loading games…
        </p>
      ) : (
        !visibleError && (
          <>
            <p className="mb-4 text-sm text-[#c8c2b9]" role="status">
              {data.total} matching games
            </p>
            {data.items.length === 0 ? (
              <div className="border border-white/10 p-10 text-center">
                <p>No matching games</p>
                <p className="mt-3 text-sm text-[#c8c2b9]">
                  Adjust the filters or import games from a linked account.
                </p>
                <Link className="mt-5 inline-block text-sm text-[#d47440]" to="/profile">
                  Manage linked accounts →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="text-sm text-[#c8c2b9]">
                    <tr>
                      {[
                        'Game',
                        'Your result',
                        'Format / mode',
                        'Opening',
                        'Your Elo',
                        'Your accuracy',
                        'Date',
                      ].map((label) => (
                        <th key={label} className="p-4 font-normal">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((game, index) => (
                      <Fragment key={game.id}>
                        {params.get('groupBy') === 'opening' &&
                          (index === 0 || data.items[index - 1].groupKey !== game.groupKey) && (
                            <tr className="border-y border-white/10 bg-[#2b231e]">
                              <th colSpan={7} className="p-4 text-sm font-normal text-[#e89b70]">
                                {groupLabel(game)}
                              </th>
                            </tr>
                          )}
                        <tr className="border-t border-white/10 text-[#bbb]">
                          <td className="p-4 text-[#eee]">
                            {game.whiteUsername} <span className="text-[#bdb5ab]">vs</span>{' '}
                            {game.blackUsername}
                            <p className="mt-2 text-sm text-[#c3b9ad]">
                              {game.platform}
                              {game.externalId?.startsWith('sample-') && (
                                <span className="ml-2 text-[#f3b187]">Sample game</span>
                              )}
                            </p>
                            <Link
                              to={'/analyze/games/' + encodeURIComponent(game.id)}
                              className="mt-3 inline-flex min-h-11 cursor-pointer items-center border border-[#d58a59]/60 bg-[#53361f] px-4 py-2 text-base font-medium text-[#ffdbbd] transition hover:border-[#f3b187] hover:bg-[#724627] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3b187]"
                            >
                              Analyze game{' '}
                              <span className="ml-2" aria-hidden="true">
                                →
                              </span>
                            </Link>
                          </td>
                          <td className="p-4">{results[game.playerResult]}</td>
                          <td className="p-4">
                            {game.format}
                            <p className="mt-1 text-sm text-[#bdb5ab]">
                              {game.mode} · {game.timeControl ?? '—'}
                            </p>
                          </td>
                          <td className="p-4">
                            {[game.opening?.eco, game.opening?.name].filter(Boolean).join(' · ') ||
                              'Unknown opening'}
                          </td>
                          <td className="p-4">{game.playerElo ?? '—'}</td>
                          <td className="p-4">
                            {game.playerAccuracy != null
                              ? `${game.playerAccuracy.toFixed(1)}%`
                              : 'Not analyzed'}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            {new Date(game.playedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <nav
              aria-label="Game pages"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm"
            >
              <button
                className="border border-white/20 px-4 py-2 disabled:opacity-40"
                disabled={data.page <= 1}
                onClick={() => change('page', String(data.page - 1))}
              >
                Previous
              </button>
              <span>
                Page {data.page} of {pages}
              </span>
              <button
                className="border border-white/20 px-4 py-2 disabled:opacity-40"
                disabled={data.page >= pages}
                onClick={() => change('page', String(data.page + 1))}
              >
                Next
              </button>
            </nav>
            {(data.totalOwned ?? data.total) === 0 && <SampleGames />}
          </>
        )
      )}
    </main>
  );
}
