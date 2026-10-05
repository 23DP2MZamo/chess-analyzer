import { Injectable, NotFoundException } from '@nestjs/common';
import { Platform } from '../../generated/prisma/client';
import { ChessComClient } from '../accounts/chesscom.client';
import { PrismaService } from '../prisma/prisma.service';
import { mapChessComGame } from './chesscom-game.mapper';

const INSERT_BATCH_SIZE = 100;

@Injectable()
export class GamesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly chessComClient: ChessComClient,
  ) {}

  async importChessComGames(userId: string): Promise<{ imported: number; skipped: number }> {
    const linkedAccount = await this.prismaService.linkedAccount.findFirst({
      where: { userId, platform: Platform.CHESSCOM },
    });

    if (!linkedAccount) {
      throw new NotFoundException('No Chess.com account is linked');
    }

    const { archives } = await this.chessComClient.getGameArchives(linkedAccount.platformUsername);
    const archiveResponses = await Promise.all(
      archives.map((archiveUrl) => this.chessComClient.getArchiveGames(archiveUrl)),
    );
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
