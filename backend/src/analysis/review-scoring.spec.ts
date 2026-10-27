import { chanceLoss, meanAccuracy, moveAccuracy, whiteWinPercent } from './review-scoring';
import type { Evaluation } from './stockfish.service';
const evaluation = (
  value: number,
  type: 'cp' | 'mate' = 'cp',
  sideToMove: 'white' | 'black' = 'white',
): Evaluation => ({
  engine: 'test',
  fen: '',
  depth: 14,
  pv: [],
  elapsedMs: 0,
  bestMove: null,
  sideToMove,
  score: { type, value, perspective: 'white' },
});
describe('Winning-chance review scoring', () => {
  it('does not call a 300cp drop a blunder when the position is already heavily won', () => {
    expect(chanceLoss('w', evaluation(1200), evaluation(900))).toBeLessThan(5);
    expect(chanceLoss('w', evaluation(0), evaluation(-300))).toBeGreaterThan(20);
    expect(chanceLoss('b', evaluation(-1200), evaluation(-900))).toBeLessThan(5);
    expect(chanceLoss('b', evaluation(0), evaluation(300))).toBeGreaterThan(20);
  });
  it('does not punish a slower forced mate and handles checkmate zero for either side', () => {
    expect(chanceLoss('w', evaluation(2, 'mate'), evaluation(6, 'mate'))).toBe(0);
    expect(chanceLoss('b', evaluation(-2, 'mate'), evaluation(-6, 'mate'))).toBe(0);
    expect(whiteWinPercent(evaluation(0, 'mate', 'white'))).toBe(0);
    expect(whiteWinPercent(evaluation(0, 'mate', 'black'))).toBe(100);
    expect(chanceLoss('w', evaluation(1, 'mate'), evaluation(-1, 'mate'))).toBe(100);
  });
  it('returns bounded estimates and leaves absent player data empty', () => {
    expect(moveAccuracy(0)).toBe(100);
    expect(moveAccuracy(100)).toBeGreaterThanOrEqual(0);
    expect(moveAccuracy(20)).toBeLessThan(moveAccuracy(5));
    expect(meanAccuracy([])).toBeNull();
    expect(meanAccuracy([100, 80])).toBe(90);
  });
});
