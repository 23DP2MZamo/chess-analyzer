import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    const username = createUserDto.username.trim();

    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
      select: { id: true, username: true, email: true },
    });
    if (existing) {
      if (existing.username === username) {
        throw new BadRequestException('Username was already taken');
      }
      throw new BadRequestException('Email was already taken');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prismaService.user.create({
      data: {
        username,
        email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });
  }
  findByUsernameOrEmail(identifier: string) {
    return this.prismaService.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }
  async findById(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
  findAll() {
    return this.prismaService.user.findMany({
      select: { id: true, username: true, email: true, role: true },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    if (Object.keys(updateUserDto).length === 0)
      throw new BadRequestException('No changes submitted');
    if (updateUserDto.password && Buffer.byteLength(updateUserDto.password, 'utf8') > 72)
      throw new BadRequestException('Password must be at most 72 bytes');
    const username = updateUserDto.username?.trim();
    const email = updateUserDto.email?.trim().toLowerCase();
    const existing = await this.prismaService.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    if (username || email) {
      const duplicate = await this.prismaService.user.findFirst({
        where: {
          id: { not: id },
          OR: [...(username ? [{ username }] : []), ...(email ? [{ email }] : [])],
        },
        select: { username: true, email: true },
      });
      if (duplicate) {
        throw new BadRequestException(
          duplicate.username === username
            ? 'Username was already taken'
            : 'Email was already taken',
        );
      }
    }

    const passwordHash = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;
    try {
      return await this.prismaService.user.update({
        where: { id },
        data: { username, email, passwordHash },
        select: { id: true, username: true, email: true, role: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Username or email is already taken');
      }
      throw error;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
