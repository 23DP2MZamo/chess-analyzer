import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ChessComClient {
  async verifyAccount(username: string): Promise<void> {
    let response: Response;

    try {
      response = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'chess-analyzer/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new BadGatewayException('Unable to verify the Chess.com account');
    }

    if (response.status === 404) {
      throw new NotFoundException(`Chess.com account "${username}" was not found`);
    }

    if (!response.ok) {
      throw new BadGatewayException('Chess.com API returned an error');
    }
  }

  async getGameArchives(username: string): Promise<ChessComArchivesResponse> {
    return this.fetchJson<ChessComArchivesResponse>(
      `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    );
  }

  async getArchiveGames(archiveUrl: string): Promise<ChessComArchiveResponse> {
    return this.fetchJson<ChessComArchiveResponse>(archiveUrl);
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'chess-analyzer/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new BadGatewayException('Unable to retrieve Chess.com game history');
    }

    if (!response.ok) {
      throw new BadGatewayException('Chess.com API returned an error');
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new BadGatewayException('Chess.com API returned an invalid response');
    }
  }
}

export interface ChessComArchivesResponse {
  archives: string[];
}

export interface ChessComArchiveResponse {
  games: ChessComGame[];
}

export interface ChessComGame {
  uuid: string;
  pgn: string;
  white: ChessComPlayer;
  black: ChessComPlayer;
  time_control?: string;
  end_time: number;
  rated: boolean;
  time_class?: string;
}

export interface ChessComPlayer {
  username: string;
  rating?: number;
  result: string;
}
