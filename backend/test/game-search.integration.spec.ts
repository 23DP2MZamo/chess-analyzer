import { GamesService } from '../src/games/games.service';
import { LichessClient } from '../src/accounts/lichess.client';
import { ChessComClient } from '../src/accounts/chesscom.client';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameSearchService } from '../src/games/game-search.service';
import { SearchGamesDto } from '../src/games/search-games.dto';

type Result = {
  total: number;
  page: number;
  items: {
    id: string;
    externalId: string;
    playerResult: string;
    playerElo: number | null;
    playerAccuracy: number | null;
    opening: { eco: string; name: string } | null;
  }[];
  groups: { key: string; count: number; eco: string | null }[];
};

describe('PostgreSQL game filters, sorting and opening groups', () => {
  const schema = 'test_search_' + randomUUID().replaceAll('-', '');
  const sql = new Client({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL, options: '-c search_path=' + schema },
      { schema },
    ),
  });
  const service = new GameSearchService(db);
  const owner = randomUUID();
  const other = randomUUID();
  const search = (query: Partial<SearchGamesDto> = {}) =>
    service.search(owner, Object.assign(new SearchGamesDto(), query)) as Promise<Result>;

  beforeAll(async () => {
    await sql.connect();
    await sql.query('CREATE SCHEMA "' + schema + '"');
    await sql.query('SET search_path TO "' + schema + '"');
    for (const name of [
      '20260907182218_chess_migration',
      '20261020110400_user_scoped_game_uniqueness',
    ]) {
      await sql.query(
        readFileSync(resolve(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8'),
      );
    }
    for (const id of [owner, other]) {
      await db.user.create({
        data: {
          id,
          username: 'fixture-' + id,
          email: id + '@example.com',
          passwordHash: 'fixture',
        },
      });
      await db.linkedAccount.create({
        data: { userId: id, platform: 'LICHESS', platformUsername: 'TestPlayer' },
      });
    }
    const opening = await db.opening.create({ data: { eco: 'C20', name: "King's Pawn Game" } });
    const games = [
      {
        externalId: 'white-win',
        whiteUsername: 'testPLAYER',
        blackUsername: 'Opponent',
        result: 'WHITE_WIN' as const,
        format: 'BLITZ' as const,
        mode: 'RATED' as const,
        playedAt: new Date('2026-10-01T23:59:59.000Z'),
        whiteElo: 1500,
        blackElo: 1000,
        openingId: opening.id,
        accuracyWhite: 90,
        accuracyBlack: 50,
      },
      {
        externalId: 'black-loss',
        whiteUsername: 'Opponent',
        blackUsername: 'TestPlayer',
        result: 'WHITE_WIN' as const,
        format: 'RAPID' as const,
        mode: 'CASUAL' as const,
        playedAt: new Date('2026-10-02T00:00:00.000Z'),
        whiteElo: 2200,
        blackElo: 1600,
        openingId: null,
        accuracyWhite: 99,
        accuracyBlack: 60,
      },
      {
        externalId: 'black-win',
        whiteUsername: 'Opponent',
        blackUsername: 'TestPlayer',
        result: 'BLACK_WIN' as const,
        format: 'BULLET' as const,
        mode: 'RATED' as const,
        playedAt: new Date('2026-10-03T12:00:00.000Z'),
        whiteElo: 1200,
        blackElo: 1700,
        openingId: null,
        accuracyWhite: 30,
        accuracyBlack: 80,
      },
      {
        externalId: 'draw',
        whiteUsername: 'TestPlayer',
        blackUsername: 'Opponent',
        result: 'DRAW' as const,
        format: 'CLASSICAL' as const,
        mode: 'CASUAL' as const,
        playedAt: new Date('2026-10-04T12:00:00.000Z'),
        whiteElo: null,
        blackElo: 1800,
        openingId: null,
        accuracyWhite: null,
        accuracyBlack: null,
      },
      {
        externalId: 'unknown',
        whiteUsername: 'Someone',
        blackUsername: 'Another',
        result: 'DRAW' as const,
        format: 'BLITZ' as const,
        mode: 'RATED' as const,
        playedAt: new Date('2026-10-05T12:00:00.000Z'),
        whiteElo: 3000,
        blackElo: 2900,
        openingId: null,
        accuracyWhite: null,
        accuracyBlack: null,
      },
    ];
    for (const { accuracyWhite, accuracyBlack, ...game } of games) {
      await db.game.create({
        data: {
          ...game,
          userId: owner,
          platform: 'LICHESS',
          pgn:
            game.externalId === 'black-loss' || game.externalId === 'black-win'
              ? '[ECO "B20"]\n[Opening "Sicilian Defense"]'
              : '',
          analysis:
            accuracyWhite === null ? undefined : { create: { accuracyWhite, accuracyBlack } },
        },
      });
    }
    await db.game.create({
      data: {
        userId: other,
        platform: 'LICHESS',
        externalId: 'private',
        pgn: '',
        whiteUsername: 'TestPlayer',
        blackUsername: 'Other',
        result: 'WHITE_WIN',
        format: 'BLITZ',
        mode: 'RATED',
        playedAt: new Date(),
      },
    });
  }, 60000);
  afterAll(async () => {
    await db.$disconnect();
    if (!/^test_search_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
    await sql.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await sql.end();
  });

  it('isolates owners and infers results case-insensitively for both colors', async () => {
    const all = await search();
    expect(all.total).toBe(5);
    expect(all.items.some((g) => g.externalId === 'private')).toBe(false);
    expect((await search({ result: 'WIN' })).items.map((g) => g.externalId)).toEqual([
      'black-win',
      'white-win',
    ]);
    expect((await search({ result: 'LOSS' })).items.map((g) => g.externalId)).toEqual([
      'black-loss',
    ]);
    expect((await search({ result: 'DRAW' })).items.map((g) => g.externalId)).toEqual(['draw']);
  });
  it('combines format, mode, result, date and opening filters before pagination', async () => {
    for (const format of ['BULLET', 'RAPID', 'CLASSICAL'])
      expect((await search({ format })).total).toBe(1);
    expect(
      (
        await search({
          format: 'BLITZ',
          mode: 'RATED',
          result: 'WIN',
          dateFrom: '2026-10-01',
          dateTo: '2026-10-01',
          opening: 'c20',
        })
      ).items.map((g) => g.externalId),
    ).toEqual(['white-win']);
    expect((await search({ mode: 'CASUAL' })).total).toBe(2);
    expect((await search({ dateFrom: '2026-10-01', dateTo: '2026-10-01' })).total).toBe(1);
    expect((await search({ dateFrom: '2026-10-02', dateTo: '2026-10-02' })).total).toBe(1);
    expect((await search({ opening: 'sICILian' })).total).toBe(2);
    expect((await search({ opening: "%'; DROP TABLE games; --" })).total).toBe(0);
  });
  it('sorts own Elo/accuracy with missing values last in either direction', async () => {
    expect((await search({ sortBy: 'elo', order: 'asc' })).items.map((g) => g.playerElo)).toEqual([
      1500,
      1600,
      1700,
      null,
      null,
    ]);
    expect((await search({ sortBy: 'elo', order: 'desc' })).items.map((g) => g.playerElo)).toEqual([
      1700,
      1600,
      1500,
      null,
      null,
    ]);
    expect(
      (await search({ sortBy: 'accuracy', order: 'asc' })).items.map((g) => g.playerAccuracy),
    ).toEqual([60, 80, 90, null, null]);
    expect(
      (await search({ sortBy: 'accuracy', order: 'desc' })).items.map((g) => g.playerAccuracy),
    ).toEqual([90, 80, 60, null, null]);
    expect(
      (await search({ sortBy: 'date', order: 'asc', pageSize: 2, page: 2 })).items.map(
        (g) => g.externalId,
      ),
    ).toEqual(['black-win', 'draw']);
  });
  it('groups seeded and PGN openings and keeps totals across pages', async () => {
    const grouped = await search({ groupBy: 'opening', pageSize: 1 });
    expect(grouped.total).toBe(5);
    expect(grouped.items).toHaveLength(1);
    expect(grouped.groups.map((g) => [g.eco, g.count])).toEqual([
      ['B20', 2],
      ['C20', 1],
      [null, 2],
    ]);
    expect((await search({ groupBy: 'opening', opening: 'Sicilian' })).groups).toHaveLength(1);
    expect((await search({ page: 2, pageSize: 100 })).items).toEqual([]);
  });
  it('rejects invalid calendar dates and reversed ranges', async () => {
    await expect(search({ dateFrom: '2026-02-30' })).rejects.toMatchObject({ status: 400 });
    await expect(search({ dateFrom: '2026-10-05', dateTo: '2026-10-01' })).rejects.toMatchObject({
      status: 400,
    });
  });
  it('refreshes imported opening tags without duplicating games or replacing analyses', async () => {
    const before = await db.game.findUniqueOrThrow({
      where: {
        userId_platform_externalId: {
          userId: owner,
          platform: 'LICHESS',
          externalId: 'black-loss',
        },
      },
      include: { analysis: true },
    });
    const pgn = '[Result "1-0"]\n[ECO "B21"]\n[Opening "Sicilian Defense: Smith-Morra"]';
    const lichess = {
      getUserGames: jest.fn().mockResolvedValue([
        {
          id: 'black-loss',
          pgn,
          createdAt: Date.now(),
          rated: true,
          speed: 'blitz',
          players: {
            white: { user: { name: 'Opponent' } },
            black: { user: { name: 'TestPlayer' } },
          },
        },
      ]),
    };
    const imports = new GamesService(db, {} as ChessComClient, lichess as unknown as LichessClient);
    expect(await imports.importLichessGames(owner, 10)).toEqual({ imported: 0, skipped: 1 });
    const after = await db.game.findUniqueOrThrow({
      where: { id: before.id },
      include: { analysis: true },
    });
    expect(after.analysis).toEqual(before.analysis);
    expect(after.pgn).toBe(pgn);
    expect((await search({ opening: 'Smith-Morra' })).total).toBe(1);
    expect((await search()).total).toBe(5);
  });
});
