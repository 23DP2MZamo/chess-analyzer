import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { sign } from 'jsonwebtoken';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtTokens } from '../auth/jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Profile and JWT role authorization', () => {
  let app: INestApplication<App>;
  const tokens = new JwtTokens();
  const user = { id: 'user-id', username: 'Player', email: 'player@example.com', role: 'USER' };
  const users = { findById: jest.fn(), update: jest.fn(), findAll: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret-not-used-outside-tests';
    prisma.user.findUnique.mockResolvedValue(user);
    users.findById.mockResolvedValue(user);
    users.update.mockImplementation((_id: string, data: object) => ({ ...user, ...data }));
    users.findAll.mockResolvedValue([user]);
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: users },
        JwtTokens,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
    delete process.env.JWT_SECRET;
  });

  it('returns 401 without a token', async () => {
    await request(app.getHttpServer()).get('/user/me').expect(401);
    expect(users.findById).not.toHaveBeenCalled();
  });
  it('returns 401 for malformed and tampered tokens', async () => {
    for (const token of ['broken', tokens.issue('user-id') + 'x']) {
      await request(app.getHttpServer())
        .get('/user/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    }
  });
  it('rejects expired and wrong-algorithm tokens', async () => {
    for (const token of [
      sign({}, process.env.JWT_SECRET!, {
        subject: 'user-id',
        expiresIn: -1,
        issuer: 'chess-analyzer',
        audience: 'chess-analyzer-web',
      }),
      sign({}, process.env.JWT_SECRET!, {
        algorithm: 'HS384',
        subject: 'user-id',
        expiresIn: '1h',
      }),
    ])
      await request(app.getHttpServer())
        .get('/user/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
  });
  it('attaches the verified database user and supports the HttpOnly cookie', async () => {
    await request(app.getHttpServer())
      .get('/user/me')
      .set('Cookie', 'access_token=' + tokens.issue('user-id'))
      .expect(200)
      .expect(user);
    expect(users.findById).toHaveBeenCalledWith('user-id');
  });
  it('denies a deleted user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/user/me')
      .auth(tokens.issue('user-id'), { type: 'bearer' })
      .expect(401);
  });
  it('returns 403 for USER on the admin list, but allows ADMIN using its current database role', async () => {
    const token = tokens.issue('user-id');
    await request(app.getHttpServer()).get('/user').auth(token, { type: 'bearer' }).expect(403);
    prisma.user.findUnique.mockResolvedValue({ ...user, role: 'ADMIN' });
    await request(app.getHttpServer()).get('/user').auth(token, { type: 'bearer' }).expect(200);
  });
  it('cannot update another user through an unprotected legacy route', async () => {
    await request(app.getHttpServer())
      .patch('/user/other-id')
      .auth(tokens.issue('user-id'), { type: 'bearer' })
      .send({ username: 'Changed' })
      .expect(403);
  });
});
