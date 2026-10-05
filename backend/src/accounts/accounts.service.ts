import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Platform, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LichessClient } from './lichess.client';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly lichessClient: LichessClient,
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
}
