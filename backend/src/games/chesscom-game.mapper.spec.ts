import { GameFormat, GameMode, GameResult, Platform } from '../../generated/prisma/client';
import { ChessComGame } from '../accounts/chesscom.client';
import { mapChessComGame } from './chesscom-game.mapper';

describe('mapChessComGame', () => {
  const game: ChessComGame = {
    uuid: 'game-uuid',
    pgn: '[Event "Live Chess"]',
    white: { username: 'WhitePlayer', rating: 2400, result: 'win' },
    black: { username: 'BlackPlayer', rating: 2300, result: 'checkmated' },
    time_control: '600',
    end_time: 1_700_000_000,
    rated: true,
    time_class: 'blitz',
  };

  it('maps a white win and shared game fields', () => {
    expect(mapChessComGame('user-id', game)).toEqual({
      userId: 'user-id',
      platform: Platform.CHESSCOM,
      externalId: 'game-uuid',
      pgn: '[Event "Live Chess"]',
      whiteUsername: 'WhitePlayer',
      blackUsername: 'BlackPlayer',
      whiteElo: 2400,
      blackElo: 2300,
      timeControl: '600',
      playedAt: new Date(1_700_000_000 * 1000),
      mode: GameMode.RATED,
      format: GameFormat.BLITZ,
      result: GameResult.WHITE_WIN,
    });
  });

  it('maps a black win', () => {
    expect(
      mapChessComGame('user-id', {
        ...game,
        white: { ...game.white, result: 'resigned' },
        black: { ...game.black, result: 'win' },
      }).result,
    ).toBe(GameResult.BLACK_WIN);
  });

  it('maps games without a winning result to draws', () => {
    expect(
      mapChessComGame('user-id', {
        ...game,
        white: { ...game.white, result: 'agreed' },
        black: { ...game.black, result: 'agreed' },
      }).result,
    ).toBe(GameResult.DRAW);
  });

  it.each([
    ['bullet', GameFormat.BULLET],
    ['blitz', GameFormat.BLITZ],
    ['rapid', GameFormat.RAPID],
    ['daily', GameFormat.CORRESPONDENCE],
    ['unknown', GameFormat.CLASSICAL],
  ])('maps %s to the correct game format', (timeClass, format) => {
    expect(mapChessComGame('user-id', { ...game, time_class: timeClass }).format).toBe(format);
  });

  it('uses null for missing ratings and time control and maps casual mode', () => {
    expect(
      mapChessComGame('user-id', {
        ...game,
        white: { username: 'WhitePlayer', result: 'win' },
        black: { username: 'BlackPlayer', result: 'resigned' },
        time_control: undefined,
        rated: false,
      }),
    ).toMatchObject({
      whiteElo: null,
      blackElo: null,
      timeControl: null,
      mode: GameMode.CASUAL,
    });
  });
});
