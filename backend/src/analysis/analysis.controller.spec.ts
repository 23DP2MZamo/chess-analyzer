import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DEFAULT_POSITION } from 'chess.js';
import { JwtTokens } from '../auth/jwt-tokens.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisController } from './analysis.controller';
import { StockfishService } from './stockfish.service';
import { GameSearchController } from '../games/game-search.controller';
import { GameSearchService } from '../games/game-search.service';

describe('Analysis and game-search HTTP boundaries', () => {
  let app: INestApplication<App>;
  const engine = { analyze: jest.fn() };
  const games = { search: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AnalysisController, GameSearchController],
      providers: [
        { provide: StockfishService, useValue: engine },
        { provide: GameSearchService, useValue: games },
        { provide: JwtTokens, useValue: { verify: jest.fn().mockReturnValue('owner-id') } },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn().mockResolvedValue({ id: 'owner-id' }) } },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  it('requires authentication on both endpoints', async () => {
    await request(app.getHttpServer())
      .post('/analysis/position')
      .send({ fen: DEFAULT_POSITION })
      .expect(401);
    await request(app.getHttpServer()).get('/games/search').expect(401);
    expect(engine.analyze).not.toHaveBeenCalled();
    expect(games.search).not.toHaveBeenCalled();
  });
  it('validates FEN fields and bounds depth before calling the engine', async () => {
    for (const body of [
      {},
      { fen: 1 },
      { fen: DEFAULT_POSITION, depth: 19 },
      { fen: DEFAULT_POSITION, depth: '3' },
      { fen: DEFAULT_POSITION, extra: true },
    ]) {
      await request(app.getHttpServer())
        .post('/analysis/position')
        .set('Authorization', 'Bearer fixture')
        .send(body)
        .expect(400);
    }
    expect(engine.analyze).not.toHaveBeenCalled();
    engine.analyze.mockResolvedValue({ bestMove: 'e2e4' });
    await request(app.getHttpServer())
      .post('/analysis/position')
      .set('Authorization', 'Bearer fixture')
      .send({ fen: DEFAULT_POSITION })
      .expect(201)
      .expect({ bestMove: 'e2e4' });
    expect(engine.analyze).toHaveBeenCalledWith(expect.objectContaining({ depth: 12 }));
  });
  it('returns engine failures without crashing', async () => {
    engine.analyze.mockRejectedValue(new ServiceUnavailableException('Stockfish unavailable'));
    await request(app.getHttpServer())
      .post('/analysis/position')
      .set('Authorization', 'Bearer fixture')
      .send({ fen: DEFAULT_POSITION })
      .expect(503);
  });
  it('validates and converts search parameters and enforces authenticated ownership', async () => {
    for (const query of [
      'format=FAST',
      'result=WHITE_WIN',
      'sortBy=passwordHash',
      'order=sideways',
      'page=0',
      'pageSize=101',
      'dateFrom=yesterday',
      'userId=other',
    ]) {
      await request(app.getHttpServer())
        .get('/games/search?' + query)
        .set('Authorization', 'Bearer fixture')
        .expect(400);
    }
    expect(games.search).not.toHaveBeenCalled();
    await request(app.getHttpServer())
      .get('/games/search?format=BLITZ&mode=CASUAL&result=WIN&page=2&groupBy=opening')
      .set('Authorization', 'Bearer fixture')
      .expect(200);
    expect(games.search).toHaveBeenCalledWith(
      'owner-id',
      expect.objectContaining({
        format: 'BLITZ',
        mode: 'CASUAL',
        result: 'WIN',
        page: 2,
        pageSize: 25,
        groupBy: 'opening',
        sortBy: 'date',
        order: 'desc',
      }),
    );
  });
});
