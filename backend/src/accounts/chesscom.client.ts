import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const ARCHIVE_URL =
  /^https:\/\/api\.chess\.com\/pub\/player\/([^/?#]+)\/games\/\d{4}\/(?:0[1-9]|1[0-2])$/;

@Injectable()
export class ChessComClient {
  async verifyAccount(username: string): Promise<void> {
    try {
      await this.request(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Chess.com account "${username}" was not found`);
      }
      throw error;
    }
  }

  async getGameArchives(username: string): Promise<ChessComArchivesResponse> {
    const body = await this.fetchJson(
      `https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`,
    );
    if (
      !isRecord(body) ||
      !Array.isArray(body.archives) ||
      !body.archives.every((url: unknown) => {
        if (typeof url !== 'string') return false;
        const match = ARCHIVE_URL.exec(url);
        return (
          match !== null && match[1].toLowerCase() === encodeURIComponent(username).toLowerCase()
        );
      })
    ) {
      throw new BadGatewayException('Chess.com API returned an invalid archive list');
    }
    return { archives: [...new Set(body.archives as string[])].sort() };
  }

  async getArchiveGames(archiveUrl: string): Promise<ChessComArchiveResponse> {
    if (!ARCHIVE_URL.test(archiveUrl)) {
      throw new BadGatewayException('Chess.com API returned an invalid archive URL');
    }
    const body = await this.fetchJson(archiveUrl);
    if (!isRecord(body) || !Array.isArray(body.games) || !body.games.every(isGame)) {
      throw new BadGatewayException('Chess.com API returned an invalid game archive');
    }
    return { games: body.games as ChessComGame[] };
  }

  private async request(url: string): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'chess-analyzer/1.0' },
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
    } catch {
      throw new BadGatewayException('Unable to retrieve Chess.com data. Please retry later.');
    }
    if (response.status === 404) {
      throw new NotFoundException('Chess.com account or game archive was not found');
    }
    if (response.status === 429) {
      const header = response.headers.get('Retry-After');
      const seconds = Number(header);
      const delay =
        Number.isFinite(seconds) && seconds > 0
          ? seconds
          : header
            ? (Date.parse(header) - Date.now()) / 1000
            : NaN;
      const retryAfter =
        Number.isFinite(delay) && delay > 0 ? Math.min(Math.ceil(delay), 3600) : 60;
      throw new HttpException(
        {
          statusCode: 429,
          message: `Chess.com rate limit reached. Please retry in ${retryAfter} seconds.`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!response.ok) throw new BadGatewayException('Chess.com API returned an error');
    return response;
  }

  private async fetchJson(url: string): Promise<unknown> {
    const response = await this.request(url);
    try {
      return await response.json();
    } catch {
      throw new BadGatewayException('Chess.com API returned an invalid response');
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlayer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.username === 'string' &&
    value.username.trim().length > 0 &&
    typeof value.result === 'string' &&
    value.result.length > 0 &&
    (value.rating === undefined ||
      (Number.isInteger(value.rating) &&
        Number(value.rating) >= 0 &&
        Number(value.rating) <= 2147483647))
  );
}

function isGame(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.uuid === 'string' &&
    value.uuid.trim().length > 0 &&
    typeof value.pgn === 'string' &&
    value.pgn.trim().length > 0 &&
    typeof value.rated === 'boolean' &&
    typeof value.end_time === 'number' &&
    Number.isInteger(value.end_time) &&
    value.end_time >= 0 &&
    Number.isFinite(new Date(value.end_time * 1000).getTime()) &&
    isPlayer(value.white) &&
    isPlayer(value.black) &&
    (value.time_control === undefined || typeof value.time_control === 'string') &&
    (value.time_class === undefined || typeof value.time_class === 'string')
  );
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
