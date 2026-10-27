import type { Game, Progress } from '../pages/game-review-page';
const labels = [
  ['BEST', 'Best', '#91b56b', '★'],
  ['EXCELLENT', 'Excellent', '#8fbca9', '!'],
  ['GOOD', 'Good', '#adb69a', '✓'],
  ['INACCURACY', 'Inaccuracy', '#e5b85e', '?!'],
  ['MISTAKE', 'Mistake', '#e99c60', '?'],
  ['BLUNDER', 'Blunder', '#e87570', '??'],
  ['FORCED', 'Forced', '#a4b1c9', '→'],
  ['BOOK', 'Book', '#b4a1cc', '≡'],
];
export default function ReviewSummary({
  game,
  progress,
}: {
  game: Game;
  progress: Progress | null;
}) {
  const result = progress?.status === 'completed' ? progress.result : undefined;
  const players = [game.whiteUsername, game.blackUsername];
  return (
    <section aria-label="Player review summary">
      <div className="grid grid-cols-[1fr_72px_1fr] items-center gap-2 text-center">
        {players.map((name, index) => (
          <div key={index} className={index === 0 ? 'col-start-1' : 'col-start-3 row-start-1'}>
            <p
              className="truncate rounded-md border border-white/10 bg-[#1c1c1b] px-2 py-2 text-sm"
              title={name}
            >
              {name}
            </p>
            <span
              aria-hidden="true"
              className={
                'mx-auto mt-4 flex size-12 items-center justify-center rounded-md border text-xl ' +
                (index === 0
                  ? 'border-white/20 bg-[#dedfe6] text-[#34363a]'
                  : 'border-white/15 bg-[#414a5c] text-[#eee]')
              }
            >
              {name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        ))}
        <p className="col-start-2 row-start-1 text-xs text-[#aaa69e]">
          White
          <br />
          <span className="text-[#726e67]">vs</span>
          <br />
          Black
        </p>
        <strong className="rounded-md bg-[#171717] py-2 text-xl font-medium tabular-nums">
          {result?.accuracyWhite == null ? '—' : result.accuracyWhite.toFixed(1) + '%'}
        </strong>
        <span className="text-[11px] leading-4 text-[#b4afa5]">
          Estimated
          <br />
          accuracy
        </span>
        <strong className="rounded-md bg-[#171717] py-2 text-xl font-medium tabular-nums">
          {result?.accuracyBlack == null ? '—' : result.accuracyBlack.toFixed(1) + '%'}
        </strong>
      </div>
      <div
        className="mt-5 space-y-3 border-t border-white/10 pt-5"
        aria-label="Move quality by player"
      >
        {labels
          .filter(
            ([key]) => key !== 'BOOK' || result?.moves.some((move) => move.classification === key),
          )
          .map(([key, label, color, icon]) => {
            const counts = ['w', 'b'].map((side) =>
              result
                ? result.moves.filter(
                    (move, i) => game.moves[i]?.color === side && move.classification === key,
                  ).length
                : '—',
            );
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_150px_1fr] items-center gap-2 text-center text-sm"
                aria-label={`${label}: White ${counts[0]}, Black ${counts[1]}`}
              >
                <span className="font-medium tabular-nums" style={{ color }}>
                  {counts[0]}
                </span>
                <span className="flex items-center justify-start gap-3 text-[#d7d3cb]">
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#171717]"
                    style={{ background: color }}
                  >
                    {icon}
                  </span>
                  {label}
                </span>
                <span className="font-medium tabular-nums" style={{ color }}>
                  {counts[1]}
                </span>
              </div>
            );
          })}
      </div>
      <details className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-[#b6b1a7]">
        <summary className="cursor-pointer text-sm text-[#d9c5b5]">
          How this review is calculated
        </summary>
        <p className="mt-3">
          Stockfish review{result ? ` · completed depth ${result.depth}` : ''}. Labels use the
          moving player's loss of estimated winning chances: 5 points for an inaccuracy, 10 for a
          mistake, 20 for a blunder.
        </p>
        <p className="mt-2">
          Estimated accuracy is the average move accuracy using the{' '}
          <a
            href="https://lichess.org/page/accuracy"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            documented winning-chance curve
          </a>
          . It is our estimate, not Chess.com's accuracy or Lichess's game accuracy. Engine depth
          and scoring methods affect results.
        </p>
      </details>
    </section>
  );
}
