import { Injectable, NotFoundException } from '@nestjs/common';
import { Chess } from 'chess.js';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileDashboardQuery } from './profile-dashboard.dto';
import { parsePgnOpening } from '../games/pgn.parser';

@Injectable()
export class ProfileDashboardService {
  constructor(private readonly db: PrismaService) {}
  async get(userId: string, query: ProfileDashboardQuery) {
    const [user, accounts, games] = await Promise.all([
      this.db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, createdAt: true, role: true },
      }),
      this.db.linkedAccount.findMany({
        where: { userId },
        select: { id: true, platform: true, platformUsername: true, connectedAt: true },
      }),
      this.db.game.findMany({
        where: { userId, ...(query.platform === 'ALL' ? {} : { platform: query.platform }) },
        orderBy: [{ playedAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          platform: true,
          whiteUsername: true,
          blackUsername: true,
          whiteElo: true,
          blackElo: true,
          result: true,
          format: true,
          mode: true,
          playedAt: true,
          timeControl: true,
          opening: { select: { eco: true, name: true } },
        },
      }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    const usernames = new Map(
      accounts.map((account) => [account.platform, account.platformUsername.toLowerCase()]),
    );
    const described = games.map((game) => {
      const name = usernames.get(game.platform);
      const color =
        name === game.whiteUsername.toLowerCase()
          ? 'WHITE'
          : name === game.blackUsername.toLowerCase()
            ? 'BLACK'
            : null;
      const outcome = !color
        ? 'UNKNOWN'
        : game.result === 'DRAW'
          ? 'DRAW'
          : (color === 'WHITE' && game.result === 'WHITE_WIN') ||
              (color === 'BLACK' && game.result === 'BLACK_WIN')
            ? 'WIN'
            : 'LOSS';
      return {
        ...game,
        color,
        outcome,
        playerRating: color === 'WHITE' ? game.whiteElo : color === 'BLACK' ? game.blackElo : null,
        opponent: color === 'BLACK' ? game.whiteUsername : game.blackUsername,
        opponentRating: color === 'BLACK' ? game.whiteElo : game.blackElo,
      };
    });
    const known = described.filter((game) => game.outcome !== 'UNKNOWN');
    const wins = known.filter((game) => game.outcome === 'WIN').length;
    const losses = known.filter((game) => game.outcome === 'LOSS').length;
    const draws = known.filter((game) => game.outcome === 'DRAW').length;
    const ratingSeries = accounts
      .filter((account) => query.platform === 'ALL' || account.platform === query.platform)
      .map((account) => {
        const points = described
          .filter(
            (game) =>
              game.platform === account.platform &&
              game.format === query.format &&
              game.mode === 'RATED' &&
              game.playerRating != null,
          )
          .slice(-60)
          .map((game) => ({ gameId: game.id, date: game.playedAt, rating: game.playerRating! }));
        return {
          platform: account.platform,
          username: account.platformUsername,
          currentRating: points.at(-1)?.rating ?? null,
          points,
        };
      });
    const recent = described.slice(-10).reverse();
    const records = recent.length
      ? await this.db.game.findMany({
          where: { userId, id: { in: recent.map((game) => game.id) } },
          select: { id: true, pgn: true },
        })
      : [];
    const pgnById = new Map(records.map((game) => [game.id, game.pgn]));
    return {
      user,
      accounts,
      platform: query.platform,
      ratingFormat: query.format,
      summary: {
        total: games.length,
        wins,
        losses,
        draws,
        identified: known.length,
        winRate: known.length ? Math.round((wins / known.length) * 1000) / 10 : null,
      },
      ratingSeries,
      recentGames: recent.map((game) => {
        const pgn = pgnById.get(game.id) ?? '';
        const opening = parsePgnOpening(pgn);
        let moveCount: number | null = null;
        try {
          const chess = new Chess();
          chess.loadPgn(pgn);
          moveCount = Math.ceil(chess.history().length / 2) || null;
        } catch {
          /* Metadata remains usable if an imported PGN cannot be replayed. */
        }
        return {
          ...game,
          opening:
            game.opening ??
            (opening.eco || opening.name ? { eco: opening.eco, name: opening.name } : null),
          moveCount,
        };
      }),
    };
  }
}
