import { GameFormat, GameMode, GameResult } from '../../generated/prisma/client';
import { parsePgn } from './pgn.parser';

describe('parsePgn', () => {
  const pgnSamples = [
    {
      name: 'bullet',
      pgn: `[Event "Bullet Test"]
[Site "Chess.com"]
[Date "2026.10.12"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[TimeControl "60+0"]
[Mode "rated"]

1. e4 e5 1-0`,
      expected: {
        result: GameResult.WHITE_WIN,
        format: GameFormat.BULLET,
        mode: GameMode.RATED,
        timeControl: '60+0',
      },
    },
    {
      name: 'blitz',
      pgn: `[Event "Blitz Test"]
[Site "Chess.com"]
[Date "2026.10.12"]
[White "Player1"]
[Black "Player2"]
[Result "0-1"]
[TimeControl "180+2"]
[Mode "rated"]

1. e4 c5 0-1`,
      expected: {
        result: GameResult.BLACK_WIN,
        format: GameFormat.BLITZ,
        mode: GameMode.RATED,
        timeControl: '180+2',
      },
    },
    {
      name: 'rapid',
      pgn: `[Event "Rapid Test"]
[Site "Chess.com"]
[Date "2026.10.12"]
[White "Player1"]
[Black "Player2"]
[Result "1/2-1/2"]
[TimeControl "600+0"]
[Mode "rated"]

1. d4 d5 1/2-1/2`,
      expected: {
        result: GameResult.DRAW,
        format: GameFormat.RAPID,
        mode: GameMode.RATED,
        timeControl: '600+0',
      },
    },
    {
      name: 'classical',
      pgn: `[Event "Classical Test"]
[Site "Lichess"]
[Date "2026.10.12"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]
[TimeControl "1800+0"]
[Mode "rated"]

1. e4 e5 1-0`,
      expected: {
        result: GameResult.WHITE_WIN,
        format: GameFormat.CLASSICAL,
        mode: GameMode.RATED,
        timeControl: '1800+0',
      },
    },
  ];

  it.each(pgnSamples)('parses the $name PGN sample', ({ pgn, expected }) => {
    expect(parsePgn(pgn)).toEqual(expected);
  });

  it('keeps a missing TimeControl as null and uses classical as the format fallback', () => {
    expect(
      parsePgn(`[Event "Missing TimeControl Test"]
[White "Player1"]
[Black "Player2"]
[Result "0-1"]
[Mode "rated"]

1. d4 Nf6 0-1`),
    ).toEqual({
      result: GameResult.BLACK_WIN,
      format: GameFormat.CLASSICAL,
      mode: GameMode.RATED,
      timeControl: null,
    });
  });

  it.each([
    [
      '[Result "1-0"]\n[TimeControl "60+0"]\n[Mode "rated"]',
      GameResult.WHITE_WIN,
      GameFormat.BULLET,
      GameMode.RATED,
    ],
    [
      '[Result "0-1"]\n[TimeControl "300+2"]\n[Mode "casual"]',
      GameResult.BLACK_WIN,
      GameFormat.BLITZ,
      GameMode.CASUAL,
    ],
    [
      '[Result "1/2-1/2"]\n[TimeControl "600"]\n[Rated "Rated"]',
      GameResult.DRAW,
      GameFormat.RAPID,
      GameMode.RATED,
    ],
    [
      '[Result "*"]\n[TimeControl "900+10"]\n[Rated "Casual"]',
      GameResult.DRAW,
      GameFormat.RAPID,
      GameMode.CASUAL,
    ],
    [
      '[Result "1-0"]\n[TimeControl "1800+30"]',
      GameResult.WHITE_WIN,
      GameFormat.CLASSICAL,
      GameMode.RATED,
    ],
    [
      '[Result "0-1"]\n[TimeControl "40/7200:3600"]',
      GameResult.BLACK_WIN,
      GameFormat.CLASSICAL,
      GameMode.RATED,
    ],
  ])('maps PGN headers (%s)', (pgn, result, format, mode) => {
    expect(parsePgn(pgn)).toMatchObject({
      result,
      format,
      mode,
      timeControl: expect.any(String),
    });
  });

  it('uses TimeClass when TimeControl is missing and tolerates escaped header values', () => {
    expect(parsePgn('[Event "Training \\"game\\""]\n[TimeClass "bullet"]')).toEqual({
      result: GameResult.DRAW,
      format: GameFormat.BULLET,
      mode: GameMode.RATED,
      timeControl: null,
    });
  });
});
