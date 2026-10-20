import { GameFormat, GameMode, GameResult, Platform } from '../../generated/prisma/client';
import { LichessGame } from '../accounts/lichess.client';
import { mapLichessGame } from './lichess-game.mapper';

describe('mapLichessGame', () => {
  const game: LichessGame = {
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

  it('maps Lichess game data into the shared game model', () => {
    expect(mapLichessGame('user-id', game)).toEqual({
      userId: 'user-id',
      platform: Platform.LICHESS,
      externalId: 'lichess-game-id',
      pgn: game.pgn,
      whiteUsername: 'WhitePlayer',
      blackUsername: 'BlackPlayer',
      whiteElo: 2400,
      blackElo: 2300,
      timeControl: '180+0',
      playedAt: new Date(1_700_000_000_000),
      mode: GameMode.RATED,
      format: GameFormat.BLITZ,
      result: GameResult.WHITE_WIN,
    });
  });

  it('maps Lichess winner, speed, casual mode, and anonymous user ids', () => {
    expect(
      mapLichessGame('user-id', {
        ...game,
        pgn: '[Event "Casual Rapid game"]',
        rated: false,
        speed: 'rapid',
        winner: 'black',
        players: {
          white: { user: { id: 'white-id' } },
          black: { user: { name: 'BlackPlayer' } },
        },
      }),
    ).toMatchObject({
      whiteUsername: 'white-id',
      blackUsername: 'BlackPlayer',
      whiteElo: null,
      blackElo: null,
      mode: GameMode.CASUAL,
      format: GameFormat.RAPID,
      result: GameResult.BLACK_WIN,
    });
  });

  it.each([
    ['ultraBullet', GameFormat.BULLET],
    ['bullet', GameFormat.BULLET],
    ['blitz', GameFormat.BLITZ],
    ['rapid', GameFormat.RAPID],
    ['classical', GameFormat.CLASSICAL],
    ['correspondence', GameFormat.CORRESPONDENCE],
  ])('maps %s speed to the expected format', (speed, format) => {
    expect(mapLichessGame('user-id', { ...game, pgn: '', speed })).toMatchObject({ format });
  });

  it('maps games without a winner to draws', () => {
    expect(
      mapLichessGame('user-id', { ...game, pgn: '[Event "Casual game"]', winner: undefined })
        .result,
    ).toBe(GameResult.DRAW);
  });

  it('maps games against the built-in Lichess AI', () => {
    expect(
      mapLichessGame('user-id', {
        ...game,
        pgn: '[Event "Casual game"]',
        players: {
          white: { user: { name: 'WhitePlayer' } },
          black: { aiLevel: 1 },
        },
      }),
    ).toMatchObject({ blackUsername: 'Lichess AI (level 1)' });
  });
});
