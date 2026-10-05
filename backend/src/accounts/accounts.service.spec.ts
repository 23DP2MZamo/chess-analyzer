import { BadGatewayException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Platform, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';
import { ChessComClient } from './chesscom.client';
import { LichessClient } from './lichess.client';

describe('AccountsService', () => {
  let service: AccountsService;
  let prismaService: { linkedAccount: { create: jest.Mock } };
  let lichessClient: { verifyAccount: jest.Mock };
  let chessComClient: { verifyAccount: jest.Mock };

  beforeEach(async () => {
    prismaService = {
      linkedAccount: { create: jest.fn() },
    };
    lichessClient = {
      verifyAccount: jest.fn(),
    };
    chessComClient = {
      verifyAccount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: LichessClient, useValue: lichessClient },
        { provide: ChessComClient, useValue: chessComClient },
      ],
    }).compile();

    service = module.get(AccountsService);
  });

  it('creates a Lichess linked account for the authenticated user', async () => {
    const linkedAccount = {
      id: 'linked-account-id',
      userId: 'user-id',
      platform: Platform.LICHESS,
      platformUsername: 'someLichessUser',
    };
    prismaService.linkedAccount.create.mockResolvedValue(linkedAccount);

    await expect(service.linkLichessAccount('user-id', '  someLichessUser  ')).resolves.toEqual(
      linkedAccount,
    );
    expect(lichessClient.verifyAccount).toHaveBeenCalledWith('someLichessUser');
    expect(prismaService.linkedAccount.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        platform: Platform.LICHESS,
        platformUsername: 'someLichessUser',
      },
    });
  });

  it('does not create a record when the Lichess account does not exist', async () => {
    lichessClient.verifyAccount.mockRejectedValue(
      new NotFoundException('Lichess account was not found'),
    );

    await expect(service.linkLichessAccount('user-id', 'missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaService.linkedAccount.create).not.toHaveBeenCalled();
  });

  it('does not create a record when Lichess cannot be reached', async () => {
    lichessClient.verifyAccount.mockRejectedValue(
      new BadGatewayException('Unable to verify the Lichess account'),
    );

    await expect(service.linkLichessAccount('user-id', 'someLichessUser')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prismaService.linkedAccount.create).not.toHaveBeenCalled();
  });

  it('converts the unique constraint violation to a conflict response', async () => {
    prismaService.linkedAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.linkLichessAccount('user-id', 'someLichessUser')).rejects.toEqual(
      new ConflictException('A Lichess account is already linked'),
    );
  });

  it('creates a Chess.com linked account with a trimmed username', async () => {
    const linkedAccount = {
      id: 'linked-account-id',
      userId: 'user-id',
      platform: Platform.CHESSCOM,
      platformUsername: 'Hikaru',
    };
    prismaService.linkedAccount.create.mockResolvedValue(linkedAccount);

    await expect(service.linkChessComAccount('user-id', '  Hikaru  ')).resolves.toEqual(
      linkedAccount,
    );
    expect(chessComClient.verifyAccount).toHaveBeenCalledWith('Hikaru');
    expect(prismaService.linkedAccount.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-id',
        platform: Platform.CHESSCOM,
        platformUsername: 'Hikaru',
      },
    });
  });

  it('does not create a record when Chess.com verification fails', async () => {
    chessComClient.verifyAccount.mockRejectedValue(
      new NotFoundException('Chess.com account was not found'),
    );

    await expect(service.linkChessComAccount('user-id', 'missing-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prismaService.linkedAccount.create).not.toHaveBeenCalled();
  });

  it('converts a Chess.com unique constraint violation to a conflict response', async () => {
    prismaService.linkedAccount.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );

    await expect(service.linkChessComAccount('user-id', 'Hikaru')).rejects.toEqual(
      new ConflictException('A Chess.com account is already linked'),
    );
  });
});
