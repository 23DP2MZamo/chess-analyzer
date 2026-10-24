import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';

@Injectable()
export class JwtTokens {
  private secret(): string {
    const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) throw new Error('JWT_SECRET or SESSION_SECRET must be configured');
    return secret;
  }

  issue(userId: string): string {
    return sign({}, this.secret(), {
      algorithm: 'HS256',
      subject: userId,
      expiresIn: '1h',
      issuer: 'chess-analyzer',
      audience: 'chess-analyzer-web',
    });
  }

  verify(token: string): string {
    try {
      const payload = verify(token, this.secret(), {
        algorithms: ['HS256'],
        issuer: 'chess-analyzer',
        audience: 'chess-analyzer-web',
      });
      if (typeof payload === 'string' || !payload.sub || typeof payload.exp !== 'number') {
        throw new Error('Invalid claims');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
