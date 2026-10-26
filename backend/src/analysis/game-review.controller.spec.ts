import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { GameReviewController } from './game-review.controller';
import { GameReviewService } from './game-review.service';
import { JwtTokens } from '../auth/jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';
describe('Protected game-review endpoints', () => {
  let app: INestApplication<App>;
  const review = {
    detail: jest.fn().mockResolvedValue({ id: 'game' }),
    status: jest.fn().mockResolvedValue({ status: 'idle' }),
    start: jest.fn().mockResolvedValue({ status: 'running' }),
    cancel: jest.fn().mockResolvedValue({ status: 'cancelled' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [GameReviewController],
      providers: [
        { provide: GameReviewService, useValue: review },
        { provide: JwtTokens, useValue: { verify: () => 'owner' } },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: () => ({ id: 'owner', isBlocked: false }) } },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());
  it('requires login for detail, start, progress, cancel and samples', async () => {
    await request(app.getHttpServer()).get('/analysis/games/game').expect(401);
    await request(app.getHttpServer()).post('/analysis/games/game').expect(401);
    await request(app.getHttpServer()).get('/analysis/games/game/status').expect(401);
    await request(app.getHttpServer()).delete('/analysis/games/game').expect(401);
    await request(app.getHttpServer()).get('/analysis/samples').expect(401);
  });
  it('uses the JWT owner, not request-supplied identity', async () => {
    await request(app.getHttpServer())
      .post('/analysis/games/game')
      .set('Authorization', 'Bearer fixture')
      .send({ userId: 'other' })
      .expect(201);
    expect(review.start).toHaveBeenCalledWith('owner', 'game');
    await request(app.getHttpServer())
      .get('/analysis/games/game/status')
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(review.status).toHaveBeenCalledWith('owner', 'game');
    const response = await request(app.getHttpServer())
      .get('/analysis/samples')
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(response.body).toHaveLength(3);
  });
});
