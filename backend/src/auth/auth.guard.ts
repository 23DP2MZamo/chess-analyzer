import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { JwtTokens } from './jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';

// Retained name for existing imports; protected routes now authenticate JWTs.
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: JwtTokens,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    let token: string | undefined;
    if (authorization !== undefined) {
      const match = /^Bearer ([^\s]+)$/i.exec(authorization);
      if (!match) throw new UnauthorizedException('A Bearer token is required');
      token = match[1];
    } else {
      token = request.headers.cookie
        ?.split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('access_token='))
        ?.slice('access_token='.length);
    }
    if (!token) throw new UnauthorizedException('Authentication required');
    const id = this.tokens.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('Account no longer exists');
    request.user = user;
    return true;
  }
}
