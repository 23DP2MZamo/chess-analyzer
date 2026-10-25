import { NotFoundException } from '@nestjs/common';
import { Platform, Prisma } from '../../generated/prisma/client';
import { ChessComClient } from '../accounts/chesscom.client';
import { LichessClient } from '../accounts/lichess.client';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;
  let prismaService: {
    linkedAccount: { findFirst: jest.Mock; findMany: jest.Mock };
    game: { createMany: jest.Mock; findMany: jest.Mock; upsert: jest.Mock; findUnique: jest.Mock };
  };
  let chessComClient: {
    getGameArchives: jest.Mock;
    getArchiveGames: jest.Mock;
  };
  let lichessClient: {
    getUserGames: jest.Mock;
  };

  const chessGame = {
    uuid: 'game-uuid',
    pgn: '[Event "Live Chess"]',
    white: { username: 'WhitePlayer', result: 'win' },
    black: { username: 'BlackPlayer', result: 'checkmated' },
    end_time: 1_700_000_000,
    rated: true,
    time_class: 'blitz',
  };
  const lichessGame = {
    id: 'lichess-game-id',
    pgn: '[Event "Rated Blitz game"]\n[Result "1-0"]',
    createdAt: 1_700_000_000_000,
    rated: true,
    speed: 'blitz',
    winner: 'white',
    clock: { initial: 180, increment: 0 },
    players: {
      white: { user: { name: 'WhitePlayer' }, rating: 2400 },
      black: { user: { name: 'BlackPlayer' }, rating: 2300 },
    },
  };

  beforeEach(() => {
    prismaService = {
      linkedAccount: { findFirst: jest.fn(), findMany: jest.fn() },
      game: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    prismaService.game.findMany.mockResolvedValue([]);
    chessComClient = {
      getGameArchives: jest.fn(),
      getArchiveGames: jest.fn(),
    };
    lichessClient = {
      getUserGames: jest.fn(),
    };
    service = new GamesService(
      prismaService as unknown as PrismaService,
      chessComClient as unknown as ChessComClient,
      lichessClient as unknown as LichessClient,
    );
  });

  it('imports archive games under the authenticated user and returns inserted/skipped counts', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'Hikaru',
    });
    chessComClient.getGameArchives.mockResolvedValue({ archives: ['archive-url'] });
    chessComClient.getArchiveGames.mockResolvedValue({ games: [chessGame, chessGame] });
    prismaService.game.createMany.mockResolvedValue({ count: 1 });

    await expect(service.importChessComGames('authenticated-user-id')).resolves.toEqual({
      imported: 1,
      skipped: 1,
    });

    expect(prismaService.linkedAccount.findFirst).toHaveBeenCalledWith({
      where: { userId: 'authenticated-user-id', platform: Platform.CHESSCOM },
    });
    expect(chessComClient.getGameArchives).toHaveBeenCalledWith('Hikaru');
    expect(chessComClient.getArchiveGames).toHaveBeenCalledWith('archive-url');
    expect(prismaService.game.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'authenticated-user-id' }), expect.any(Object)],
      skipDuplicates: true,
    });
  });

  it('returns a clear not found error when no Chess.com account is linked', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue(null);

    await expect(service.importChessComGames('authenticated-user-id')).rejects.toEqual(
      new NotFoundException('No Chess.com account is linked'),
    );
    expect(chessComClient.getGameArchives).not.toHaveBeenCalled();
    expect(prismaService.game.createMany).not.toHaveBeenCalled();
  });

  it('repeated imports skip games already imported for the same user', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue({ platformUsername: 'Hikaru' });
    chessComClient.getGameArchives.mockResolvedValue({ archives: ['archive-url'] });
    chessComClient.getArchiveGames.mockResolvedValue({ games: [chessGame] });
    prismaService.game.createMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(service.importChessComGames('user-id')).resolves.toEqual({
      imported: 1,
      skipped: 0,
    });
    await expect(service.importChessComGames('user-id')).resolves.toEqual({
      imported: 0,
      skipped: 1,
    });

    expect(prismaService.game.createMany).toHaveBeenCalledTimes(2);
    expect(prismaService.game.createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it('fetches archive games in bounded batches', async () => {
    let activeRequests = 0;
    let maxActiveRequests = 0;
    const archives = Array.from({ length: 12 }, (_, index) => `archive-${index}`);
    prismaService.linkedAccount.findFirst.mockResolvedValue({ platformUsername: 'Hikaru' });
    chessComClient.getGameArchives.mockResolvedValue({ archives });
    chessComClient.getArchiveGames.mockImplementation(async () => {
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return { games: [] };
    });

    await expect(service.importChessComGames('user-id')).resolves.toEqual({
      imported: 0,
      skipped: 0,
    });

    expect(chessComClient.getArchiveGames).toHaveBeenCalledTimes(archives.length);
    expect(maxActiveRequests).toBe(5);
  });

  it('imports only the requested latest games with the correct user and compound key', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'realLichessUser',
    });
    lichessClient.getUserGames.mockResolvedValue([lichessGame]);
    prismaService.game.upsert.mockImplementation(({ create }: { create: { id: string } }) => ({
      id: create.id,
    }));
    await expect(service.importLichessGames('authenticated-user-id', 25)).resolves.toEqual({
      imported: 1,
      skipped: 0,
    });
    expect(lichessClient.getUserGames).toHaveBeenCalledWith('realLichessUser', undefined, 25);
    expect(prismaService.game.upsert).toHaveBeenCalledWith({
      where: {
        userId_platform_externalId: {
          userId: 'authenticated-user-id',
          platform: Platform.LICHESS,
          externalId: lichessGame.id,
        },
      },
      create: expect.objectContaining({
        userId: 'authenticated-user-id',
        platform: Platform.LICHESS,
        externalId: lichessGame.id,
      }) as unknown,
      update: { pgn: lichessGame.pgn },
      select: { id: true },
    });
  });

  it('repeated Lichess imports preserve saved records and allow the same game for another user', async () => {
    const records = new Map<string, { id: string }>();
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'realLichessUser',
    });
    lichessClient.getUserGames.mockResolvedValue([lichessGame, lichessGame]);
    prismaService.game.upsert.mockImplementation(
      ({
        where,
        create,
      }: {
        where: { userId_platform_externalId: { userId: string; externalId: string } };
        create: { id: string };
      }) => {
        const key = JSON.stringify(where);
        if (!records.has(key)) records.set(key, { id: create.id });
        return records.get(key);
      },
    );
    expect(await service.importLichessGames('user-a')).toEqual({ imported: 1, skipped: 1 });
    expect(await service.importLichessGames('user-a')).toEqual({ imported: 0, skipped: 2 });
    expect(await service.importLichessGames('user-b')).toEqual({ imported: 1, skipped: 1 });
    expect(records.size).toBe(2);
  });

  it('treats a concurrent unique-key race as an existing game', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'realLichessUser',
    });
    lichessClient.getUserGames.mockResolvedValue([lichessGame]);
    prismaService.game.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7' }),
    );
    prismaService.game.findUnique.mockResolvedValue({ id: 'already-saved' });
    expect(await service.importLichessGames('user')).toEqual({ imported: 0, skipped: 1 });
  });

  it('validates limits before contacting Lichess', async () => {
    for (const limit of [0, -1, 301, 1.5, NaN]) {
      await expect(service.importLichessGames('user', limit)).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(lichessClient.getUserGames).not.toHaveBeenCalled();
  });

  it('propagates upstream errors without writes and releases its import lock', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'realLichessUser',
    });
    lichessClient.getUserGames
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce([]);
    await expect(service.importLichessGames('user')).rejects.toThrow('rate limited');
    expect(prismaService.game.upsert).not.toHaveBeenCalled();
    expect(await service.importLichessGames('user')).toEqual({ imported: 0, skipped: 0 });
  });

  it('prevents overlapping imports for the same user', async () => {
    let complete!: (value: unknown[]) => void;
    prismaService.linkedAccount.findFirst.mockResolvedValue({
      platformUsername: 'realLichessUser',
    });
    lichessClient.getUserGames.mockReturnValue(
      new Promise((resolve) => {
        complete = resolve;
      }),
    );
    const first = service.importLichessGames('user');
    await Promise.resolve();
    await expect(service.importLichessGames('user')).rejects.toMatchObject({ status: 409 });
    complete([]);
    await first;
  });

  it('returns not found if the authenticated user has no linked Lichess account', async () => {
    prismaService.linkedAccount.findFirst.mockResolvedValue(null);

    await expect(service.importLichessGames('user-id')).rejects.toEqual(
      new NotFoundException('No Lichess account is linked'),
    );
    expect(lichessClient.getUserGames).not.toHaveBeenCalled();
    expect(prismaService.game.createMany).not.toHaveBeenCalled();
  });

  it('counts wins only when the linked account played the winning color', async () => {
    prismaService.linkedAccount.findMany.mockResolvedValue([
      { platform: Platform.CHESSCOM, platformUsername: 'Hikaru' },
      { platform: Platform.LICHESS, platformUsername: 'RealLichessUser' },
    ]);
    prismaService.game.findMany.mockResolvedValue([
      {
        platform: Platform.CHESSCOM,
        result: 'BLACK_WIN',
        whiteUsername: 'Hikaru',
        blackUsername: 'Opponent',
        analysis: null,
      },
      {
        platform: Platform.LICHESS,
        result: 'WHITE_WIN',
        whiteUsername: 'Opponent',
        blackUsername: 'reallichessuser',
        analysis: null,
      },
      {
        platform: Platform.LICHESS,
        result: 'BLACK_WIN',
        whiteUsername: 'Opponent',
        blackUsername: 'RealLichessUser',
        analysis: null,
      },
      {
        platform: Platform.CHESSCOM,
        result: 'DRAW',
        whiteUsername: 'Hikaru',
        blackUsername: 'Opponent',
        analysis: null,
      },
    ]);

    await expect(service.getStats('user-id')).resolves.toEqual({
      totalGames: 4,
      wins: 1,
      draws: 1,
      losses: 2,
      winrate: 25,
      averageAccuracy: null,
    });

    expect(prismaService.linkedAccount.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      select: { platform: true, platformUsername: true },
    });
  });
});
