import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';

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
}
