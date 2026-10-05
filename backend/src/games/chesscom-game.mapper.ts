import { GameFormat, GameMode, GameResult, Platform, Prisma } from '../../generated/prisma/client';
import { ChessComGame } from '../accounts/chesscom.client';

export function mapChessComGame(userId: string, game: ChessComGame): Prisma.GameCreateManyInput {
  return {
    userId,
    platform: Platform.CHESSCOM,
    externalId: game.uuid,
    pgn: game.pgn,
    whiteUsername: game.white.username,
    blackUsername: game.black.username,
    whiteElo: game.white.rating ?? null,
    blackElo: game.black.rating ?? null,
    timeControl: game.time_control ?? null,
    playedAt: new Date(game.end_time * 1000),
    mode: game.rated ? GameMode.RATED : GameMode.CASUAL,
    format: mapGameFormat(game.time_class),
    result: mapGameResult(game),
  };
}

function mapGameFormat(timeClass: string | undefined): GameFormat {
  switch (timeClass?.toLowerCase()) {
    case 'bullet':
      return GameFormat.BULLET;
    case 'blitz':
      return GameFormat.BLITZ;
    case 'rapid':
      return GameFormat.RAPID;
    case 'daily':
      return GameFormat.CORRESPONDENCE;
    default:
      return GameFormat.CLASSICAL;
  }
}

function mapGameResult(game: ChessComGame): GameResult {
  if (game.white.result === 'win') {
    return GameResult.WHITE_WIN;
  }

  if (game.black.result === 'win') {
    return GameResult.BLACK_WIN;
  }

  return GameResult.DRAW;
}
