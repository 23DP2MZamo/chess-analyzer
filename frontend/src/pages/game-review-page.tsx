import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Chessboard from '../components/chessboard';
import { api, ApiError } from '../lib/api';
type Move = { san: string; before: string; after: string; color: string };
type Game = {
  id: string;
  whiteUsername: string;
  blackUsername: string;
  initialFen: string;
  moves: Move[];
  isSample: boolean;
};
type ReviewMove = {
  san: string;
  color: string;
  classification: string;
  bestMove: string | null;
  evalAfterCp: number | null;
  mateIn: number | null;
};
type Progress = {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  completed: number;
  total: number;
  error?: string;
  result?: {
    engine: string;
    depth: number;
    blunderCount: number;
    mistakeCount: number;
    inaccuracyCount: number;
    moves: ReviewMove[];
  };
};
const button =
  'min-h-12 cursor-pointer border border-white/25 bg-[#252525] px-4 py-2 text-base text-[#eee] transition hover:border-[#e89b70] hover:bg-[#34281f] focus-visible:outline-2 focus-visible:outline-[#f3b187] disabled:cursor-default disabled:opacity-40';
export default function GameReviewPage() {
  const { gameId = '' } = useParams();
  return <GameReview key={gameId} gameId={gameId} />;
}
function GameReview({ gameId }: { gameId: string }) {
  const endpoint = '/analysis/games/' + encodeURIComponent(gameId);
  const [game, setGame] = useState<Game | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.all([api<Game>(endpoint), api<Progress>(endpoint + '/status')])
      .then(async ([detail, status]) => {
        if (!active) return;
        setGame(detail);
        setError('');
        setIndex(0);
        const state =
          status.status === 'idle' ? await api<Progress>(endpoint, { method: 'POST' }) : status;
        if (active) setProgress(state);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof ApiError ? caught.message : 'Could not open this game. Try again.',
          );
      });
    return () => {
      active = false;
    };
  }, [endpoint, attempt]);
  useEffect(() => {
    if (progress?.status !== 'running') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const state = await api<Progress>(endpoint + '/status');
        if (!active) return;
        setProgress(state);
        setError('');
        if (state.status === 'running')
          timer = setTimeout(() => {
            void poll();
          }, 1200);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof ApiError
              ? caught.message
              : 'Connection lost. Reconnecting to the review…',
          );
          timer = setTimeout(() => {
            void poll();
          }, 3000);
        }
      }
    };
    timer = setTimeout(() => {
      void poll();
    }, 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [endpoint, progress?.status]);
  async function start() {
    setPending(true);
    setError('');
    try {
      setProgress(await api<Progress>(endpoint, { method: 'POST' }));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not start the review. Try again.',
      );
    } finally {
      setPending(false);
    }
  }
  async function cancel() {
    setPending(true);
    try {
      await api(endpoint, { method: 'DELETE' });
      setProgress((state) => (state ? { ...state, status: 'cancelled' } : state));
    } catch {
      setError('Could not stop the review. Please try again.');
    } finally {
      setPending(false);
    }
  }
  const selected = index > 0 ? progress?.result?.moves[index - 1] : null;
  const fen = game ? (index === 0 ? game.initialFen : game.moves[index - 1].after) : '';
  return (
    <main className="min-h-screen bg-[#1b1b1b] px-5 py-10 text-[#eee] sm:px-[7vw]">
      <Link to="/games" className="text-base text-[#d9b69e] hover:text-white">
        ← Your games
      </Link>
      <h1 className="mt-8 text-4xl font-light sm:text-5xl">Game review</h1>
      {game && (
        <p className="mt-3 text-lg text-[#ddd]">
          {game.whiteUsername} vs {game.blackUsername}
          {game.isSample && (
            <span className="ml-3 rounded-sm border border-[#e89b70]/40 px-3 py-1 text-sm text-[#f3b187]">
              Sample game
            </span>
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="my-5 border border-red-400/40 p-4 text-red-200">
          {error}{' '}
          {!game && (
            <button className="ml-4 underline" onClick={() => setAttempt((value) => value + 1)}>
              Retry
            </button>
          )}
        </p>
      )}
      {!game && !error && (
        <p role="status" className="mt-8">
          Opening your game…
        </p>
      )}
      {game && (
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(280px,500px)_1fr]">
          <div>
            <Chessboard fen={fen} />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <button
                className={button}
                disabled={index === 0}
                onClick={() => setIndex(0)}
                aria-label="First position"
              >
                |←
              </button>
              <button
                className={button}
                disabled={index === 0}
                onClick={() => setIndex((value) => value - 1)}
                aria-label="Previous move"
              >
                ←
              </button>
              <span className="text-sm">
                {index === 0
                  ? 'Starting position'
                  : `Move ${Math.ceil(index / 2)} · ${game.moves[index - 1].san}`}
              </span>
              <button
                className={button}
                disabled={index === game.moves.length}
                onClick={() => setIndex((value) => value + 1)}
                aria-label="Next move"
              >
                →
              </button>
              <button
                className={button}
                disabled={index === game.moves.length}
                onClick={() => setIndex(game.moves.length)}
                aria-label="Final position"
              >
                →|
              </button>
            </div>
            {selected && (
              <section
                className="mt-5 border border-white/20 bg-[#25211e] p-5"
                aria-label="Move feedback"
              >
                <p className="text-xl">
                  {selected.san} · {selected.classification.toLowerCase()}
                </p>
                <p className="mt-2 text-base text-[#ddd]">
                  {selected.mateIn != null
                    ? selected.mateIn === 0
                      ? 'Checkmate'
                      : `Mate ${selected.mateIn > 0 ? '+' : ''}${selected.mateIn}`
                    : selected.evalAfterCp != null
                      ? `Evaluation: ${selected.evalAfterCp >= 0 ? '+' : ''}${(selected.evalAfterCp / 100).toFixed(2)}`
                      : 'No evaluation'}{' '}
                  · White’s perspective
                </p>
                {selected.bestMove && (
                  <p className="mt-2 text-sm text-[#ccc]">
                    Engine’s suggested move before this turn:{' '}
                    <span className="font-mono">{selected.bestMove}</span>
                  </p>
                )}
              </section>
            )}
          </div>
          <div className="min-w-0">
            {progress?.status === 'running' ? (
              <section className="border border-[#e89b70]/40 bg-[#30251e] p-5" role="status">
                <h2 className="text-xl">Analyzing your game…</h2>
                <p className="mt-3 text-base">
                  {progress.completed} of {progress.total} moves reviewed. You can already replay
                  the game below.
                </p>
                <progress
                  aria-label="Game analysis progress"
                  className="mt-4 h-3 w-full accent-[#dc8c58]"
                  value={progress.completed}
                  max={progress.total || 1}
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={cancel}
                  className={button + ' mt-4'}
                >
                  Stop review
                </button>
              </section>
            ) : progress?.status === 'completed' && progress.result ? (
              <section className="border border-white/20 bg-[#25211e] p-5" role="status">
                <h2 className="text-2xl">Review complete</h2>
                <p className="mt-3 text-lg">
                  {progress.result.blunderCount}{' '}
                  {progress.result.blunderCount === 1 ? 'blunder' : 'blunders'} ·{' '}
                  {progress.result.mistakeCount}{' '}
                  {progress.result.mistakeCount === 1 ? 'mistake' : 'mistakes'}·{' '}
                  {progress.result.inaccuracyCount}{' '}
                  {progress.result.inaccuracyCount === 1 ? 'inaccuracy' : 'inaccuracies'}
                </p>
                <p className="mt-3 text-sm leading-6 text-[#ccc]">
                  Quick Stockfish review, depth {progress.result.depth}. Move labels are based on
                  evaluation loss; deeper analysis may change them. Accuracy percentages are not
                  calculated.
                </p>
              </section>
            ) : (
              <section className="border border-white/20 p-5">
                <p className="mb-4 text-base text-[#ddd]">
                  {progress?.error ??
                    (progress?.status === 'cancelled'
                      ? 'Review stopped. Your game is unchanged.'
                      : 'Ready to review every move?')}
                </p>
                <button className={button} disabled={pending} onClick={start}>
                  {pending ? 'Starting…' : 'Analyze game'}
                </button>
              </section>
            )}
            <h2 className="mt-7 text-xl">Moves</h2>
            <p className="mt-2 text-sm text-[#ccc]">
              Choose any move to see the board and its review.
            </p>
            <div
              className="mt-4 grid max-h-[480px] grid-cols-2 gap-2 overflow-y-auto rounded-sm border border-white/15 p-3"
              aria-label="Game moves"
            >
              {game.moves.map((move, position) => (
                <button
                  type="button"
                  key={position}
                  onClick={() => setIndex(position + 1)}
                  aria-pressed={index === position + 1}
                  className={
                    button +
                    ' flex items-center justify-between gap-2 text-left ' +
                    (index === position + 1 ? 'border-[#f3b187] bg-[#493323]' : '')
                  }
                >
                  <span>
                    {Math.ceil((position + 1) / 2)}
                    {move.color === 'w' ? '.' : '…'} {move.san}
                  </span>
                  <span className="text-xs text-[#f3b187]">
                    {progress?.result?.moves[position]?.classification.toLowerCase() ?? ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
