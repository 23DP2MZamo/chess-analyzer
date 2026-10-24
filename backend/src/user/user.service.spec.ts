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
    passwordHash: 'old',
  };
  let stored: typeof initial;
  let prisma: { user: { findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock } };
  let service: UserService;
  beforeEach(() => {
    stored = { ...initial };
    prisma = {
      user: {
        findUnique: jest.fn().mockImplementation(() => stored),
        findFirst: jest.fn().mockResolvedValue(null),
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
});
