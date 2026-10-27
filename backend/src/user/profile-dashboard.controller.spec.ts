import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ProfileDashboardController } from './profile-dashboard.controller';
import { ProfileDashboardService } from './profile-dashboard.service';
import { JwtTokens } from '../auth/jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';
describe('Protected profile dashboard', () => {
  let app: INestApplication<App>;
  const dashboard = { get: jest.fn().mockResolvedValue({}) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileDashboardController],
      providers: [
        { provide: ProfileDashboardService, useValue: dashboard },
        { provide: JwtTokens, useValue: { verify: () => 'owner' } },
        { provide: PrismaService, useValue: { user: { findUnique: () => ({ id: 'owner' }) } } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());
  it('requires login and rejects arbitrary platform or user selectors', async () => {
    await request(app.getHttpServer()).get('/user/me/dashboard').expect(401);
    for (const query of ['platform=INVALID', 'format=INVALID', 'userId=other'])
      await request(app.getHttpServer())
        .get('/user/me/dashboard?' + query)
        .set('Authorization', 'Bearer fixture')
        .expect(400);
    await request(app.getHttpServer())
      .get('/user/me/dashboard?platform=ALL&format=RAPID')
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(dashboard.get).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({ platform: 'ALL', format: 'RAPID' }),
    );
  });
});
