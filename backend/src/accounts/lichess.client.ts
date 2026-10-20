import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';

export const LICHESS_GAMES_PAGE_SIZE = 300;

@Injectable()
export class LichessClient {
  async verifyAccount(username: string): Promise<void> {
    let response: Response;

    try {
      response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new BadGatewayException('Unable to verify the Lichess account');
    }

    if (response.status === 404) {
      throw new NotFoundException(`Lichess account "${username}" was not found`);
    }

    if (!response.ok) {
      throw new BadGatewayException('Lichess API returned an error');
    }
  }

  async getUserGames(username: string, until?: number): Promise<LichessGame[]> {
    const query = new URLSearchParams({
      max: String(LICHESS_GAMES_PAGE_SIZE),
      pgnInJson: 'true',
    });
    if (until !== undefined) {
      query.set('until', String(until));
    }

    const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${query}`;
    let response: Response;

    try {
      response = await fetch(url, {
        headers: { Accept: 'application/x-ndjson' },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new BadGatewayException('Unable to retrieve Lichess game history');
    }

    if (response.status === 404) {
      throw new NotFoundException(`Lichess game history for "${username}" was not found`);
    }

    if (!response.ok) {
      throw new BadGatewayException('Lichess API returned an error');
    }

    let body: string;
    try {
      body = await response.text();
    } catch {
      throw new BadGatewayException('Unable to read Lichess game history');
    }

    if (!body.trim()) {
      return [];
    }

    try {
      return body
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .map((line) => parseLichessGame(JSON.parse(line) as unknown));
    } catch {
      throw new BadGatewayException('Lichess API returned an invalid game history');
    }
  }
}

function parseLichessGame(value: unknown): LichessGame {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid Lichess game');
  }

  const game = value as Partial<LichessGame>;
  if (
    typeof game.id !== 'string' ||
    !game.id ||
    typeof game.pgn !== 'string' ||
    !game.pgn ||
    typeof game.createdAt !== 'number' ||
    !Number.isFinite(game.createdAt) ||
    typeof game.rated !== 'boolean' ||
    typeof game.speed !== 'string' ||
    typeof game.players !== 'object' ||
    game.players === null ||
    typeof game.players.white !== 'object' ||
    game.players.white === null ||
    typeof game.players.black !== 'object' ||
    game.players.black === null ||
    !isValidPlayer(game.players.white) ||
    !isValidPlayer(game.players.black)
  ) {
    throw new Error('Invalid Lichess game');
  }

  return game as LichessGame;
}

function isValidPlayer(value: object): boolean {
  const player = value as LichessPlayer;
  return (
    (player.user === undefined ||
      (typeof player.user === 'object' &&
        player.user !== null &&
        (typeof player.user.name === 'string' || typeof player.user.id === 'string'))) &&
    (player.rating === undefined ||
      (typeof player.rating === 'number' && Number.isFinite(player.rating))) &&
    (player.aiLevel === undefined ||
      (typeof player.aiLevel === 'number' && Number.isFinite(player.aiLevel)))
  );
}

export interface LichessGame {
  id: string;
  pgn: string;
  createdAt: number;
  rated: boolean;
  speed: string;
  winner?: 'white' | 'black';
  clock?: { initial?: number; increment?: number };
  players: {
    white: LichessPlayer;
    black: LichessPlayer;
  };
}

export interface LichessPlayer {
  user?: { name?: string; id?: string };
  rating?: number;
  aiLevel?: number;
}
