import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Platform } from '../../generated/prisma/client';
import { ChessComClient, type ChessComArchiveResponse } from '../accounts/chesscom.client';
import { LichessClient } from '../accounts/lichess.client';
import { PrismaService } from '../prisma/prisma.service';
import { mapChessComGame } from './chesscom-game.mapper';
import { parsePgn } from './pgn.parser';
import { mapLichessGame } from './lichess-game.mapper';

const INSERT_BATCH_SIZE = 100;
const ARCHIVE_FETCH_BATCH_SIZE = 5;

@Injectable()
export class GamesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly chessComClient: ChessComClient,
    private readonly lichessClient: LichessClient,
  ) {}

  listGames(userId: string) {
    return this.prismaService.game.findMany({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        platform: true,
        externalId: true,
        whiteUsername: true,
        blackUsername: true,
        whiteElo: true,
        blackElo: true,
        result: true,
        format: true,
        mode: true,
        timeControl: true,
        playedAt: true,
        opening: {
          select: {
            eco: true,
            name: true,
          },
        },
        analysis: {
          select: {
            accuracyWhite: true,
            accuracyBlack: true,
          },
        },
      },
    });
  }

  async getStats(userId: string) {
    const [games, linkedAccounts] = await Promise.all([
      this.prismaService.game.findMany({
        where: { userId },
        select: {
          platform: true,
          result: true,
          whiteUsername: true,
          blackUsername: true,
          analysis: {
            select: {
              accuracyWhite: true,
              accuracyBlack: true,
            },
          },
        },
      }),
      this.prismaService.linkedAccount.findMany({
        where: { userId },
        select: {
          platform: true,
          platformUsername: true,
        },
      }),
    ]);

    const linkedUsernames = new Map(
      linkedAccounts.map((account) => [account.platform, account.platformUsername.toLowerCase()]),
    );

    const isLinkedPlayer = (platform: Platform, username: string) =>
      linkedUsernames.get(platform) === username.toLowerCase();

    const wins = games.filter(
      (game) =>
        (game.result === 'WHITE_WIN' && isLinkedPlayer(game.platform, game.whiteUsername)) ||
        (game.result === 'BLACK_WIN' && isLinkedPlayer(game.platform, game.blackUsername)),
    );

    const accuracyValues = games.flatMap((game) =>
      [game.analysis?.accuracyWhite, game.analysis?.accuracyBlack].filter(
        (value): value is number => value != null,
      ),
    );

    const draws = games.filter((game) => game.result === 'DRAW').length;

    return {
      totalGames: games.length,
      wins: wins.length,
      draws,
      losses: games.length - wins.length - draws,
      winrate: games.length ? (wins.length / games.length) * 100 : 0,
      averageAccuracy: accuracyValues.length
        ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length
        : null,
    };
  }

  async importChessComGames(userId: string): Promise<{ imported: number; skipped: number }> {
    const linkedAccount = await this.prismaService.linkedAccount.findFirst({
      where: {
        userId,
        platform: Platform.CHESSCOM,
      },
    });

    if (!linkedAccount) {
      throw new NotFoundException('No Chess.com account is linked');
    }

    const { archives } = await this.chessComClient.getGameArchives(linkedAccount.platformUsername);

    const archiveResponses: ChessComArchiveResponse[] = [];

    for (let offset = 0; offset < archives.length; offset += ARCHIVE_FETCH_BATCH_SIZE) {
      const batch = await Promise.all(
        archives
          .slice(offset, offset + ARCHIVE_FETCH_BATCH_SIZE)
          .map((archiveUrl) => this.chessComClient.getArchiveGames(archiveUrl)),
      );

      archiveResponses.push(...batch);
    }

    const games = archiveResponses.flatMap((archive) => archive.games);
    let imported = 0;

    for (let offset = 0; offset < games.length; offset += INSERT_BATCH_SIZE) {
      const data = games
        .slice(offset, offset + INSERT_BATCH_SIZE)
        .map((game) => mapChessComGame(userId, game));

      const result = await this.prismaService.game.createMany({
        data,
        skipDuplicates: true,
      });

      imported += result.count;
    }

    // Piesaista atvērumus gan jaunajām, gan agrāk importētajām spēlēm.
    await this.linkOpenings(userId);

    return {
      imported,
      skipped: games.length - imported,
    };
  }

  private async linkOpenings(userId: string): Promise<void> {
    const games = await this.prismaService.game.findMany({
      where: {
        userId,
        openingId: null,
      },
      select: {
        id: true,
        pgn: true,
      },
    });

    const gamesWithEco = games
      .map((game) => ({
        id: game.id,
        eco: parsePgn(game.pgn).eco,
      }))
      .filter((game): game is { id: string; eco: string } => game.eco !== null);

    if (gamesWithEco.length === 0) {
      return;
    }

    const openings = await this.prismaService.opening.findMany({
      where: {
        eco: {
          in: [...new Set(gamesWithEco.map((game) => game.eco))],
        },
      },
      select: {
        id: true,
        eco: true,
      },
    });

    const openingIds = new Map(openings.map((opening) => [opening.eco, opening.id]));

    for (const game of gamesWithEco) {
      const openingId = openingIds.get(game.eco);

      if (!openingId) {
        continue;
      }

      await this.prismaService.game.updateMany({
        where: {
          id: game.id,
          openingId: null,
        },
        data: {
          openingId,
        },
      });
    }
  }

  private readonly activeImports = new Set<string>();

  async importLichessGames(
    userId: string,
    limit = 100,
  ): Promise<{ imported: number; skipped: number }> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 300) {
      throw new BadRequestException('limit must be an integer between 1 and 300');
    }
    if (this.activeImports.has(userId)) throw new ConflictException('An import is already running');
    this.activeImports.add(userId);
    try {
      const linkedAccount = await this.prismaService.linkedAccount.findFirst({
        where: { userId, platform: Platform.LICHESS },
      });
      if (!linkedAccount) throw new NotFoundException('No Lichess account is linked');

      const games = await this.lichessClient.getUserGames(
        linkedAccount.platformUsername,
        undefined,
        limit,
      );
      let imported = 0;
      const selected = games.slice(0, limit);
      for (let offset = 0; offset < selected.length; offset += INSERT_BATCH_SIZE) {
        const data = selected
          .slice(offset, offset + INSERT_BATCH_SIZE)
          .map((game) => mapLichessGame(userId, game));
        const result = await this.prismaService.game.createMany({ data, skipDuplicates: true });
        imported += result.count;
      }
      return { imported, skipped: Math.min(games.length, limit) - imported };
    } finally {
      this.activeImports.delete(userId);
    }
  }
}
