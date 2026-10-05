import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Platform, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ChessComClient } from './chesscom.client';
import { LichessClient } from './lichess.client';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly lichessClient: LichessClient,
    private readonly chessComClient: ChessComClient,
  ) {}

  async linkLichessAccount(userId: string, username: string) {
    const platformUsername = username?.trim();

    if (!platformUsername) {
      throw new BadRequestException('Lichess username is required');
    }

    await this.lichessClient.verifyAccount(platformUsername);

    try {
      return await this.prismaService.linkedAccount.create({
        data: {
          userId,
          platform: Platform.LICHESS,
          platformUsername,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A Lichess account is already linked');
      }

      throw error;
    }
  }

  async linkChessComAccount(userId: string, username: string) {
    const platformUsername = username?.trim();

    if (!platformUsername) {
      throw new BadRequestException('Chess.com username is required');
    }

    await this.chessComClient.verifyAccount(platformUsername);

    try {
      return await this.prismaService.linkedAccount.create({
        data: {
          userId,
          platform: Platform.CHESSCOM,
          platformUsername,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A Chess.com account is already linked');
      }

      throw error;
    }
  }
}
