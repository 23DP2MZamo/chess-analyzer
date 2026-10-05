import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { SessionAuthGuard } from '../auth/auth.guard';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

describe('AccountsController', () => {
  let app: INestApplication<App>;
  const accountsService = {
    linkLichessAccount: jest.fn(),
    linkChessComAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: accountsService }],
    })
      .overrideGuard(SessionAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const httpRequest = context.switchToHttp().getRequest<{ user: { id: string } }>();
          httpRequest.user = { id: 'user-id' };
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

  it('POST /accounts/lichess uses the authenticated user', async () => {
    const linkedAccount = {
      id: 'linked-account-id',
      userId: 'user-id',
      platform: 'LICHESS',
      platformUsername: 'someLichessUser',
    };
    accountsService.linkLichessAccount.mockResolvedValue(linkedAccount);

    await request(app.getHttpServer())
      .post('/accounts/lichess')
      .send({ username: 'someLichessUser' })
      .expect(201)
      .expect(linkedAccount);

    expect(accountsService.linkLichessAccount).toHaveBeenCalledWith('user-id', 'someLichessUser');
  });

  it('rejects an invalid request body', async () => {
    await request(app.getHttpServer()).post('/accounts/lichess').send({ username: '' }).expect(400);

    expect(accountsService.linkLichessAccount).not.toHaveBeenCalled();
  });

  it('returns 404 when the Lichess account does not exist', async () => {
    accountsService.linkLichessAccount.mockRejectedValue(
      new NotFoundException('Lichess account was not found'),
    );

    await request(app.getHttpServer())
      .post('/accounts/lichess')
      .send({ username: 'missing-user' })
      .expect(404);
  });

  it('returns 409 when a Lichess account is already linked', async () => {
    accountsService.linkLichessAccount.mockRejectedValue(
      new ConflictException('A Lichess account is already linked'),
    );

    await request(app.getHttpServer())
      .post('/accounts/lichess')
      .send({ username: 'someLichessUser' })
      .expect(409);
  });

  it('POST /accounts/chesscom uses the authenticated user', async () => {
    const linkedAccount = {
      id: 'linked-account-id',
      userId: 'user-id',
      platform: 'CHESSCOM',
      platformUsername: 'Hikaru',
    };
    accountsService.linkChessComAccount.mockResolvedValue(linkedAccount);

    await request(app.getHttpServer())
      .post('/accounts/chesscom')
      .send({ username: 'Hikaru' })
      .expect(201)
      .expect(linkedAccount);

    expect(accountsService.linkChessComAccount).toHaveBeenCalledWith('user-id', 'Hikaru');
  });

  it('rejects an invalid Chess.com request body', async () => {
    await request(app.getHttpServer())
      .post('/accounts/chesscom')
      .send({ username: '' })
      .expect(400);

    expect(accountsService.linkChessComAccount).not.toHaveBeenCalled();
  });

  it('returns 404 when the Chess.com account does not exist', async () => {
    accountsService.linkChessComAccount.mockRejectedValue(
      new NotFoundException('Chess.com account was not found'),
    );

    await request(app.getHttpServer())
      .post('/accounts/chesscom')
      .send({ username: 'missing-user' })
      .expect(404);
  });

  it('returns 409 when a Chess.com account is already linked', async () => {
    accountsService.linkChessComAccount.mockRejectedValue(
      new ConflictException('A Chess.com account is already linked'),
    );

    await request(app.getHttpServer())
      .post('/accounts/chesscom')
      .send({ username: 'Hikaru' })
      .expect(409);
  });
});
