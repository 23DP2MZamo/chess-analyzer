import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedSampleGames } from '../src/games/sample-seed';
import { GameReviewService } from '../src/analysis/game-review.service';
import { StockfishService } from '../src/analysis/stockfish.service';

describe('Stored sample games and full game review', () => {
  const schema = 'test_review_' + randomUUID().replaceAll('-', '');
  const sql = new Client({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL, options: '-c search_path=' + schema },
      { schema },
    ),
  });
  const password = 'test-fixture-password-only';
  const engine = {
    analyze: jest.fn().mockImplementation(({ fen }: { fen: string }) =>
      Promise.resolve({
        fen,
        sideToMove: fen.split(' ')[1] === 'w' ? 'white' : 'black',
        engine: 'test-engine',
        depth: 8,
        score: { type: 'cp', value: 20, perspective: 'white' },
        bestMove: 'e2e4',
        pv: [],
        elapsedMs: 1,
      }),
    ),
  };
  let review: GameReviewService;
  beforeAll(async () => {
    await sql.connect();
    await sql.query('CREATE SCHEMA "' + schema + '"');
    await sql.query('SET search_path TO "' + schema + '"');
    const directory = resolve(__dirname, '../prisma/migrations');
    for (const name of readdirSync(directory)
      .filter((name) => /^\d/.test(name))
      .sort())
      await sql.query(readFileSync(resolve(directory, name, 'migration.sql'), 'utf8'));
    review = new GameReviewService(db, engine as unknown as StockfishService);
  }, 30000);
  afterAll(async () => {
    review?.onModuleDestroy();
    await db.$disconnect();
    if (!/^test_review_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
    await sql.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await sql.end();
  });
  it('seeds a dedicated demo identity idempotently and rejects overwriting another identity', async () => {
    const first = await seedSampleGames(db, 'demo-preview@example.test', password);
    const second = await seedSampleGames(db, 'demo-preview@example.test', password);
    expect(second.userId).toBe(first.userId);
    expect(await db.user.count()).toBe(1);
    expect(await db.game.count()).toBe(3);
    await expect(
      seedSampleGames(db, 'demo-preview@example.test', 'wrong-fixture-password'),
    ).rejects.toMatchObject({ status: 400 });
    await expect(seedSampleGames(db, 'real@example.com', password)).rejects.toMatchObject({
      status: 400,
    });
    expect(await db.game.count()).toBe(3);
  }, 20000);
  it('persists every move and reloads the completed result after a service restart', async () => {
    const owner = await db.user.findUniqueOrThrow({
      where: { email: 'demo-preview@example.test' },
    });
    const game = await db.game.findFirstOrThrow({
      where: { userId: owner.id, externalId: 'sample-fools-mate' },
    });
    await expect(review.detail(randomUUID(), game.id)).rejects.toMatchObject({ status: 404 });
    expect(await review.start(owner.id, game.id)).toMatchObject({ status: 'running', total: 4 });
    let state: Awaited<ReturnType<GameReviewService['status']>> | undefined;
    for (let i = 0; i < 60; i++) {
      state = await review.status(owner.id, game.id);
      if (state.status !== 'running') break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(state).toMatchObject({ status: 'completed', total: 4 });
    const saved = await db.analysis.findUniqueOrThrow({
      where: { gameId: game.id },
      include: { moves: true },
    });
    expect(saved.moves).toHaveLength(4);
    expect(saved.accuracyWhite).toBeNull();
    const reopened = new GameReviewService(db, engine as unknown as StockfishService);
    const reopenedState = await reopened.status(owner.id, game.id);
    if (reopenedState.status !== 'completed' || !('result' in reopenedState))
      throw new Error('Review was not persisted');
    expect(
      (reopenedState as { result: { moves: { san: string }[] } }).result.moves.map(
        (move) => move.san,
      ),
    ).toEqual(['f3', 'e5', 'g4', 'Qh4#']);
    expect(reopenedState).toMatchObject({
      status: 'completed',
      total: 4,
    });
    reopened.onModuleDestroy();
  }, 20000);
});
