import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { SignupController } from '../src/auth/signup.controller';
import { JwtTokens } from '../src/auth/jwt-tokens.service';
import { UserService } from '../src/user/user.service';
import { UserController } from '../src/user/user.controller';
import { ProfileDashboardController } from '../src/user/profile-dashboard.controller';
import { ProfileDashboardService } from '../src/user/profile-dashboard.service';
import { PrismaService } from '../src/prisma/prisma.service';
describe('Automatic signup session and persistent profile dashboard', () => {
  const schema = 'test_onboarding_' + randomUUID().replaceAll('-', '');
  const sql = new Client({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: process.env.DATABASE_URL, options: '-c search_path=' + schema },
      { schema },
    ),
  });
  let app: INestApplication<App>;
  const secret = process.env.JWT_SECRET;
  beforeAll(async () => {
    await sql.connect();
    await sql.query('CREATE SCHEMA "' + schema + '"');
    await sql.query('SET search_path TO "' + schema + '"');
    const directory = resolve(__dirname, '../prisma/migrations');
    for (const name of readdirSync(directory)
      .filter((name) => /^\d/.test(name))
      .sort())
      await sql.query(readFileSync(resolve(directory, name, 'migration.sql'), 'utf8'));
    process.env.JWT_SECRET = 'onboarding-integration-fixture-secret';
    const module = await Test.createTestingModule({
      controllers: [SignupController, UserController, ProfileDashboardController],
      providers: [
        JwtTokens,
        UserService,
        ProfileDashboardService,
        { provide: PrismaService, useValue: db },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  }, 30000);
  afterAll(async () => {
    await app?.close();
    await db.$disconnect();
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    if (!/^test_onboarding_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid test schema');
    await sql.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    await sql.end();
  });
  it('signs up, reads real player-side ratings, saves settings and rejects a blocked account', async () => {
    const agent = request.agent(app.getHttpServer());
    const signup = await agent
      .post('/auth/signup')
      .send({
        username: 'NewPlayer',
        email: 'new-player@example.test',
        password: 'fixture-password',
      })
      .expect(201);
    const owner = (signup.body as { user: { id: string } }).user.id;
    const empty = await agent.get('/user/me/dashboard').expect(200);
    expect((empty.body as { summary: { total: number } }).summary.total).toBe(0);
    expect((empty.body as { accounts: unknown[] }).accounts).toHaveLength(0);
    const other = await db.user.create({
      data: { username: 'PrivatePlayer', email: 'private@example.test', passwordHash: 'fixture' },
    });
    await db.linkedAccount.create({
      data: { userId: owner, platform: 'CHESSCOM', platformUsername: 'ExternalPlayer' },
    });
    const game = {
      platform: 'CHESSCOM' as const,
      pgn: '[Opening "Italian Game"]\n1. e4 e5 2. Nf3 Nc6 *',
      whiteUsername: 'Opponent',
      blackUsername: 'externalplayer',
      whiteElo: 2500,
      blackElo: 1430,
      result: 'BLACK_WIN' as const,
      format: 'BLITZ' as const,
      mode: 'RATED' as const,
      playedAt: new Date(),
    };
    await db.game.create({ data: { ...game, userId: owner, externalId: 'own' } });
    await db.game.create({ data: { ...game, userId: other.id, externalId: 'private' } });
    const dashboard = await agent
      .get('/user/me/dashboard?platform=CHESSCOM&format=BLITZ')
      .expect(200);
    expect((dashboard.body as { summary: unknown }).summary).toMatchObject({
      total: 1,
      wins: 1,
      losses: 0,
    });
    expect(
      (dashboard.body as { ratingSeries: { currentRating: number }[] }).ratingSeries[0]
        .currentRating,
    ).toBe(1430);
    expect((dashboard.body as { recentGames: unknown[] }).recentGames[0]).toMatchObject({
      outcome: 'WIN',
      moveCount: 2,
    });
    await agent.patch('/user/me').send({ username: 'UpdatedPlayer' }).expect(200);
    const reopened = await agent.get('/user/me/dashboard').expect(200);
    expect((reopened.body as { user: { username: string } }).user.username).toBe('UpdatedPlayer');
    await db.user.update({ where: { id: owner }, data: { isBlocked: true } });
    await agent.get('/user/me/dashboard').expect(401);
  }, 30000);
});
