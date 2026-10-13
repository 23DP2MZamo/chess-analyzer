import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';

type Game = {
  id: string;
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
  opening: { eco: string; name: string } | null;
  analysis: { accuracyWhite: number | null; accuracyBlack: number | null } | null;
};

function resultLabel(result: string) {
  if (result === 'WHITE_WIN') return 'White won';
  if (result === 'BLACK_WIN') return 'Black won';
  return 'Draw';
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadGames(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      setGames(await api<Game[]>('/games'));
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load games.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api<Game[]>('/games')
      .then((loadedGames) => {
        if (active) setGames(loadedGames);
      })
      .catch((caughtError) => {
        if (active) {
          setError(caughtError instanceof ApiError ? caughtError.message : 'Could not load games.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function importChessComGames() {
    setImporting(true);
    setError('');
    setMessage('');
    try {
      const result = await api<{ imported: number; skipped: number }>('/games/chesscom/import', {
        method: 'POST',
      });
      setMessage(`${result.imported} games imported, ${result.skipped} already existed.`);
      await loadGames(true);
    } catch (caughtError) {
      setError(caughtError instanceof ApiError ? caughtError.message : 'Could not import games.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1b1b1b] px-5 py-12 font-sans text-[#e8e5df] sm:px-[7vw] sm:py-16">
      <div className="mb-10 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end">
        <div>
          <Link className="text-xs tracking-[.14em] text-[#777] no-underline hover:text-white" to="/home">← Home</Link>
          <p className="mt-8 text-[10px] tracking-[.2em] text-[#d47440]">GAME HISTORY</p>
          <h1 className="mt-3 text-5xl font-light tracking-[-.04em] sm:text-7xl">Your games</h1>
        </div>
        <button className="h-11 border border-[#c56531] bg-[#a94e22] px-5 text-xs tracking-[.08em] text-white transition hover:bg-[#c25d2a] disabled:cursor-wait disabled:opacity-50" type="button" onClick={importChessComGames} disabled={importing}>
          {importing ? 'Importing...' : 'Import Chess.com games'}
        </button>
      </div>
      {error && <p className="mb-6 border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200" role="alert">{error}</p>}
      {message && <p className="mb-6 border border-emerald-400/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200" role="status">{message}</p>}
      {loading ? (
        <p className="py-16 text-center text-sm text-[#777]" role="status">Loading games...</p>
      ) : games.length === 0 ? (
        <div className="border border-white/10 bg-white/[.025] px-6 py-16 text-center">
          <p className="text-lg text-[#ddd]">No games yet</p>
          <p className="mt-3 text-sm text-[#777]">Link a Chess.com account and import your game history.</p>
          <Link className="mt-6 inline-block text-xs tracking-[.1em] text-[#d47440] no-underline hover:text-white" to="/profile">Manage linked accounts →</Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="border-b border-white/10 text-[10px] tracking-[.14em] text-[#777] uppercase">
              <tr>
                <th className="px-5 py-4 font-normal">Game</th>
                <th className="px-5 py-4 font-normal">Result</th>
                <th className="px-5 py-4 font-normal">Format</th>
                <th className="px-5 py-4 font-normal">Opening</th>
                <th className="px-5 py-4 font-normal">Accuracy</th>
                <th className="px-5 py-4 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr className="border-b border-white/6 text-[#bbb] last:border-b-0" key={game.id}>
                  <td className="px-5 py-4 text-[#e8e5df]">{game.whiteUsername} <span className="text-[#666]">vs</span> {game.blackUsername}</td>
                  <td className="px-5 py-4">{resultLabel(game.result)}</td>
                  <td className="px-5 py-4">{game.format} <span className="text-[#666]">{game.timeControl ?? game.mode}</span></td>
                  <td className="px-5 py-4">{game.opening ? `${game.opening.eco} ${game.opening.name}` : '—'}</td>
                  <td className="px-5 py-4">{game.analysis?.accuracyWhite != null ? `${game.analysis.accuracyWhite.toFixed(1)}% / ${game.analysis.accuracyBlack?.toFixed(1) ?? '—'}%` : 'Not analyzed'}</td>
                  <td className="px-5 py-4 text-[#777]">{new Date(game.playedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}