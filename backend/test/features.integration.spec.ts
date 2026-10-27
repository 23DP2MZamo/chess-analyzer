import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaService } from '../src/prisma/prisma.service';
import { GamesService } from '../src/games/games.service';
import { LichessClient } from '../src/accounts/lichess.client';
import { ChessComClient } from '../src/accounts/chesscom.client';
import { UserService } from '../src/user/user.service';

describe('PostgreSQL profile and duplicate prevention', () => {
  const schema = 'test_features_' + randomUUID().replaceAll('-', '');
  const sql = new Client({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }, { schema }),
  });
  beforeAll(async () => {
    await sql.connect();
    await sql.query('CREATE SCHEMA "' + schema + '"');
    await sql.query('SET search_path TO "' + schema + '"');
    for (const name of [
      '20260907182218_chess_migration',
      '20261020110400_user_scoped_game_uniqueness',
      '20261026120000_admin_user_management',
    ]) {
      await sql.query(
        readFileSync(resolve(__dirname, '../prisma/migrations', name, 'migration.sql'), 'utf8'),
      );
    }
  }, 30000);
  const rollback = new Error('ROLLBACK_TEST_FIXTURES');
  afterAll(async () => {
    await db.$disconnect();
    // The generated schema name is the only deletion target; application data is untouched.
    if (!/^test_features_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
    await sql.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await sql.end();
  });

  it('persists Chess.com months, skips duplicates and preserves earlier months on API failure', async () => {
    let reachedEnd = false;
    try {
      await db.$transaction(
        async (tx) => {
          const id = randomUUID();
          await tx.user.create({
            data: {
              id,
              username: 'chesscom-' + id,
              email: id + '@example.com',
              passwordHash: 'fixture',
            },
          });
          await tx.linkedAccount.create({
            data: {
              userId: id,
              platform: 'CHESSCOM',
              platformUsername: 'TestPlayer',
            },
          });
          const game = {
            uuid: 'chesscom-' + randomUUID(),
            pgn: '[Result "1-0"]',
            white: { username: 'TestPlayer', result: 'win', rating: 1500 },
            black: { username: 'Opponent', result: 'resigned', rating: 1400 },
            end_time: 1700000000,
            rated: true,
            time_class: 'blitz',
          };
          const chesscom = {
            getGameArchives: jest.fn().mockResolvedValue({ archives: ['01', '02'] }),
            getArchiveGames: jest
              .fn()
              .mockResolvedValueOnce({ games: [game] })
              .mockRejectedValueOnce(new Error('upstream unavailable')),
          };
          const service = new GamesService(
            tx as unknown as PrismaService,
            chesscom as unknown as ChessComClient,
            {} as LichessClient,
          );
          await expect(service.importChessComGames(id)).rejects.toThrow('upstream unavailable');
          expect(await tx.game.count({ where: { userId: id } })).toBe(1);
          chesscom.getArchiveGames
            .mockResolvedValueOnce({ games: [game] })
            .mockResolvedValueOnce({ games: [{ ...game, uuid: game.uuid + '-second' }] });
          expect(await service.importChessComGames(id)).toEqual({ imported: 1, skipped: 1 });
          const saved = await tx.game.findMany({ where: { userId: id } });
          expect(saved).toHaveLength(2);
          expect(saved[0]).toMatchObject({
            userId: id,
            platform: 'CHESSCOM',
            pgn: game.pgn,
            whiteElo: 1500,
            result: 'WHITE_WIN',
          });
          reachedEnd = true;
          throw rollback;
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(reachedEnd).toBe(true);
  }, 30000);

  it('persists a profile and deduplicates games separately for each owner', async () => {
    const ids: string[] = [];
    let reachedEnd = false;
    try {
      await db.$transaction(
        async (tx) => {
          for (let i = 0; i < 2; i++) {
            const id = randomUUID();
            ids.push(id);
            await tx.user.create({
              data: {
                id,
                username: 'test-' + id,
                email: id + '@example.com',
                passwordHash: 'fixture',
              },
            });
            await tx.linkedAccount.create({
              data: { userId: id, platform: 'LICHESS', platformUsername: 'TestPlayer' },
            });
          }
          const lichess = {
            getUserGames: jest.fn().mockResolvedValue([
              {
                id: 'integration-' + randomUUID(),
                pgn: '[Result "1-0"]',
                createdAt: 1700000000000,
                rated: true,
                speed: 'blitz',
                players: {
                  white: { user: { name: 'TestPlayer' } },
                  black: { user: { name: 'Opponent' } },
                },
              },
            ]),
          };
          const service = new GamesService(
            tx as unknown as PrismaService,
            {} as ChessComClient,
            lichess as unknown as LichessClient,
          );
          expect(await service.importLichessGames(ids[0], 10)).toEqual({ imported: 1, skipped: 0 });
          expect(await service.importLichessGames(ids[0], 10)).toEqual({ imported: 0, skipped: 1 });
          expect(await service.importLichessGames(ids[1], 10)).toEqual({ imported: 1, skipped: 0 });
          expect(await tx.game.count({ where: { userId: { in: ids } } })).toBe(2);
          for (const userId of ids) expect(await tx.game.count({ where: { userId } })).toBe(1);

          const profiles = new UserService(tx as unknown as PrismaService);
          await profiles.update(ids[0], {
            username: 'updated-' + ids[0],
            email: 'updated-' + ids[0] + '@example.com',
          });
          expect(await profiles.findById(ids[0])).toMatchObject({
            username: 'updated-' + ids[0],
            email: 'updated-' + ids[0] + '@example.com',
          });
          reachedEnd = true;
          throw rollback;
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(reachedEnd).toBe(true);
    expect(await db.user.count({ where: { id: { in: ids } } })).toBe(0);
  }, 30000);
});
