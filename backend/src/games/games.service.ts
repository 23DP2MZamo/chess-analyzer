import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform } from '../../generated/prisma/client';
import { ChessComClient, type ChessComArchiveResponse } from '../accounts/chesscom.client';
import { PrismaService } from '../prisma/prisma.service';
import { mapChessComGame } from './chesscom-game.mapper';

const INSERT_BATCH_SIZE = 100;
const ARCHIVE_FETCH_BATCH_SIZE = 5;

@Injectable()
export class GamesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly chessComClient: ChessComClient,
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
        opening: { select: { eco: true, name: true } },
        analysis: { select: { accuracyWhite: true, accuracyBlack: true } },
      },
    });
  }

  async getStats(userId: string) {
    const games = await this.prismaService.game.findMany({
      where: { userId },
      select: {
        result: true,
        whiteUsername: true,
        blackUsername: true,
        analysis: { select: { accuracyWhite: true, accuracyBlack: true } },
      },
    });
    const wins = games.filter((game) =>
      game.result === 'WHITE_WIN'
        ? game.whiteUsername
        : game.result === 'BLACK_WIN'
          ? game.blackUsername
          : false,
    );
    const accuracyValues = games.flatMap((game) =>
      [game.analysis?.accuracyWhite, game.analysis?.accuracyBlack].filter(
        (value): value is number => value != null,
      ),
    );

    return {
      totalGames: games.length,
      wins: wins.length,
      draws: games.filter((game) => game.result === 'DRAW').length,
      losses: games.length - wins.length - games.filter((game) => game.result === 'DRAW').length,
      winrate: games.length ? (wins.length / games.length) * 100 : 0,
      averageAccuracy: accuracyValues.length
        ? accuracyValues.reduce((sum, value) => sum + value, 0) / accuracyValues.length
        : null,
    };
  }

  async importChessComGames(userId: string): Promise<{ imported: number; skipped: number }> {
    const linkedAccount = await this.prismaService.linkedAccount.findFirst({
      where: { userId, platform: Platform.CHESSCOM },
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
      const result = await this.prismaService.game.createMany({ data, skipDuplicates: true });
      imported += result.count;
    }

    return { imported, skipped: games.length - imported };
  }
}
