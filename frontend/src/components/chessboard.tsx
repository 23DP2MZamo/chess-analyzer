import { Chess } from 'chess.js';
const symbols: Record<string, string> = {
  wk: '♔',
  wq: '♕',
  wr: '♖',
  wb: '♗',
  wn: '♘',
  wp: '♙',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};
export default function Chessboard({ fen }: { fen: string }) {
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
        .map((piece, index) => (
          <div
            key={index}
            className={
              'relative flex aspect-square items-center justify-center text-[clamp(26px,6vw,52px)] leading-none ' +
              ((Math.floor(index / 8) + index) % 2 === 0 ? 'bg-[#d6c9b4]' : 'bg-[#8f694c]')
            }
          >
            {piece && (
              <span
                className={
                  piece.color === 'w'
                    ? 'text-white [text-shadow:0_1px_2px_#111,1px_0_1px_#111,-1px_0_1px_#111]'
                    : 'text-[#191714] [text-shadow:0_1px_1px_#eee]'
                }
              >
                {symbols[piece.color + piece.type] + '\uFE0E'}
              </span>
            )}
            {index % 8 === 0 && (
              <span className="absolute top-1 left-1 text-[10px] font-bold text-[#29221a]">
                {8 - Math.floor(index / 8)}
              </span>
            )}
            {index >= 56 && (
              <span className="absolute right-1 bottom-1 text-[10px] font-bold text-[#29221a]">
                {'abcdefgh'[index % 8]}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}
