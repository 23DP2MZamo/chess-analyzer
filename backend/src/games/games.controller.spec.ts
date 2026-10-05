import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SessionAuthGuard } from '../auth/auth.guard';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

describe('GamesController', () => {
  let app: INestApplication<App>;
  const gamesService = {
    importChessComGames: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: gamesService }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{ user: { id: string } }>();
          httpRequest.user = { id: 'session-user-id' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('imports games for the authenticated session user', async () => {
    gamesService.importChessComGames.mockResolvedValue({ imported: 15, skipped: 3 });

    await request(app.getHttpServer())
      .post('/games/chesscom/import')
      .expect(201)
      .expect({ imported: 15, skipped: 3 });

    expect(gamesService.importChessComGames).toHaveBeenCalledWith('session-user-id');
  });
});
