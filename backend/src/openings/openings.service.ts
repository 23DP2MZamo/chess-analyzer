import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OpeningsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.opening.findMany({
      where: search
        ? {
            OR: [
              { eco: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ eco: 'asc' }, { name: 'asc' }],
      take: 500,
      select: {
        id: true,
        eco: true,
        name: true,
      },
    });
  }
}
