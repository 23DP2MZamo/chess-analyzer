import { Chess, DEFAULT_POSITION } from 'chess.js';
import { StockfishService, parseScore, validatePosition } from './stockfish.service';

describe('Stockfish (real bundled engine)', () => {
  let service: StockfishService;
  beforeEach(() => {
    service = new StockfishService();
  });
  afterEach(() => service.onModuleDestroy());

  it('evaluates the starting position and returns a legal best move', async () => {
    const result = await service.analyze({ fen: DEFAULT_POSITION, depth: 5 });
    expect(result.engine).toContain('Stockfish');
    expect(result.depth).toBe(5);
    expect(result.score).toMatchObject({ type: 'cp', perspective: 'white' });
    expect(Number.isFinite(result.score.value)).toBe(true);
    expect(new Chess().moves({ verbose: true }).map((move) => move.from + move.to)).toContain(
      result.bestMove,
    );
    expect(result.pv.length).toBeGreaterThan(0);
  }, 20000);

  it('handles checkmate and stalemate without a legal move', async () => {
    const mate = await service.analyze({ fen: '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1', depth: 3 });
    expect(mate.bestMove).toBeNull();
    expect(mate.score.type).toBe('mate');
    expect(mate.score.value).toBeCloseTo(0);
    const stale = await service.analyze({ fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', depth: 3 });
    expect(stale.bestMove).toBeNull();
    expect(stale.score.type).toBe('cp');
    expect(stale.score.value).toBeCloseTo(0);
  }, 20000);

  it('finds mate for Black and reports a negative White-perspective mate score', async () => {
    const result = await service.analyze({ fen: '8/8/8/8/8/6k1/5q2/7K b - - 0 1', depth: 4 });
    expect(result.score.type).toBe('mate');
    expect(result.score.value).toBeLessThan(0);
  }, 20000);

  it.each([
    'not a fen',
    DEFAULT_POSITION + '\nquit',
    '8/8/8/8/8/8/8/8 w - - 0 1',
    '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1',
    '4k3/8/8/8/8/QQ6/PPPPPPPP/4K3 w - - 0 1',
  ])('rejects malformed or illegal input: %s', (fen) => {
    expect(() => validatePosition(fen)).toThrow();
  });

  it('normalizes centipawn and mate scores and ignores bounds/secondary variations', () => {
    expect(parseScore('info depth 8 score cp 125 pv e7e5', 'b')).toMatchObject({
      depth: 8,
      score: { value: -125, type: 'cp' },
      pv: ['e7e5'],
    });
    expect(parseScore('info depth 8 score mate -3 pv a1a2', 'b')?.score.value).toBe(3);
    expect(parseScore('info depth 8 score cp 10 lowerbound', 'w')).toBeNull();
    expect(parseScore('info depth 8 multipv 2 score cp 10', 'w')).toBeNull();
  });
});
