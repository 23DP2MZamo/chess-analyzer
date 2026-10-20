import { GameFormat, GameMode, GameResult, Platform, Prisma } from '../../generated/prisma/client';
import { LichessGame } from '../accounts/lichess.client';
import { hasPgnHeader, parsePgn } from './pgn.parser';

export function mapLichessGame(userId: string, game: LichessGame): Prisma.GameCreateManyInput {
  const parsedPgn = parsePgn(game.pgn);
  const timeControl =
    parsedPgn.timeControl ??
    (game.clock ? `${game.clock.initial ?? 0}+${game.clock.increment ?? 0}` : null);

  return {
    userId,
    platform: Platform.LICHESS,
    externalId: game.id,
    pgn: game.pgn,
    whiteUsername: playerUsername(game.players.white),
    blackUsername: playerUsername(game.players.black),
    whiteElo: game.players.white.rating ?? null,
    blackElo: game.players.black.rating ?? null,
    timeControl,
    playedAt: new Date(game.createdAt),
    mode: game.rated ? GameMode.RATED : GameMode.CASUAL,
    format: hasPgnHeader(game.pgn, 'TimeControl|TimeClass')
      ? parsedPgn.format
      : mapGameFormat(game.speed),
    result: hasPgnHeader(game.pgn, 'Result')
      ? parsedPgn.result
      : game.winner === 'white'
        ? GameResult.WHITE_WIN
        : game.winner === 'black'
          ? GameResult.BLACK_WIN
          : GameResult.DRAW,
  };
}

function playerUsername(player: LichessGame['players']['white']): string {
  const username = player.user?.name ?? player.user?.id;
  if (username) return username;
  if (player.aiLevel !== undefined) return `Lichess AI (level ${player.aiLevel})`;
  return 'Anonymous';
}

function mapGameFormat(speed: string): GameFormat {
  switch (speed.toLowerCase()) {
    case 'ultrabullet':
    case 'bullet':
      return GameFormat.BULLET;
    case 'blitz':
      return GameFormat.BLITZ;
    case 'rapid':
      return GameFormat.RAPID;
    case 'correspondence':
      return GameFormat.CORRESPONDENCE;
    default:
      return GameFormat.CLASSICAL;
  }
}
