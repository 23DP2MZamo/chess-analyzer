// Passport is overridden below; keep its ESM package outside Jest's CommonJS loader.
jest.mock('@nestjs/passport', () => ({ AuthGuard: () => class {} }));
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { LocalAuthGuard } from './local-auth/local.guard';
import { JwtTokens } from './jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';

describe('JWT login and logout', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [JwtTokens, { provide: PrismaService, useValue: {} }],
    })
      .overrideGuard(LocalAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: { id: string } }>().user = { id: 'user-id' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });
  it('issues a signed JWT and HttpOnly SameSite cookie', async () => {
    const result = await request(app.getHttpServer()).post('/auth/signin').expect(200);
    const body = result.body as { accessToken: string; expiresIn: number };
    expect(new JwtTokens().verify(body.accessToken)).toBe('user-id');
    expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(result.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(body.expiresIn).toBe(3600);
  });
  it('clears the JWT cookie on logout', async () => {
    const result = await request(app.getHttpServer()).post('/auth/logout').expect(200);
    expect(result.headers['set-cookie'][0]).toContain('access_token=;');
  });
});
