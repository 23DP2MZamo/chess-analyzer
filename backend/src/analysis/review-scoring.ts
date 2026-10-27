import type { Evaluation } from './stockfish.service';

// Curves: https://lichess.org/page/accuracy. Our game figure is a simple mean,
// not Lichess's volatility-weighted/harmonic game accuracy aggregate.
export function whiteWinPercent(evaluation: Evaluation): number {
  if (evaluation.score.type === 'mate') {
    if (evaluation.score.value === 0) return evaluation.sideToMove === 'white' ? 0 : 100;
    return evaluation.score.value > 0 ? 100 : 0;
  }
  return 100 / (1 + Math.exp(-0.00368208 * evaluation.score.value));
}
export function chanceLoss(color: 'w' | 'b', before: Evaluation, after: Evaluation) {
  return Math.max(0, (whiteWinPercent(before) - whiteWinPercent(after)) * (color === 'w' ? 1 : -1));
}
export function moveAccuracy(loss: number) {
  if (loss <= 0) return 100;
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
}
export function meanAccuracy(values: number[]): number | null {
  return values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;
}
