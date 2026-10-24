import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
type Evaluation = {
  engine: string;
  fen: string;
  bestMove: string | null;
  depth: number;
  score: { type: 'cp' | 'mate'; value: number };
  pv: string[];
  elapsedMs: number;
};

export default function ToolPage() {
  const [fen, setFen] = useState(initialFen);
  const [depth, setDepth] = useState('12');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Evaluation | null>(null);
  const [error, setError] = useState('');
  const valid =
    fen.trim().split(/\s+/).length === 6 &&
    !/[\r\n]/.test(fen) &&
    Number.isInteger(Number(depth)) &&
    Number(depth) >= 1 &&
    Number(depth) <= 18;
  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await api<Evaluation>('/analysis/position', {
          method: 'POST',
          body: JSON.stringify({ fen: fen.trim(), depth: Number(depth) }),
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not analyze this position. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }
  function edit() {
    setResult(null);
    setError('');
  }
  const field =
    'w-full border border-white/20 bg-[#202020] p-3 text-sm text-white focus:outline-2 focus:outline-[#d47440] disabled:opacity-50';
  return (
    <main className="min-h-screen bg-[#1b1b1b] px-6 py-12 font-sans text-[#e8e5df] sm:px-[8vw] sm:py-20">
      <Link to="/home" className="text-xs text-[#aaa] hover:text-white">
        ← Home
      </Link>
      <div className="mt-10 max-w-3xl border-l border-[#bd5d2a]/70 pl-6">
        <p className="mb-5 text-[10px] tracking-[.2em] text-[#d47440]">STOCKFISH ANALYSIS</p>
        <h1 className="text-5xl font-light tracking-[-.04em] sm:text-7xl">Analyze a game</h1>
        <p className="mt-6 text-sm leading-relaxed text-[#aaa]">
          Enter a FEN position to find the best move and evaluation. Positive scores favor White;
          negative scores favor Black.
        </p>
      </div>
      <form
        onSubmit={analyze}
        className="mt-10 grid max-w-3xl gap-5 border border-white/10 p-5 sm:p-8"
      >
        <label className="grid gap-2 text-sm">
          FEN position
          <textarea
            className={field + ' min-h-28 resize-y font-mono'}
            required
            maxLength={150}
            value={fen}
            disabled={loading}
            onChange={(event) => {
              setFen(event.target.value);
              edit();
            }}
            aria-describedby="fen-help"
          />
        </label>
        <p id="fen-help" className="text-xs text-[#aaa]">
          Use a complete FEN with six fields. Position analysis does not include earlier moves or
          repetition history.
        </p>
        <label className="grid max-w-40 gap-2 text-sm">
          Search depth (1–18)
          <input
            className={field}
            type="number"
            min={1}
            max={18}
            step={1}
            required
            value={depth}
            disabled={loading}
            onChange={(event) => {
              setDepth(event.target.value);
              edit();
            }}
          />
        </label>
        <p className="text-xs text-[#aaa]">
          Search is limited to two seconds. The completed depth may be lower than requested.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            className="bg-[#a94e22] px-6 py-3 text-sm hover:bg-[#c25d2a] disabled:opacity-50"
            disabled={!valid || loading}
          >
            {loading ? 'Analyzing…' : 'Analyze position'}
          </button>
          <button
            type="button"
            disabled={loading}
            className="border border-white/20 px-4 py-3 text-sm disabled:opacity-50"
            onClick={() => {
              setFen(initialFen);
              edit();
            }}
          >
            Starting position
          </button>
        </div>
        {loading && (
          <p role="status" className="text-sm text-[#aaa]">
            Stockfish is evaluating the position…
          </p>
        )}
        {error && (
          <p role="alert" className="border border-red-400/30 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </form>
      {result && (
        <section
          aria-label="Position evaluation"
          className="mt-6 max-w-3xl border border-[#d47440]/30 bg-[#24201d] p-6"
          role="status"
        >
          <p className="text-xs text-[#aaa]">
            {result.engine} · Depth {result.depth} · {(result.elapsedMs / 1000).toFixed(1)}s
          </p>
          <p className="mt-4 text-4xl font-light">
            {result.score.type === 'mate'
              ? result.score.value === 0
                ? 'Checkmate'
                : `Mate ${result.score.value > 0 ? '+' : ''}${result.score.value}`
              : `${result.score.value >= 0 ? '+' : ''}${(result.score.value / 100).toFixed(2)}`}
          </p>
          <p className="mt-2 text-sm">Evaluation from White’s perspective</p>
          <p className="mt-5 text-sm">
            Best move:{' '}
            <span className="font-mono text-[#e89b70]">{result.bestMove ?? 'No legal move'}</span>
          </p>
          {result.pv.length > 0 && (
            <p className="mt-3 break-words font-mono text-xs leading-6 text-[#aaa]">
              Principal variation (UCI): {result.pv.join(' ')}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
