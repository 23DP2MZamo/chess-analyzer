import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Chess, DEFAULT_POSITION } from 'chess.js';
import { GameReviewService, classifyMove, readGame } from './game-review.service';
import { StockfishService, type Evaluation } from './stockfish.service';
import { PrismaService } from '../prisma/prisma.service';
import { SAMPLE_GAMES, sampleGame } from '../games/sample-games';
const evaluate = (fen = DEFAULT_POSITION, value = 20): Evaluation => ({
  fen,
  engine: 'Stockfish test',
  sideToMove: fen.split(' ')[1] === 'w' ? 'white' : 'black',
  score: { type: 'cp', value, perspective: 'white' },
  bestMove: 'e2e4',
  depth: 8,
  pv: [],
  elapsedMs: 1,
});
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
describe('Game review', () => {
  const game = {
    id: 'owned-game',
    pgn: '1. e4 e5 2. Nf3 Nc6 *',
    whiteUsername: 'Owner',
    blackUsername: 'Opponent',
  };
  const db = {
    game: { findFirst: jest.fn() },
    analysis: { findUnique: jest.fn(), upsert: jest.fn() },
  };
  const engine = { analyze: jest.fn() };
  let service: GameReviewService;
  beforeEach(() => {
    jest.clearAllMocks();
    db.game.findFirst.mockResolvedValue(game);
    db.analysis.findUnique.mockResolvedValue(null);
    db.analysis.upsert.mockResolvedValue({});
    engine.analyze.mockImplementation(({ fen }: { fen: string }) => Promise.resolve(evaluate(fen)));
    service = new GameReviewService(
      db as unknown as PrismaService,
      engine as unknown as StockfishService,
    );
  });
  afterEach(() => service.onModuleDestroy());
  it('rejects another owner without starting the engine', async () => {
    db.game.findFirst.mockResolvedValue(null);
    await expect(service.start('other-user', game.id)).rejects.toMatchObject({ status: 404 });
    expect(db.game.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: game.id, userId: 'other-user' } }),
    );
    expect(engine.analyze).not.toHaveBeenCalled();
  });
  it('reviews all moves with history and saves results in one atomic write', async () => {
    expect(await service.start('owner', game.id)).toMatchObject({ status: 'running', total: 4 });
    await flush();
    expect(engine.analyze).toHaveBeenCalledTimes(5);
    expect(
      (
        engine.analyze.mock.calls as [unknown, number, { initialFen: string; moves: string[] }][]
      )[4][2],
    ).toEqual({
      initialFen: DEFAULT_POSITION,
      moves: ['e2e4', 'e7e5', 'g1f3', 'b8c6'],
    });
    const saved = (db.analysis.upsert.mock.calls as unknown[][])[0][0] as {
      where: { gameId: string };
      create: {
        moves: {
          create: { moveNumber: number; color: string; san: string; classification: string }[];
        };
      };
      update: { moves: { deleteMany: object } };
    };
    expect(saved.where).toEqual({ gameId: game.id });
    expect(saved.create.moves.create).toHaveLength(4);
    expect(saved.update.moves.deleteMany).toEqual({});
    expect(saved.create.moves.create[0]).toMatchObject({
      moveNumber: 1,
      color: 'WHITE',
      san: 'e4',
      classification: 'BEST',
    });
  });
  it('deduplicates an active review and limits other jobs for the same user', async () => {
    engine.analyze.mockImplementation(() => new Promise(() => {}));
    await service.start('owner', game.id);
    expect(await service.start('owner', game.id)).toMatchObject({ status: 'running' });
    await expect(service.start('owner', 'second-game')).rejects.toMatchObject({ status: 429 });
    expect(engine.analyze).toHaveBeenCalledTimes(1);
  });
  it('does not persist a failed or cancelled partial review', async () => {
    engine.analyze
      .mockResolvedValueOnce(evaluate())
      .mockRejectedValueOnce(new ServiceUnavailableException('Engine unavailable'));
    await service.start('owner', game.id);
    await flush();
    expect(await service.status('owner', game.id)).toMatchObject({
      status: 'failed',
      error: 'Engine unavailable',
    });
    expect(db.analysis.upsert).not.toHaveBeenCalled();
    let done!: (value: Evaluation) => void;
    engine.analyze.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          done = resolve;
        }),
    );
    await service.start('owner', game.id);
    await service.cancel('owner', game.id);
    done(evaluate());
    await flush();
    expect(await service.status('owner', game.id)).toMatchObject({ status: 'cancelled' });
    expect(db.analysis.upsert).not.toHaveBeenCalled();
  });
  it('serves samples without reading or writing personal game history', async () => {
    for (const fixture of SAMPLE_GAMES) expect(readGame(fixture.pgn).length).toBeGreaterThan(0);
    expect(await service.detail('owner', 'sample-fools-mate')).toMatchObject({
      isSample: true,
      moves: (await service.detail('owner', 'sample-fools-mate')).moves,
      pgn: undefined,
    });
    await service.start('owner', 'sample-fools-mate');
    await flush();
    expect(await service.status('owner', 'sample-fools-mate')).toMatchObject({
      status: 'completed',
      total: 4,
    });
    expect(db.game.findFirst).not.toHaveBeenCalled();
    expect(db.analysis.upsert).not.toHaveBeenCalled();
    expect(sampleGame('sample-not-real')).toBeNull();
  });
  it('validates unusable PGNs and classifies loss from the moving color’s perspective', () => {
    expect(() => readGame('')).toThrow(BadRequestException);
    expect(() => readGame('1. e4 e5 2. nonsense')).toThrow(BadRequestException);
    expect(() => readGame('[Result "1-0"]')).toThrow(BadRequestException);
    const chess = new Chess();
    const white = chess.move('d4');
    const black = chess.move('d5');
    expect(classifyMove(white, evaluate(white.before, 0), evaluate(white.after, -350))).toBe(
      'BLUNDER',
    );
    expect(classifyMove(black, evaluate(black.before, 0), evaluate(black.after, 250))).toBe(
      'MISTAKE',
    );
    expect(classifyMove(black, evaluate(black.before, 0), evaluate(black.after, -250))).toBe(
      'GOOD',
    );
  });
});
