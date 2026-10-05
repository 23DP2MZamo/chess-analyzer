import { NotFoundException } from '@nestjs/common';
import { Platform } from '../../generated/prisma/client';
import { ChessComClient } from '../accounts/chesscom.client';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from './games.service';

describe('GamesService', () => {
  let service: GamesService;
  let prismaService: {
    linkedAccount: { findFirst: jest.Mock };
    game: { createMany: jest.Mock };
  };
  let chessComClient: {
    getGameArchives: jest.Mock;
    getArchiveGames: jest.Mock;
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

  beforeEach(() => {
    prismaService = {
      linkedAccount: { findFirst: jest.fn() },
      game: { createMany: jest.fn() },
    };
    chessComClient = {
      getGameArchives: jest.fn(),
      getArchiveGames: jest.fn(),
    };
    service = new GamesService(
      prismaService as unknown as PrismaService,
      chessComClient as unknown as ChessComClient,
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

  it('repeated imports skip games already present in the shared table', async () => {
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
});
