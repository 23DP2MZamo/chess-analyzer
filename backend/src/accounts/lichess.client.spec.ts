import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { LichessClient } from './lichess.client';

describe('LichessClient', () => {
  let client: LichessClient;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    client = new LichessClient();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('accepts an existing Lichess account', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await expect(client.verifyAccount('some user')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://lichess.org/api/user/some%20user');
    expect(options?.headers).toEqual({ Accept: 'application/json' });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns not found only when Lichess returns 404', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));

    await expect(client.verifyAccount('missing-user')).rejects.toEqual(
      new NotFoundException('Lichess account "missing-user" was not found'),
    );
  });

  it('converts other Lichess failures to a bad gateway response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(client.verifyAccount('someLichessUser')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('converts network errors to a bad gateway response', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.verifyAccount('someLichessUser')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('fetches and parses Lichess NDJSON games with pagination parameters', async () => {
    const game = {
      id: 'game-id',
      pgn: '[Result "1-0"]',
      createdAt: 1_700_000_000_000,
      rated: true,
      speed: 'blitz',
      winner: 'white',
      players: {
        white: { user: { name: 'WhitePlayer' }, rating: 1800 },
        black: { user: { name: 'BlackPlayer' }, rating: 1700 },
      },
    };
    fetchMock.mockResolvedValue(
      new Response(`${JSON.stringify(game)}\n`, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson' },
      }),
    );

    await expect(client.getUserGames('some user', 1_700_000_000_000)).resolves.toEqual([game]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://lichess.org/api/games/user/some%20user?max=300&sort=dateDesc&ongoing=false&finished=true&pgnInJson=true&until=1700000000000',
    );
    expect(options?.headers).toEqual({ Accept: 'application/x-ndjson' });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('handles HTTP 429 with retry information instead of retrying in a loop', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 429, headers: { 'Retry-After': '120' } }),
    );
    try {
      await client.getUserGames('someUser', undefined, 25);
      throw new Error('Expected a rate-limit error');
    } catch (error) {
      expect(error).toMatchObject({ status: 429 });
      expect((error as { getResponse(): unknown }).getResponse()).toMatchObject({
        retryAfter: 120,
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('handles a game export timeout', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(client.getUserGames('someUser')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('returns an empty list when the Lichess account has no games', async () => {
    fetchMock.mockResolvedValue(new Response('\n', { status: 200 }));

    await expect(client.getUserGames('someUser')).resolves.toEqual([]);
  });

  it('rejects malformed Lichess game history', async () => {
    fetchMock.mockResolvedValue(new Response('not-json\n', { status: 200 }));

    await expect(client.getUserGames('someUser')).rejects.toBeInstanceOf(BadGatewayException);
  });
});
