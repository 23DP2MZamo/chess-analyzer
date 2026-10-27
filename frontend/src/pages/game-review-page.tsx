import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Chessboard from '../components/chessboard';
import { Chess } from 'chess.js';
import ReviewSummary from '../components/review-summary';
import { api, ApiError } from '../lib/api';
type Move = {
  san: string;
  before: string;
  after: string;
  color: string;
  from?: string;
  to?: string;
};
export type Game = {
  id: string;
  whiteUsername: string;
  blackUsername: string;
  whiteElo?: number | null;
  blackElo?: number | null;
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
export type Progress = {
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  completed: number;
  total: number;
  error?: string;
  result?: {
    engine: string;
    depth: number;
    accuracyWhite?: number | null;
    accuracyBlack?: number | null;
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
  const [reportView, setReportView] = useState<'summary' | 'moves'>('summary');
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
  const selectedMove = game && index > 0 ? game.moves[index - 1] : undefined;
  let suggested = selected?.bestMove;
  if (suggested && selectedMove) {
    try {
      suggested = new Chess(selectedMove.before).move({
        from: suggested.slice(0, 2),
        to: suggested.slice(2, 4),
        promotion: suggested[4],
      }).san;
    } catch {
      /* Keep the coordinate move if an old review cannot be converted. */
    }
  }
  const evaluation = !selected
    ? 'Choose a move to see its evaluation.'
    : selected.mateIn != null
      ? selected.mateIn === 0
        ? `Checkmate · ${fen.split(' ')[1] === 'w' ? 'Black' : 'White'} wins`
        : `${selected.mateIn > 0 ? 'White' : 'Black'} can force mate in ${Math.abs(selected.mateIn)}`
      : selected.evalAfterCp != null
        ? `Evaluation: ${selected.evalAfterCp >= 0 ? '+' : ''}${(selected.evalAfterCp / 100).toFixed(2)} · White’s perspective`
        : 'No evaluation';
  return (
    <main className="min-h-screen bg-[#1c1c1b] px-4 py-6 font-sans text-[#e9e6df] sm:px-8 lg:py-8">
      <div className="mx-auto max-w-[1000px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[.22em] text-[#bc956f]">STOCKFISH ANALYSIS</p>
            <h1 className="mt-1 text-2xl font-light">Game review</h1>
          </div>
          <Link to="/games" className="min-h-11 py-3 text-sm text-[#cbb49c] hover:text-white">
            ← Your games
          </Link>
        </div>
        {game?.isSample && (
          <p className="mb-5 text-sm text-[#e3b586]">
            Sample game · Try the review without importing a game.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="my-5 rounded-md border border-red-400/30 p-4 text-sm text-red-200"
          >
            {error}
            {!game && (
              <button className="ml-4 underline" onClick={() => setAttempt((value) => value + 1)}>
                Retry
              </button>
            )}
          </p>
        )}
        {!game && !error && (
          <p role="status" className="py-16 text-center text-[#c3bbb0]">
            Opening your game…
          </p>
        )}
        {game && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,560px)_minmax(320px,1fr)] lg:gap-8">
            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-5 shrink-0 rounded-sm border border-white/25 bg-[#414a5c]"
                    aria-hidden="true"
                  />
                  <span className="truncate">{game.blackUsername}</span>
                </span>
                <span className="ml-3 text-[#aaa69e]">{game.blackElo ?? 'Black'}</span>
              </div>
              <Chessboard fen={fen} theme="slate" lastMove={selectedMove} />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-5 shrink-0 rounded-sm bg-[#dedfe6]" aria-hidden="true" />
                  <span className="truncate">{game.whiteUsername}</span>
                </span>
                <span className="ml-3 text-[#aaa69e]">{game.whiteElo ?? 'White'}</span>
              </div>
              <nav
                className="mt-5 grid grid-cols-[44px_44px_1fr_44px_44px] items-center gap-1 rounded-md border border-white/10 bg-[#242423] p-1 sm:gap-2"
                aria-label="Replay controls"
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    setIndex((value) => Math.max(0, value - 1));
                  }
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    setIndex((value) => Math.min(game.moves.length, value + 1));
                  }
                }}
              >
                <button
                  className={button + ' !min-h-11 !px-2'}
                  disabled={index === 0}
                  onClick={() => setIndex(0)}
                  aria-label="First position"
                >
                  |←
                </button>
                <button
                  className={button + ' !min-h-11 !px-2'}
                  disabled={index === 0}
                  onClick={() => setIndex((value) => value - 1)}
                  aria-label="Previous move"
                >
                  ←
                </button>
                <span className="text-center text-xs sm:text-sm">
                  {index === 0
                    ? 'Starting position'
                    : `Move ${selectedMove?.before.split(' ')[5]}${selectedMove?.color === 'b' ? '…' : '.'} · ${selectedMove?.san}`}
                </span>
                <button
                  className={button + ' !min-h-11 !px-2'}
                  disabled={index === game.moves.length}
                  onClick={() => setIndex((value) => value + 1)}
                  aria-label="Next move"
                >
                  →
                </button>
                <button
                  className={button + ' !min-h-11 !px-2'}
                  disabled={index === game.moves.length}
                  onClick={() => setIndex(game.moves.length)}
                  aria-label="Final position"
                >
                  →|
                </button>
              </nav>
              <section
                className="mt-4 min-h-24 rounded-md border border-white/10 bg-[#242423] p-4"
                aria-label="Move feedback"
              >
                {selected ? (
                  <>
                    <p className="text-base">
                      {selected.san} · {selected.classification.toLowerCase()}
                    </p>
                    <p className="mt-2 text-sm text-[#c4bdb1]">{evaluation}</p>
                    {suggested && (
                      <p className="mt-2 text-sm text-[#aaa69e]">
                        Engine’s suggested move before this turn:{' '}
                        <strong className="font-medium text-[#e0c0a1]">{suggested}</strong>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm leading-6 text-[#aaa69e]">
                    Use the arrows or choose a move to replay the game and see the engine’s
                    feedback.
                  </p>
                )}
              </section>
            </div>
            <aside className="min-w-0 space-y-4" aria-label="Game analysis report">
              <section
                className="rounded-xl border border-white/10 bg-[#222221] p-5 sm:p-6"
                aria-label="Review panel"
              >
                <div
                  role="tablist"
                  aria-label="Review view"
                  className="mb-5 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-[#191918] p-1"
                >
                  {(['summary', 'moves'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      role="tab"
                      id={'review-tab-' + view}
                      aria-controls={'review-panel-' + view}
                      aria-selected={reportView === view}
                      tabIndex={reportView === view ? 0 : -1}
                      onClick={() => setReportView(view)}
                      onKeyDown={(event) => {
                        let next: 'summary' | 'moves';
                        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
                          next = view === 'summary' ? 'moves' : 'summary';
                        else if (event.key === 'Home') next = 'summary';
                        else if (event.key === 'End') next = 'moves';
                        else return;
                        event.preventDefault();
                        setReportView(next);
                        document.getElementById('review-tab-' + next)?.focus();
                      }}
                      className={
                        'min-h-11 cursor-pointer rounded-md px-4 text-sm transition focus-visible:outline-2 focus-visible:outline-[#c6a278] ' +
                        (reportView === view
                          ? 'bg-[#3b3933] text-[#f3d3ab] shadow-sm'
                          : 'text-[#aaa69e] hover:bg-white/5 hover:text-white')
                      }
                    >
                      {view === 'summary' ? 'Summary' : 'Moves'}
                    </button>
                  ))}
                </div>
                <div
                  role="tabpanel"
                  id="review-panel-summary"
                  aria-labelledby="review-tab-summary"
                  hidden={reportView !== 'summary'}
                  className="min-h-[460px]"
                >
                  <ReviewSummary game={game} progress={progress} />
                </div>
                <div
                  role="tabpanel"
                  id="review-panel-moves"
                  aria-labelledby="review-tab-moves"
                  hidden={reportView !== 'moves'}
                  className="min-h-[460px]"
                >
                  <section aria-label="Move list">
                    <h2 className="text-sm text-[#ddd6cb]">
                      Moves{' '}
                      <span className="ml-2 text-xs text-[#979185]">{game.moves.length} plies</span>
                    </h2>
                    <div
                      className="mt-4 grid h-[410px] grid-cols-2 gap-1 overflow-y-auto pr-1"
                      aria-label="Game moves"
                    >
                      {game.moves.map((move, position) => (
                        <button
                          type="button"
                          key={position}
                          onClick={() => setIndex(position + 1)}
                          aria-pressed={index === position + 1}
                          className={
                            'flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-x-2 rounded-sm px-2 py-2 text-left text-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#c6a278] ' +
                            (index === position + 1
                              ? 'bg-[#494133] text-[#f2d0a4]'
                              : 'bg-white/[.025] text-[#d2ccc1]')
                          }
                        >
                          <span>
                            {move.before.split(' ')[5]}
                            {move.color === 'w' ? '.' : '…'} {move.san}
                          </span>
                          <span className="text-[10px] text-[#bcb298]">
                            {progress?.result?.moves[position]?.classification.toLowerCase() ?? ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              </section>
              {progress?.status === 'running' ? (
                <section
                  className="rounded-md border border-[#ba956b]/30 bg-[#29261f] p-4"
                  role="status"
                >
                  <h2 className="text-base">Analyzing your game…</h2>
                  <p className="mt-2 text-sm text-[#c5baaa]">
                    {progress.completed} of {progress.total} moves reviewed. You can replay while
                    the engine works.
                  </p>
                  <progress
                    aria-label="Game analysis progress"
                    className="mt-3 h-2 w-full accent-[#c49a68]"
                    value={progress.completed}
                    max={progress.total || 1}
                  />
                  <button
                    disabled={pending}
                    onClick={cancel}
                    className="mt-3 cursor-pointer text-sm text-[#d3ba9a] underline"
                  >
                    Stop review
                  </button>
                </section>
              ) : progress?.status === 'completed' && progress.result ? (
                <div className="flex items-center justify-between gap-3 px-1 text-sm">
                  <p role="status" className="text-[#b8c7a3]">
                    Review complete
                  </p>
                  <button
                    className="min-h-11 cursor-pointer text-[#baa58e] underline hover:text-white disabled:opacity-40"
                    disabled={pending}
                    onClick={start}
                  >
                    {pending ? 'Starting…' : 'Reanalyze game'}
                  </button>
                </div>
              ) : (
                <section className="rounded-md border border-white/10 p-4">
                  <p className="mb-3 text-sm text-[#c4bdb1]">
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
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
