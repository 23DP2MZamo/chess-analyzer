import { GameFormat, GameMode, GameResult, Platform } from '../../generated/prisma/client';

export const SAMPLE_GAMES = [
  {
    id: 'sample-scholar',
    title: 'A quick mating attack',
    eco: 'C20',
    opening: "King's Pawn Game",
    format: GameFormat.BLITZ,
    mode: GameMode.CASUAL,
    result: GameResult.WHITE_WIN,
    pgn: '[Event "Sample: mating attack"]\n[White "DemoPlayer"]\n[Black "SampleOpponent"]\n[Result "1-0"]\n[ECO "C20"]\n[Opening "King\'s Pawn Game"]\n\n1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0',
  },
  {
    id: 'sample-fools-mate',
    title: 'Spot the opening mistake',
    eco: 'A02',
    opening: "Bird's Opening",
    format: GameFormat.RAPID,
    mode: GameMode.RATED,
    result: GameResult.BLACK_WIN,
    pgn: '[Event "Sample: opening mistake"]\n[White "DemoPlayer"]\n[Black "SampleOpponent"]\n[Result "0-1"]\n[ECO "A02"]\n[Opening "Bird\'s Opening"]\n\n1. f3 e5 2. g4 Qh4# 0-1',
  },
  {
    id: 'sample-italian',
    title: 'Develop your pieces',
    eco: 'C50',
    opening: 'Italian Game',
    format: GameFormat.CLASSICAL,
    mode: GameMode.CASUAL,
    result: GameResult.DRAW,
    pgn: '[Event "Sample: piece development"]\n[White "DemoPlayer"]\n[Black "SampleOpponent"]\n[Result "1/2-1/2"]\n[ECO "C50"]\n[Opening "Italian Game"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. O-O O-O 1/2-1/2',
  },
] as const;

export function sampleGame(id: string) {
  const sample = SAMPLE_GAMES.find((game) => game.id === id);
  if (!sample) return null;
  return {
    ...sample,
    platform: Platform.CHESSCOM,
    externalId: sample.id,
    whiteUsername: 'DemoPlayer',
    blackUsername: 'SampleOpponent',
    whiteElo: 1200,
    blackElo: 1200,
    playedAt: new Date('2026-01-01T12:00:00Z'),
    timeControl: sample.format === 'BLITZ' ? '300' : sample.format === 'RAPID' ? '600+5' : '1800',
    isSample: true,
  };
}

export function sampleList() {
  return SAMPLE_GAMES.map((sample) => ({ ...sampleGame(sample.id)!, pgn: undefined }));
}
