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
});
