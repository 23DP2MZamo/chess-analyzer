import { Chess, validateFen } from 'chess.js';
export function fenProblem(value: string): string {
  const fen = value.trim();
  if (!fen) return 'Paste a position or choose one of the sample positions below.';
  if (/https?:\/\//i.test(fen))
    return 'This is a link, not a position. Import your account on Your games, or copy the FEN field from the game’s analysis screen.';
  if (/\[(White|Event|Result)\s|\d+\.(?:\s|[a-hNBRQKO])/i.test(fen))
    return 'This looks like PGN (a whole game). Open Your games and choose Analyze game, or copy only the FEN field for one position.';
  if (/[\r\n]/.test(fen) || fen.split(/\s+/).length !== 6)
    return 'A FEN position has six fields on one line. Copy the complete FEN field, or select a sample below.';
  const checked = validateFen(fen);
  if (!checked.ok)
    return (
      (checked.error ?? 'The position is invalid').replace(/^Invalid FEN:\s*/i, '') +
      '. Copy the complete position again or try a sample.'
    );
  const chess = new Chess(fen);
  const other = chess
    .board()
    .flat()
    .find((piece) => piece?.type === 'k' && piece.color !== chess.turn())!;
  if (chess.isAttacked(other.square, chess.turn()))
    return 'This position is not legal: the king of the player who just moved is still in check. Check whose turn it is.';
  const fields = fen.split(/\s+/);
  if (Number(fields[4]) > 32767 || Number(fields[5]) > 50000)
    return 'The move counters are too large. Copy a position from a standard chess game.';
  return '';
}
