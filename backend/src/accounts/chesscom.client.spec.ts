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
});
