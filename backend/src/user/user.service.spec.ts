import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';
import { compare } from 'bcrypt';

describe('Profile persistence', () => {
  const initial = {
    id: 'user-id',
    username: 'Player',
    email: 'player@example.com',
    role: 'USER',
    isBlocked: false,
    passwordHash: 'old',
  };
  let stored: typeof initial;
  let prisma: {
    user: Record<string, jest.Mock>;
    game: { count: jest.Mock };
    analysis: { count: jest.Mock };
  };
  let service: UserService;
  beforeEach(() => {
    stored = { ...initial };
    prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(() => stored),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn().mockImplementation(({ data }: { data: Partial<typeof initial> }) => {
          stored = {
            ...stored,
            ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
          };
          return {
            id: stored.id,
            username: stored.username,
            email: stored.email,
            role: stored.role,
          };
        }),
      },
      game: { count: jest.fn() },
      analysis: { count: jest.fn() },
    };
    service = new UserService(prisma as unknown as PrismaService);
  });
  it('saves updates and reads the persisted profile again', async () => {
    await service.update('user-id', { username: 'NewPlayer', email: 'NEW@example.com' });
    expect(await service.findById('user-id')).toMatchObject({
      username: 'NewPlayer',
      email: 'new@example.com',
    });
    expect(prisma.user.findUnique).toHaveBeenLastCalledWith(
      expect.objectContaining({
        select: { id: true, username: true, email: true, role: true },
      }),
    );
  });
  it('does not change a password when omitted, and hashes a supplied password', async () => {
    await service.update('user-id', { username: 'NewPlayer' });
    expect(stored.passwordHash).toBe('old');
    await service.update('user-id', { password: 'new-password' });
    expect(await compare('new-password', stored.passwordHash)).toBe(true);
  });
  it('rejects empty updates and duplicate names', async () => {
    await expect(service.update('user-id', {})).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.findFirst.mockResolvedValue({ username: 'Taken' });
    await expect(service.update('user-id', { username: 'Taken' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it('handles concurrent unique conflicts gracefully', async () => {
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '7' }),
    );
    await expect(service.update('user-id', { username: 'Taken' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('returns 404 for missing profiles', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('returns aggregate user, game, and analysis counts', async () => {
    prisma.user.count.mockResolvedValue(4);
    prisma.game.count.mockResolvedValue(20);
    prisma.analysis.count.mockResolvedValue(12);
    await expect(service.getAdminStats()).resolves.toEqual({ users: 4, games: 20, analyses: 12 });
  });
  it('blocks and unblocks accounts by string ID and reports missing users', async () => {
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    await service.setBlocked('user-id', true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: { isBlocked: true },
    });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.setBlocked('missing', true)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('deletes by string ID without returning password data', async () => {
    prisma.user.delete.mockResolvedValue({
      id: 'user-id',
      username: 'Player',
      email: 'player@example.com',
    });
    await service.remove('user-id');
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: { id: true, username: true, email: true },
    });
  });
});
