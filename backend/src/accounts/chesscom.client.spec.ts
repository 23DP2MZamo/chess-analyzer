import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ChessComClient } from './chesscom.client';

describe('ChessComClient', () => {
  let client: ChessComClient;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    client = new ChessComClient();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('verifies an account using an encoded URL and expected headers', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(client.verifyAccount('some user')).resolves.toBeUndefined();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.chess.com/pub/player/some%20user');
    expect(options?.headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'chess-analyzer/1.0',
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns not found when Chess.com returns 404', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(client.verifyAccount('missing-user')).rejects.toEqual(
      new NotFoundException('Chess.com account "missing-user" was not found'),
    );
  });

  it('converts other API failures to a bad gateway response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(client.verifyAccount('someUser')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('converts network errors to a bad gateway response', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.verifyAccount('someUser')).rejects.toBeInstanceOf(BadGatewayException);
  });

  const archiveUrl = 'https://api.chess.com/pub/player/hikaru/games/2026/01';
  const game = {
    uuid: 'game-id',
    pgn: '[Result "1-0"]',
    end_time: 1700000000,
    rated: true,
    white: { username: 'Hikaru', result: 'win', rating: 2800 },
    black: { username: 'Opponent', result: 'resigned' },
  };

  it('validates, deduplicates and orders monthly URLs', async () => {
    const feb = archiveUrl.replace('/01', '/02');
    fetchMock.mockResolvedValue(Response.json({ archives: [feb, archiveUrl, feb] }));
    expect(await client.getGameArchives('Hikaru')).toEqual({ archives: [archiveUrl, feb] });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.chess.com/pub/player/Hikaru/games/archives',
    );
  });

  it.each([
    null,
    {},
    { archives: null },
    { archives: [4] },
    { archives: ['https://evil.example/2026/01'] },
    { archives: [archiveUrl.replace('hikaru', 'other')] },
    { archives: [archiveUrl.replace('/01', '/13')] },
  ])('rejects malformed archive lists: %j', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(client.getGameArchives('Hikaru')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('rejects an untrusted archive URL before making a request', async () => {
    await expect(client.getArchiveGames('http://localhost/private')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts valid and empty monthly archives', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ games: [game] }))
      .mockResolvedValueOnce(Response.json({ games: [] }));
    expect(await client.getArchiveGames(archiveUrl)).toEqual({ games: [game] });
    expect(await client.getArchiveGames(archiveUrl)).toEqual({ games: [] });
  });

  it.each([
    null,
    {},
    { games: {} },
    { games: [null] },
    { games: [{ ...game, uuid: '' }] },
    { games: [{ ...game, white: null }] },
    { games: [{ ...game, end_time: 1e20 }] },
    { games: [{ ...game, rated: 'yes' }] },
    { games: [{ ...game, black: { ...game.black, rating: 1.5 } }] },
  ])('rejects invalid game data before database mapping: %j', async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(client.getArchiveGames(archiveUrl)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('handles invalid JSON and timeouts', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('{broken'))
      .mockRejectedValueOnce(new DOMException('Timeout', 'TimeoutError'));
    await expect(client.getArchiveGames(archiveUrl)).rejects.toBeInstanceOf(BadGatewayException);
    await expect(client.getArchiveGames(archiveUrl)).rejects.toBeInstanceOf(BadGatewayException);
  });

  it.each([404, 500, 503])('handles upstream HTTP %i', async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(client.getArchiveGames(archiveUrl)).rejects.toMatchObject({
      status: status === 404 ? 404 : 502,
    });
  });

  it.each([
    ['120', 120],
    [null, 60],
    ['invalid', 60],
    ['99999', 3600],
  ])('reports a bounded retry delay for 429 (%s)', async (header, retryAfter) => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 429,
        headers: header ? { 'Retry-After': header } : {},
      }),
    );
    await expect(client.getArchiveGames(archiveUrl)).rejects.toMatchObject({
      status: 429,
      response: { retryAfter },
    });
  });
});
