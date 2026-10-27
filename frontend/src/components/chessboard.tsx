import { Chess } from 'chess.js';
import ChessPiece from './chess-piece';
export default function Chessboard({
  fen,
  theme = 'wood',
  lastMove,
}: {
  fen: string;
  theme?: 'wood' | 'slate';
  lastMove?: { from?: string; to?: string };
}) {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return (
      <p className="border border-red-400/30 p-4 text-red-200">
        This position cannot be displayed.
      </p>
    );
  }
  return (
    <div
      className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-sm border border-white/20"
      role="img"
      aria-label="Chess position, White at the bottom"
    >
      {chess
        .board()
        .flat()
        .map((piece, index) => {
          const light = (Math.floor(index / 8) + index) % 2 === 0;
          const square = 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
          const highlighted = square === lastMove?.from || square === lastMove?.to;
          return (
            <div
              key={square}
              className={
                'relative flex aspect-square items-center justify-center ' +
                (theme === 'slate'
                  ? light
                    ? 'bg-[#dedfe6]'
                    : 'bg-[#414a5c]'
                  : light
                    ? 'bg-[#d6c9b4]'
                    : 'bg-[#8f694c]')
              }
            >
              {highlighted && (
                <span className="pointer-events-none absolute inset-0 bg-amber-400/30 ring-2 ring-inset ring-amber-300/50" />
              )}
              {piece && <ChessPiece type={piece.type} color={piece.color} />}
              {index % 8 === 0 && (
                <span
                  className={
                    'absolute left-1 top-0.5 text-[clamp(9px,1.3vw,13px)] font-medium ' +
                    (light ? 'text-[#414a5c]' : 'text-[#e6e2d9]')
                  }
                >
                  {8 - Math.floor(index / 8)}
                </span>
              )}
              {index >= 56 && (
                <span
                  className={
                    'absolute bottom-0 right-1 text-[clamp(9px,1.3vw,13px)] font-medium ' +
                    (light ? 'text-[#414a5c]' : 'text-[#e6e2d9]')
                  }
                >
                  {'abcdefgh'[index % 8]}
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
}
