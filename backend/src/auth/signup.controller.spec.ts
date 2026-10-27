import {
  BadRequestException,
  Controller,
  Get,
  INestApplication,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { SignupController } from './signup.controller';
import { JwtTokens } from './jwt-tokens.service';
import { SessionAuthGuard } from './auth.guard';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
@Controller('signup-session-test')
class SessionTestController {
  @Get() @UseGuards(SessionAuthGuard) get(@Request() req: { user: { id: string } }) {
    return { id: req.user.id };
  }
}
describe('Signup signs the new account in', () => {
  let app: INestApplication<App>;
  const users = { create: jest.fn() };
  const user = {
    id: 'new-user',
    username: 'NewPlayer',
    email: 'new@example.test',
    role: 'USER',
    isBlocked: false,
  };
  const secret = process.env.JWT_SECRET;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'signup-test-secret-only';
    const module = await Test.createTestingModule({
      controllers: [SignupController, SessionTestController],
      providers: [
        JwtTokens,
        { provide: UserService, useValue: users },
        {
          provide: PrismaService,
          useValue: { user: { findUnique: jest.fn().mockResolvedValue(user) } },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
  });
  beforeEach(() => {
    users.create.mockReset();
    users.create.mockResolvedValue(user);
  });
  it('sets an HttpOnly JWT cookie that immediately authorizes a protected route', async () => {
    const agent = request.agent(app.getHttpServer());
    const response = await agent
      .post('/auth/signup')
      .send({ username: ' NewPlayer ', email: ' new@example.test ', password: 'test-password' })
      .expect(201);
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'NewPlayer', email: 'new@example.test' }),
    );
    await agent.get('/signup-session-test').expect(200).expect({ id: user.id });
  });
  it('does not create a session for invalid or failed registration', async () => {
    for (const body of [
      { username: '   ', email: 'new@example.test', password: 'test-password' },
      { username: 'NewPlayer', email: 'bad', password: 'test-password' },
      { username: 'NewPlayer', email: 'new@example.test', password: '123' },
      {
        username: 'NewPlayer',
        email: 'new@example.test',
        password: 'test-password',
        role: 'ADMIN',
      },
    ]) {
      const response = await request(app.getHttpServer())
        .post('/auth/signup')
        .send(body)
        .expect(400);
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    expect(users.create).not.toHaveBeenCalled();
    users.create.mockRejectedValue(new BadRequestException('Username was already taken'));
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ username: 'NewPlayer', email: 'new@example.test', password: 'test-password' })
      .expect(400);
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
