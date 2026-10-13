import { GameFormat, GameMode, GameResult } from '../../generated/prisma/client';

export interface ParsedPgnGameFields {
  result: GameResult;
  format: GameFormat;
  mode: GameMode;
  timeControl: string | null;
}

export function parsePgn(pgn: string): ParsedPgnGameFields {
  const headers = readHeaders(pgn);
  const timeControl = headers.TimeControl ?? null;

  return {
    result: mapResult(headers.Result),
    format: mapFormat(timeControl, headers.TimeClass),
    mode: mapMode(headers.Mode, headers.Rated),
    timeControl,
  };
}

export function hasPgnHeader(pgn: string, headerName: string): boolean {
  return new RegExp(`^\\s*\\[(?:${headerName})\\s+"`, 'im').test(pgn);
}

function readHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerPattern = /^\s*\[([A-Za-z0-9_]+)\s+"((?:\\.|[^"])*)"\]\s*$/gm;

  for (const match of pgn.matchAll(headerPattern)) {
    headers[match[1]] = match[2].replace(/\\([\\"])/g, '$1');
  }

  return headers;
}

function mapResult(result: string | undefined): GameResult {
  switch (result) {
    case '1-0':
      return GameResult.WHITE_WIN;
    case '0-1':
      return GameResult.BLACK_WIN;
    default:
      return GameResult.DRAW;
  }
}

function mapMode(mode: string | undefined, rated: string | undefined): GameMode {
  const value = (mode ?? rated ?? '').toLowerCase();
  return value === 'casual' || value === 'unrated' ? GameMode.CASUAL : GameMode.RATED;
}

function mapFormat(timeControl: string | null, timeClass: string | undefined): GameFormat {
  if (!timeControl) {
    return mapTimeClass(timeClass);
  }

  const baseSeconds = getBaseSeconds(timeControl);
  if (baseSeconds === null) {
    return mapTimeClass(timeClass);
  }

  // TimeControl mapping: 0-179 seconds = BULLET, 180-599 = BLITZ,
  // 600-1499 = RAPID, and 1500+ = CLASSICAL.
  if (baseSeconds < 180) {
    return GameFormat.BULLET;
  }
  if (baseSeconds < 600) {
    return GameFormat.BLITZ;
  }
  if (baseSeconds < 1500) {
    return GameFormat.RAPID;
  }
  return GameFormat.CLASSICAL;
}

function getBaseSeconds(timeControl: string): number | null {
  const firstStage = timeControl.split(':', 1)[0];
  const baseValue = firstStage.includes('/')
    ? firstStage.split('/').pop()
    : firstStage.split('+')[0];
  const baseSeconds = Number(baseValue);
  return Number.isFinite(baseSeconds) && baseSeconds >= 0 ? baseSeconds : null;
}

function mapTimeClass(timeClass: string | undefined): GameFormat {
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
